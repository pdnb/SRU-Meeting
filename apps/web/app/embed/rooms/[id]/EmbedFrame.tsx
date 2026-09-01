"use client";

import type { Room } from "@sru/shared";
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

  useEffect(() => {
    if (allowedOrigins.length === 0) {
      setError(
        "Embed is not configured. Set EMBED_ALLOWED_ORIGINS to the parent page origin.",
      );
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
    }

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [allowedOrigins, room.id]);

  if (error) {
    return <MeetingErrorState title="Embed blocked" message={error} />;
  }

  if (!connect) {
    return (
      <div className="flex h-dvh items-center justify-center px-page text-body text-muted">
        Waiting for the parent page to send a minted join token…
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
