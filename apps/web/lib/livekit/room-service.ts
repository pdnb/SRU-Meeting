import "server-only";

import { DataPacket_Kind, RoomServiceClient } from "livekit-server-sdk";
import { getServerEnv } from "@/lib/env";

export function liveKitIdentity(userId: string): string {
  return userId;
}

export function livekitHttpUrl(wsUrl: string): string {
  return wsUrl.replace(/^ws/i, "http");
}

export function getRoomService(): RoomServiceClient | null {
  const env = getServerEnv();
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return null;
  }
  return new RoomServiceClient(
    livekitHttpUrl(env.LIVEKIT_URL),
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );
}

// Explicit create is optional — LiveKit also creates on first join.
// https://docs.livekit.io/intro/basics/rooms-participants-tracks/rooms/
// https://github.com/livekit/node-sdks/blob/main/packages/livekit-server-sdk/src/RoomServiceClient.ts
export async function ensureLiveKitRoom(roomName: string): Promise<void> {
  const livekit = getRoomService();
  if (!livekit) {
    return;
  }
  try {
    await livekit.createRoom({ name: roomName });
  } catch {
    // Room may already exist; token mint still create-on-join.
  }
}

// Server SendData: https://github.com/livekit/node-sdks/blob/main/packages/livekit-server-sdk/src/RoomServiceClient.ts
export async function sendRoomData(
  roomName: string,
  payload: Uint8Array,
  topic: string,
): Promise<void> {
  const livekit = getRoomService();
  if (!livekit) {
    return;
  }
  try {
    await livekit.sendData(roomName, payload, DataPacket_Kind.RELIABLE, {
      topic,
    });
  } catch {
    // Empty or already-closed LiveKit rooms still allow the authorized action.
  }
}

