import "server-only";

import { RoomServiceClient } from "livekit-server-sdk";
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
