"use client";

import { LiveKitRoom } from "@livekit/components-react";
import type { Room } from "@sru/shared";
import { useMemo } from "react";
import { MeetingChrome } from "@/components/meeting/MeetingChrome";
import { E2eeController } from "@/components/meeting/E2eeController";
import { ParticipantKeyProvider } from "@/lib/e2ee/keys";
import { buildE2eeRoomOptions } from "@/lib/e2ee/support";
import { mergeE2eeRoomOptions } from "@/lib/e2ee/video";
import {
  connectOptionsForLiveKitUrl,
  readBrowserNetworkHints,
  roomOptionsForNetwork,
} from "@/lib/livekit/connect-options";
import { meetingInter } from "@/lib/meeting-font";

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
  const e2eeEnabled = Boolean(room.e2eeEnabled);
  const keyProvider = useMemo(
    () => (e2eeEnabled ? new ParticipantKeyProvider() : null),
    [e2eeEnabled],
  );
  const options = useMemo(() => {
    const base = roomOptionsForNetwork(readBrowserNetworkHints());
    if (!e2eeEnabled || !keyProvider) {
      return base;
    }
    const e2eeOptions = buildE2eeRoomOptions(keyProvider);
    if (!e2eeOptions) {
      return base;
    }
    return mergeE2eeRoomOptions(base, e2eeOptions);
  }, [e2eeEnabled, keyProvider]);

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio={audio}
      video={video}
      connectOptions={connectOptionsForLiveKitUrl(url)}
      options={options}
      className={`h-full ${meetingInter.className}`}
    >
      {e2eeEnabled && keyProvider ? (
        <E2eeController
          enabled={e2eeEnabled}
          identity={userId}
          keyProvider={keyProvider}
        />
      ) : null}
      <MeetingChrome room={room} userId={userId} role={role} />
    </LiveKitRoom>
  );
}
