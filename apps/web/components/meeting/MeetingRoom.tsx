"use client";

import { LiveKitRoom } from "@livekit/components-react";
import type { Room } from "@sru/shared";
import { MeetingChrome } from "@/components/meeting/MeetingChrome";
import {
  connectOptionsForLiveKitUrl,
  readBrowserNetworkHints,
  roomOptionsForNetwork,
} from "@/lib/livekit/connect-options";

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
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio={audio}
      video={video}
      connectOptions={connectOptionsForLiveKitUrl(url)}
      options={roomOptionsForNetwork(readBrowserNetworkHints())}
      className="h-full"
    >
      <MeetingChrome room={room} userId={userId} role={role} />
    </LiveKitRoom>
  );
}
