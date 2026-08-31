"use client";

import { LiveKitRoom } from "@livekit/components-react";
import type { Room } from "@sru/shared";
import { MeetingChrome } from "@/components/meeting/MeetingChrome";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";
import { useState } from "react";

export function MeetingRoom({
  room,
  userId,
  role,
  token,
  url,
  audio,
  video,
}: {
  room: Room;
  userId: string;
  role: "host" | "cohost" | "participant";
  token: string;
  url: string;
  audio: boolean;
  video: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <MeetingErrorState
        title="Could not stay connected"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio={audio}
      video={video}
      onError={(err) => setError(err.message)}
      className="h-full"
    >
      <MeetingChrome room={room} userId={userId} role={role} />
    </LiveKitRoom>
  );
}
