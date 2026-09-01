import type { Room } from "livekit-client";
import type { ParticipantKeyProvider } from "./keys";

/** Enable LiveKit sender/receiver transforms (audio + video). */
export async function enableRoomE2eeMedia(room: Room): Promise<void> {
  if (!room.hasE2EESetup) {
    return;
  }
  await room.setE2EEEnabled(true);
}

export function isLocalAudioTrackEncrypted(room: Room): boolean {
  return room.isE2EEEnabled;
}

export type E2eeMediaContext = {
  keyProvider: ParticipantKeyProvider;
  identity: string;
};
