"use client";

import type { BreakoutPacket, BreakoutSession } from "@sru/shared";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BREAKOUT_DATA_TOPIC,
  BREAKOUT_POLL_MS,
  DEFAULT_BREAKOUT_COUNT,
  MAX_BREAKOUT_COUNT,
  MAX_BREAKOUT_MINUTES,
  MIN_BREAKOUT_COUNT,
  MIN_BREAKOUT_MINUTES,
  assignedChildRoomId,
  breakoutChildIsFull,
  breakoutTimerLabel,
  childAssignmentCount,
  childRoomLabel,
  parseApiErrorMessage,
  parseBreakoutGet,
  parseBreakoutPacket,
  parseDurationMinutes,
} from "@/lib/breakout-ui";

export function useOpenBreakout(roomId: string) {
  const [session, setSession] = useState<BreakoutSession | null>(null);
  const [childRoom, setChildRoom] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const apply = useCallback((status: number, json: unknown) => {
    const parsed = parseBreakoutGet(status, json);
    if (parsed.kind === "ok") {
      setSession(parsed.session);
      setChildRoom(false);
      setLoadError(null);
      return parsed;
    }
    if (parsed.kind === "child") {
      setSession(null);
      setChildRoom(true);
      setLoadError(null);
      return parsed;
    }
    setLoadError(parsed.message);
    return parsed;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/rooms/${roomId}/breakouts`);
      const json: unknown = await res.json().catch(() => null);
      apply(res.status, json);
    } catch {
      setLoadError("Could not load breakouts");
    }
  }, [apply, roomId]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/rooms/${roomId}/breakouts`);
        const json: unknown = await res.json().catch(() => null);
        if (cancelled) {
          return;
        }
        const parsed = apply(res.status, json);
        if (parsed.kind === "child" && timer !== undefined) {
          window.clearInterval(timer);
          timer = undefined;
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load breakouts");
        }
      }
    };
    void poll();
    timer = window.setInterval(() => {
      void poll();
    }, BREAKOUT_POLL_MS);
    return () => {
      cancelled = true;
      if (timer !== undefined) {
        window.clearInterval(timer);
      }
    };
  }, [apply, roomId]);

  return { session, childRoom, loadError, refresh };
}

function useBreakoutTimer(endsAt: string | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!endsAt) {
      return;
    }
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return breakoutTimerLabel(endsAt, now);
}

function useBreakoutPackets() {
  const room = useRoomContext();
  const [help, setHelp] = useState<
    Extract<BreakoutPacket, { type: "breakout.help" }>[]
  >([]);
  const [broadcast, setBroadcast] = useState<string | null>(null);
  const [recall, setRecall] = useState<Extract<
    BreakoutPacket,
    { type: "breakout.recall" }
  > | null>(null);

  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      _participant: unknown,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic && topic !== BREAKOUT_DATA_TOPIC) {
        return;
      }
      try {
        const packet = parseBreakoutPacket(
          JSON.parse(new TextDecoder().decode(payload)) as unknown,
        );
        if (!packet) {
          return;
        }
        if (packet.type === "breakout.help") {
          setHelp((current) => [...current, packet]);
        }
        if (packet.type === "breakout.broadcast") {
          setBroadcast(packet.body);
        }
        if (packet.type === "breakout.recall") {
          setRecall(packet);
        }
      } catch {
        // ignore malformed packets
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  return { help, broadcast, recall };
}

export function BreakoutPanel({
  roomId,
  session,
  loadError,
  onChanged,
  onMove,
}: {
  roomId: string;
  session: BreakoutSession | null;
  loadError: string | null;
  onChanged: () => Promise<void>;
  onMove: (destinationRoomId: string) => Promise<void>;
}) {
  const packets = useBreakoutPackets();
  const timer = useBreakoutTimer(session?.endsAt ?? null);
  const [count, setCount] = useState(String(DEFAULT_BREAKOUT_COUNT));
  const [minutes, setMinutes] = useState("");
  const [mode, setMode] = useState<"auto" | "self_pick">("auto");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function patchAction(body: Record<string, unknown>, fallback: string) {
    setPending(true);
    setStatus(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/breakouts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      setStatus(parseApiErrorMessage(json, fallback));
      return false;
    }
    return true;
  }

  async function openBreakouts() {
    const parsedCount = Number.parseInt(count, 10);
    if (
      !Number.isInteger(parsedCount) ||
      parsedCount < MIN_BREAKOUT_COUNT ||
      parsedCount > MAX_BREAKOUT_COUNT
    ) {
      setStatus(
        `Enter a number from ${MIN_BREAKOUT_COUNT} to ${MAX_BREAKOUT_COUNT}.`,
      );
      return;
    }
    const duration = parseDurationMinutes(minutes);
    if (!duration.ok) {
      setStatus(
        `Timer must be blank or ${MIN_BREAKOUT_MINUTES}–${MAX_BREAKOUT_MINUTES} minutes.`,
      );
      return;
    }
    setPending(true);
    setStatus(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/breakouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        count: parsedCount,
        durationSeconds: duration.durationSeconds,
      }),
    });
    const json: unknown = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      setStatus(parseApiErrorMessage(json, "Could not open breakouts."));
      return;
    }
    setStatus(null);
    await onChanged();
  }

  async function closeBreakouts() {
    setPending(true);
    setStatus(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/breakouts`, {
      method: "DELETE",
    });
    const json: unknown = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      setStatus(parseApiErrorMessage(json, "Could not close breakouts."));
      return;
    }
    setStatus("Breakouts closed.");
    await onChanged();
  }

  async function broadcast() {
    const ok = await patchAction(
      { action: "broadcast", body: broadcastBody },
      "Could not broadcast.",
    );
    if (ok) {
      setBroadcastBody("");
      setStatus("Message sent to every breakout room.");
    }
  }

  async function recall() {
    const ok = await patchAction(
      { action: "recall" },
      "Could not recall everyone.",
    );
    if (ok) {
      setStatus("Everyone was recalled to this room.");
      await onChanged();
    }
  }

  async function roam(childId: string) {
    setPending(true);
    setStatus(null);
    try {
      await onMove(childId);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Could not join that room.",
      );
      setPending(false);
    }
  }

  const open = session?.status === "open";
  const assigned = session?.assignments?.length ?? 0;

  return (
    <aside className="sru-meet-panel" aria-label="Breakout rooms" aria-busy={pending}>
      <h2>Breakout rooms</h2>
      <div className="flex flex-col gap-3 overflow-y-auto p-3">
        {loadError ? <p role="status">{loadError}</p> : null}
        {open && session ? (
          <>
            <p>
              {session.assignmentMode === "self_pick"
                ? "People pick a room. Join any room to listen in."
                : "Participants join their assigned rooms. You can still join any room."}
            </p>
            {timer ? (
              <p role="timer" aria-live="polite">
                {timer}
              </p>
            ) : null}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {(session.childRoomIds ?? []).map((childId, index) => {
                const seated = childAssignmentCount(session, childId);
                return (
                  <li key={childId} className="flex flex-wrap items-center gap-2">
                    <span>
                      Room {index + 1}
                      {seated > 0 ? ` · ${seated} in room` : ""}
                    </span>
                    <button
                      type="button"
                      className="sru-meet-btn"
                      disabled={pending}
                      onClick={() => void roam(childId)}
                    >
                      Join Room {index + 1}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p>
              {assigned === 0
                ? "No one assigned yet."
                : `${assigned} ${assigned === 1 ? "person" : "people"} assigned.`}
            </p>
            {packets.help.length > 0 ? (
              <div>
                <h3 className="m-0 text-base font-semibold">Help requests</h3>
                <ul className="mt-2 list-disc pl-5">
                  {packets.help.map((item, index) => (
                    <li key={`${item.userId}-${index}`}>
                      {childRoomLabel(session, item.childRoomId)} needs help
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No help requests yet.</p>
            )}
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void broadcast();
              }}
            >
              <label htmlFor="breakout-broadcast" className="sru-label">
                Message to every room
              </label>
              <textarea
                id="breakout-broadcast"
                className="sru-input"
                rows={3}
                maxLength={500}
                value={broadcastBody}
                onChange={(event) => setBroadcastBody(event.target.value)}
                required
              />
              <button type="submit" className="sru-cta" disabled={pending}>
                Broadcast
              </button>
            </form>
            <button
              type="button"
              className="sru-cta"
              disabled={pending}
              onClick={() => void recall()}
            >
              Recall everyone
            </button>
            <button
              type="button"
              className="sru-cta-danger"
              disabled={pending}
              onClick={() => void closeBreakouts()}
            >
              Close without recalling
            </button>
          </>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void openBreakouts();
            }}
          >
            <p>
              {mode === "self_pick"
                ? "People choose a room. You can join any room to listen in."
                : "Split admitted participants evenly. You can still join any room."}
            </p>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="sru-label">Assignment</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="breakout-mode"
                  checked={mode === "auto"}
                  onChange={() => setMode("auto")}
                />
                Auto-assign
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="breakout-mode"
                  checked={mode === "self_pick"}
                  onChange={() => setMode("self_pick")}
                />
                Let people choose
              </label>
            </fieldset>
            <div className="flex flex-col gap-1">
              <label htmlFor="breakout-count" className="sru-label">
                Number of rooms
              </label>
              <input
                id="breakout-count"
                className="sru-input"
                type="number"
                inputMode="numeric"
                min={MIN_BREAKOUT_COUNT}
                max={MAX_BREAKOUT_COUNT}
                step={1}
                value={count}
                onChange={(event) => setCount(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="breakout-minutes" className="sru-label">
                Timer (minutes, optional)
              </label>
              <input
                id="breakout-minutes"
                className="sru-input"
                type="number"
                inputMode="numeric"
                min={MIN_BREAKOUT_MINUTES}
                max={MAX_BREAKOUT_MINUTES}
                step={1}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </div>
            <button type="submit" className="sru-cta" disabled={pending}>
              {pending ? "Opening…" : "Open breakouts"}
            </button>
          </form>
        )}
        {status ? <p role="status">{status}</p> : null}
      </div>
    </aside>
  );
}

export function BreakoutHelpNotice({
  session,
}: {
  session: BreakoutSession | null;
}) {
  const { help } = useBreakoutPackets();
  const latest = help[help.length - 1];
  if (!latest) {
    return null;
  }
  return (
    <div role="status" className="sru-breakout-banner">
      {childRoomLabel(session, latest.childRoomId)} needs help
    </div>
  );
}

export function BreakoutJoinBanner({
  session,
  userId,
  maxParticipants,
  onMove,
}: {
  session: BreakoutSession | null;
  userId: string;
  maxParticipants: number;
  onMove: (destinationRoomId: string) => Promise<void>;
}) {
  const timer = useBreakoutTimer(session?.endsAt ?? null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const assignedId = assignedChildRoomId(session, userId);

  if (!session || session.status !== "open") {
    return null;
  }
  const openSession = session;

  const selfPick = openSession.assignmentMode === "self_pick";
  if (!selfPick && !assignedId) {
    return null;
  }

  async function joinChild(childId: string, claim: boolean) {
    setPendingId(childId);
    setStatus(null);
    try {
      if (claim) {
        const res = await fetch(`/api/v1/rooms/${openSession.parentRoomId}/breakouts`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "claim", childRoomId: childId }),
        });
        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          setStatus(parseApiErrorMessage(json, "Could not join that room."));
          setPendingId(null);
          return;
        }
      }
      await onMove(childId);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Could not join that room.",
      );
      setPendingId(null);
    }
  }

  if (selfPick) {
    return (
      <div role="status" className="sru-breakout-banner">
        <p>Choose a breakout room.</p>
        {timer ? <p>{timer}</p> : null}
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {(openSession.childRoomIds ?? []).map((childId, index) => {
            const seated = childAssignmentCount(openSession, childId);
            const full = breakoutChildIsFull(
              openSession,
              childId,
              maxParticipants,
            );
            const mine = assignedId === childId;
            return (
              <li key={childId}>
                <button
                  type="button"
                  className="sru-cta"
                  disabled={Boolean(pendingId) || (full && !mine)}
                  onClick={() => void joinChild(childId, true)}
                >
                  {pendingId === childId
                    ? "Joining…"
                    : `Join Room ${index + 1}${mine ? " (yours)" : ""} (${seated}/${maxParticipants})`}
                </button>
              </li>
            );
          })}
        </ul>
        {status ? <p>{status}</p> : null}
      </div>
    );
  }

  const label = childRoomLabel(openSession, assignedId!);
  return (
    <div role="status" className="sru-breakout-banner">
      <p>You were assigned to {label}.</p>
      {timer ? <p>{timer}</p> : null}
      <button
        type="button"
        className="sru-cta"
        disabled={Boolean(pendingId)}
        onClick={() => void joinChild(assignedId!, false)}
      >
        {pendingId ? "Joining…" : `Join ${label}`}
      </button>
      {status ? <p>{status}</p> : null}
    </div>
  );
}

export function BreakoutChildBar({
  roomId,
  parentRoomId,
  session,
  onMove,
}: {
  roomId: string;
  parentRoomId: string;
  session: BreakoutSession | null;
  onMove: (destinationRoomId: string) => Promise<void>;
}) {
  const packets = useBreakoutPackets();
  const timer = useBreakoutTimer(session?.endsAt ?? null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const recalled = useRef(false);

  useEffect(() => {
    if (!packets.recall || recalled.current) {
      return;
    }
    recalled.current = true;
    void onMove(packets.recall.parentRoomId).catch((err: unknown) => {
      recalled.current = false;
      setStatus(
        err instanceof Error ? err.message : "Could not return to the main room.",
      );
    });
  }, [onMove, packets.recall]);

  async function requestHelp() {
    setPending(true);
    setStatus(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/breakouts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "help" }),
    });
    const json: unknown = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      setStatus(parseApiErrorMessage(json, "Could not ask for help."));
      return;
    }
    setStatus("The host was notified.");
  }

  async function backToParent() {
    setPending(true);
    setStatus(null);
    try {
      await onMove(parentRoomId);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Could not return to the main room.",
      );
      setPending(false);
    }
  }

  return (
    <div className="sru-breakout-banner">
      {session?.status === "open" ? (
        <>
          {timer ? (
            <p role="timer" aria-live="polite">
              {timer}
            </p>
          ) : null}
          {packets.broadcast ? (
            <p role="status">Host: {packets.broadcast}</p>
          ) : null}
          <button
            type="button"
            className="sru-meet-btn"
            disabled={pending}
            onClick={() => void requestHelp()}
          >
            {pending ? "Sending…" : "Ask host for help"}
          </button>
        </>
      ) : (
        <p role="status">Breakouts are closed.</p>
      )}
      {status ? <p role="status">{status}</p> : null}
      <button
        type="button"
        className="sru-cta"
        disabled={pending}
        onClick={() => void backToParent()}
      >
        Back to main room
      </button>
    </div>
  );
}
