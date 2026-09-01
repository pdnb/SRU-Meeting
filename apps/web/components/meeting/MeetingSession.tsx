"use client";

import type { Room, TokenResponse } from "@sru/shared";
import { useCallback, useEffect, useState } from "react";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";
import { MeetingRoom } from "@/components/meeting/MeetingRoom";
import { Prejoin, type PrejoinResult } from "@/components/meeting/Prejoin";
import { WaitingRoom } from "@/components/meeting/WaitingRoom";
import { clearSessionCustomBackground } from "@/components/meeting/useVirtualBackgroundPreference";
import { peekBreakoutMove, takeBreakoutMove } from "@/lib/breakout-move";
import "@/app/meeting.css";

type Phase = "prejoin" | "waiting" | "in-room" | "denied" | "error";

export function MeetingSession({
  room,
  userId,
  roleHint,
  guest,
  defaultName,
}: {
  room: Room;
  userId?: string;
  roleHint?: "host" | "cohost" | "participant";
  guest?: boolean;
  defaultName?: string;
}) {
  const [move] = useState(() => peekBreakoutMove(room.id));
  const [phase, setPhase] = useState<Phase>(
    room.finishedAt ? "error" : move ? "in-room" : "prejoin",
  );
  const [token, setToken] = useState<TokenResponse | null>(
    move ? { token: move.token, url: move.url } : null,
  );
  const [devices, setDevices] = useState<PrejoinResult>({
    audio: move?.audio ?? true,
    video: move?.video ?? true,
  });
  const error = room.finishedAt ? "This meeting has ended." : "";
  const [lastJoin, setLastJoin] = useState<PrejoinResult | null>(null);

  useEffect(() => {
    if (move) {
      takeBreakoutMove(room.id);
    }
  }, [move, room.id]);

  useEffect(() => {
    return () => {
      clearSessionCustomBackground();
    };
  }, []);

  const requestToken = useCallback(
    async (result: PrejoinResult) => {
      const res = await fetch(`/api/v1/rooms/${room.id}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: room.id,
          identity: userId ?? `guest-${crypto.randomUUID()}`,
          name: result.name ?? defaultName,
          password: result.password,
        }),
      });
      const json: unknown = await res.json();
      if (res.ok) {
        setToken(json as TokenResponse);
        setDevices(result);
        setPhase("in-room");
        return;
      }
      const code =
        typeof json === "object" &&
        json !== null &&
        "error" in json &&
        typeof (json as { error?: { code?: unknown } }).error?.code === "string"
          ? (json as { error: { code: string; message?: string } }).error.code
          : "";
      const message =
        typeof json === "object" &&
        json !== null &&
        "error" in json &&
        typeof (json as { error?: { message?: unknown } }).error?.message ===
          "string"
          ? (json as { error: { message: string } }).error.message
          : "Could not join";
      if (code === "LOBBY_PENDING") {
        setLastJoin(result);
        setPhase("waiting");
        return;
      }
      if (code === "LOBBY_DENIED") {
        setPhase("denied");
        return;
      }
      throw new Error(message);
    },
    [defaultName, room.id, userId],
  );

  if (phase === "error") {
    return <MeetingErrorState title="Cannot join" message={error} />;
  }
  if (phase === "denied") {
    return (
      <MeetingErrorState
        title="Not admitted"
        message="The host denied this request. You can send a new knock from the join page."
      />
    );
  }
  if (phase === "waiting") {
    return (
      <WaitingRoom
        roomId={room.id}
        roomName={room.name}
        onAdmitted={() => {
          if (lastJoin) {
            void requestToken(lastJoin);
          }
        }}
        onDenied={() => setPhase("denied")}
      />
    );
  }
  if (phase === "in-room" && token) {
    return (
      <MeetingRoom
        room={room}
        userId={userId ?? "guest"}
        role={roleHint ?? (room.ownerId === userId ? "host" : "participant")}
        token={token.token}
        url={token.url}
        audio={devices.audio}
        video={devices.video}
      />
    );
  }

  return (
    <Prejoin
      room={room}
      defaultName={defaultName}
      guest={guest}
      onJoin={requestToken}
    />
  );
}
