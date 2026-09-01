"use client";

import type { WhiteboardPacket, WhiteboardSession } from "@sru/shared";
import {
  WHITEBOARD_DATA_TOPIC,
  WhiteboardPacketSchema,
} from "@sru/shared";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Tldraw,
  createTLStore,
  defaultShapeUtils,
  type TLStore,
} from "tldraw";
import "tldraw/tldraw.css";

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

async function exportStorePng(): Promise<string | undefined> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return undefined;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) {
      return undefined;
    }
    const buffer = await blob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  } catch {
    return undefined;
  }
}

export function WhiteboardPanel({
  roomId,
  userId,
  host,
}: {
  roomId: string;
  userId: string;
  host: boolean;
}) {
  const room = useRoomContext();
  const store = useMemo(
    () =>
      createTLStore({
        shapeUtils: defaultShapeUtils,
      }),
    [],
  );
  const [session, setSession] = useState<WhiteboardSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const applyingRemote = useRef(false);
  const syncTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/v1/rooms/${roomId}/whiteboard`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: WhiteboardSession | null } | null) => {
        if (cancelled) return;
        setSession(json?.data ?? null);
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
      if (topic && topic !== WHITEBOARD_DATA_TOPIC) {
        return;
      }
      try {
        const parsed = WhiteboardPacketSchema.safeParse(
          JSON.parse(new TextDecoder().decode(payload)),
        );
        if (!parsed.success) {
          return;
        }
        const packet = parsed.data as WhiteboardPacket;
        if (packet.type === "whiteboard.opened") {
          setSession(packet.session);
        } else if (packet.type === "whiteboard.closed") {
          setSession(null);
        } else if (
          packet.type === "whiteboard.sync" &&
          packet.senderId !== userId
        ) {
          applyingRemote.current = true;
          store.loadStoreSnapshot({
            store: packet.records as Parameters<TLStore["loadStoreSnapshot"]>[0]["store"],
            schema: store.schema.serialize(),
          });
          applyingRemote.current = false;
        }
      } catch {
        // ignore malformed packets
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, store, userId]);

  useEffect(() => {
    if (!session || session.status !== "open") {
      return;
    }
    const unsubscribe = store.listen(() => {
      if (applyingRemote.current) {
        return;
      }
      if (syncTimer.current !== null) {
        window.clearTimeout(syncTimer.current);
      }
      syncTimer.current = window.setTimeout(() => {
        const snapshot = store.getStoreSnapshot();
        const packet: WhiteboardPacket = {
          type: "whiteboard.sync",
          sessionId: session.id,
          records: snapshot.store,
          senderId: userId,
        };
        void room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(packet)),
          { reliable: true, topic: WHITEBOARD_DATA_TOPIC },
        );
      }, 250);
    });
    return () => {
      unsubscribe();
      if (syncTimer.current !== null) {
        window.clearTimeout(syncTimer.current);
      }
    };
  }, [room, session, store, userId]);

  async function openWhiteboard() {
    setError(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/whiteboard`, {
      method: "POST",
    });
    const json: unknown = await res.json();
    if (!res.ok) {
      setError(parseApiError(json, "Could not open whiteboard"));
      return;
    }
    setSession(json as WhiteboardSession);
  }

  async function closeWhiteboard() {
    setError(null);
    const snapshotPngBase64 = await exportStorePng();
    const res = await fetch(`/api/v1/rooms/${roomId}/whiteboard`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        snapshotPngBase64 ? { snapshotPngBase64 } : undefined,
      ),
    });
    if (!res.ok) {
      const json: unknown = await res.json();
      setError(parseApiError(json, "Could not close whiteboard"));
      return;
    }
    setSession(null);
  }

  return (
    <aside className="sru-meet-panel sru-meet-panel-wide" aria-label="Whiteboard">
      <h2>Whiteboard</h2>
      {loading ? <p className="px-3 py-2 text-sm">Loading whiteboard…</p> : null}
      {error ? (
        <p role="alert" className="px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {host && !session ? (
        <div className="px-3 py-2">
          <button type="button" className="sru-cta" onClick={() => void openWhiteboard()}>
            Open whiteboard
          </button>
        </div>
      ) : null}
      {session?.status === "open" ? (
        <>
          <div className="h-[420px] border-t border-gray-200">
            <Tldraw store={store} />
          </div>
          {host ? (
            <div className="px-3 py-2">
              <button
                type="button"
                className="sru-cta-danger"
                onClick={() => void closeWhiteboard()}
              >
                Close whiteboard
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {!session && !host && !loading ? (
        <p className="px-3 py-2 text-sm text-gray-600">
          The host has not opened the whiteboard yet.
        </p>
      ) : null}
    </aside>
  );
}
