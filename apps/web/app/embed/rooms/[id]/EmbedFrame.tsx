"use client";

import type { Room } from "@sru/shared";
import { createE2eeWarning } from "@sru/embed";
import { useEffect, useState } from "react";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import {
  acceptEmbedConnect,
  type EmbedConnectPayload,
} from "@/lib/embed-origin";
import "@/app/meeting.css";

const EMBED_READY_TYPE = "sru-embed.ready";

export function EmbedFrame({
  room,
  allowedOrigins,
}: {
  room: Room;
  allowedOrigins: string[];
}) {
  const [connect, setConnect] = useState<EmbedConnectPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configurationError =
    allowedOrigins.length === 0
      ? "Embed is not configured. Set EMBED_ALLOWED_ORIGINS to the parent page origin."
      : null;

  useEffect(() => {
    if (configurationError) {
      return;
    }

    const onMessage = (event: MessageEvent) => {
      const result = acceptEmbedConnect({
        origin: event.origin,
        allowlist: allowedOrigins,
        roomId: room.id,
        data: event.data,
      });
      if (!result.ok) {
        return;
      }
      setConnect(result.payload);
      setError(null);
    };

    window.addEventListener("message", onMessage);
    for (const origin of allowedOrigins) {
      window.parent.postMessage(
        { type: EMBED_READY_TYPE, roomId: room.id },
        origin,
      );
      if (room.e2eeEnabled) {
        window.parent.postMessage(createE2eeWarning(room.id), origin);
      }
    }

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [allowedOrigins, configurationError, room.e2eeEnabled, room.id]);

  if (configurationError ?? error) {
    return (
      <MeetingErrorState
        title="Embed blocked"
        message={configurationError ?? error ?? ""}
      />
    );
  }

  if (!connect) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-page text-body text-muted">
        {room.e2eeEnabled ? (
          <p
            role="alert"
            className="max-w-lg rounded-md border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100"
          >
            {createE2eeWarning(room.id).message}
          </p>
        ) : null}
        <p>Waiting for the parent page to send a minted join token…</p>
      </div>
    );
  }

  return (
    <MeetingRoom
      room={room}
      userId={connect.identity ?? `embed-${room.id}`}
      role={connect.role ?? "participant"}
      token={connect.token}
      url={connect.url}
      audio={connect.audio ?? true}
      video={connect.video ?? true}
    />
  );
}
