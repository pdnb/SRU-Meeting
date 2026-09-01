"use client";

import type { Poll } from "@sru/shared";
import { POLL_DATA_TOPIC, PollPacketSchema } from "@sru/shared";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";

function parseApiError(json: unknown, fallback: string): string {
  if (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error?: { message?: unknown } }).error?.message ===
      "string"
  ) {
    return (json as { error: { message: string } }).error.message;
  }
  return fallback;
}

function applyVoteCounts(poll: Poll, voteCounts: Record<string, number>): Poll {
  return {
    ...poll,
    options: poll.options.map((option) => ({
      ...option,
      voteCount: voteCounts[option.id] ?? option.voteCount,
    })),
  };
}

export function PollPanel({
  roomId,
  userId,
  moderator,
}: {
  roomId: string;
  userId: string;
  moderator: boolean;
}) {
  const room = useRoomContext();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/v1/rooms/${roomId}/polls`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Poll | null } | null) => {
        if (cancelled) return;
        setPoll(json?.data ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      _p: unknown,
      _k: unknown,
      topic?: string,
    ) => {
      if (topic && topic !== POLL_DATA_TOPIC) {
        return;
      }
      try {
        const parsed = PollPacketSchema.safeParse(
          JSON.parse(new TextDecoder().decode(payload)),
        );
        if (!parsed.success) {
          return;
        }
        const packet = parsed.data;
        if (packet.type === "poll.created") {
          setPoll(packet.poll);
        } else if (packet.type === "poll.voted") {
          setPoll((current) =>
            current && current.id === packet.pollId
              ? applyVoteCounts(
                  {
                    ...current,
                    myVoteOptionId:
                      packet.userId === userId
                        ? packet.optionId
                        : current.myVoteOptionId,
                  },
                  packet.voteCounts,
                )
              : current,
          );
        } else if (packet.type === "poll.closed") {
          setPoll(packet.poll.status === "open" ? packet.poll : null);
          if (packet.poll.status === "closed") {
            setPoll(null);
          }
        }
      } catch {
        // ignore malformed packets
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, userId]);

  async function createPoll() {
    setError(null);
    const trimmedOptions = options.map((value) => value.trim()).filter(Boolean);
    const res = await fetch(`/api/v1/rooms/${roomId}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.trim(), options: trimmedOptions }),
    });
    const json: unknown = await res.json();
    if (!res.ok) {
      setError(parseApiError(json, "Could not create poll"));
      return;
    }
    const created = json as Poll;
    setPoll(created);
    setQuestion("");
    setOptions(["", ""]);
  }

  async function vote(optionId: string) {
    setError(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    const json: unknown = await res.json();
    if (!res.ok) {
      setError(parseApiError(json, "Could not submit vote"));
      return;
    }
    setPoll(json as Poll);
  }

  async function closePoll() {
    setError(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/polls`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json: unknown = await res.json();
      setError(parseApiError(json, "Could not close poll"));
      return;
    }
    setPoll(null);
  }

  const totalVotes = poll?.options.reduce((sum, option) => sum + option.voteCount, 0) ?? 0;

  return (
    <aside className="sru-meet-panel" aria-label="Polls">
      <h2>Poll</h2>
      {loading ? <p className="px-3 py-2 text-sm">Loading poll…</p> : null}
      {error ? (
        <p role="alert" className="px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {!poll && moderator ? (
        <div className="space-y-3 px-3 py-2">
          <label className="block text-sm">
            Question
            <input
              className="sru-input mt-1 w-full"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={500}
            />
          </label>
          {options.map((value, index) => (
            <label key={index} className="block text-sm">
              Option {index + 1}
              <input
                className="sru-input mt-1 w-full"
                value={value}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item,
                    ),
                  )
                }
                maxLength={200}
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="sru-meet-btn"
              disabled={options.length >= 10}
              onClick={() => setOptions((current) => [...current, ""])}
            >
              Add option
            </button>
            <button
              type="button"
              className="sru-cta"
              onClick={() => void createPoll()}
            >
              Start poll
            </button>
          </div>
        </div>
      ) : null}
      {poll ? (
        <div className="space-y-3 px-3 py-2">
          <p className="font-medium">{poll.question}</p>
          <ul className="space-y-2">
            {poll.options.map((option) => {
              const pct =
                totalVotes > 0
                  ? Math.round((option.voteCount / totalVotes) * 100)
                  : 0;
              const selected = poll.myVoteOptionId === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    className={`sru-input w-full text-left ${selected ? "ring-2 ring-blue-500" : ""}`}
                    disabled={poll.status !== "open"}
                    onClick={() => void vote(option.id)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{option.label}</span>
                      <span className="text-sm text-gray-600">
                        {option.voteCount} ({pct}%)
                      </span>
                    </span>
                    <span
                      className="mt-1 block h-1 rounded bg-blue-200"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          {moderator && poll.status === "open" ? (
            <button type="button" className="sru-cta-danger" onClick={() => void closePoll()}>
              Close poll
            </button>
          ) : null}
        </div>
      ) : null}
      {!poll && !moderator && !loading ? (
        <p className="px-3 py-2 text-sm text-gray-600">No poll is open right now.</p>
      ) : null}
    </aside>
  );
}
