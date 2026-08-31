import "server-only";

import type { RoomRole } from "@prisma/client";
import { AccessToken, TrackSource, type VideoGrant } from "livekit-server-sdk";

// Access tokens + grants: https://docs.livekit.io/frontends/reference/tokens-grants/
// Endpoint minting (ttl: '10m'): https://docs.livekit.io/frontends/build/authentication/endpoint/
// Server SDK AccessToken: https://github.com/livekit/node-sdks/blob/main/packages/livekit-server-sdk/src/AccessToken.ts
// Keep LIVEKIT_API_SECRET off the client: https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning

/** Short-lived join token. Official example uses minutes, never days. */
export const TOKEN_TTL = "10m";

export function buildVideoGrant(roomName: string): VideoGrant {
  return {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };
}

export function buildVideoGrantForRole(input: {
  roomName: string;
  role: RoomRole;
  allowScreenShare: boolean;
  allowChat: boolean;
}): VideoGrant {
  const isModerator = input.role === "host" || input.role === "cohost";
  const grant: VideoGrant = {
    room: input.roomName,
    roomJoin: true,
    roomAdmin: isModerator,
    canPublish: true,
    canSubscribe: true,
    canPublishData: input.allowChat,
    canUpdateOwnMetadata: true,
  };
  if (!input.allowScreenShare) {
    grant.canPublishSources = [TrackSource.CAMERA, TrackSource.MICROPHONE];
  }
  return grant;
}

export type MintAccessTokenInput = {
  apiKey: string;
  apiSecret: string;
  identity: string;
  roomName: string;
  name?: string;
  grant?: VideoGrant;
};

export async function mintAccessToken(
  input: MintAccessTokenInput,
): Promise<string> {
  if (!input.apiKey || !input.apiSecret) {
    throw new Error("LiveKit API key and secret are required");
  }

  const at = new AccessToken(input.apiKey, input.apiSecret, {
    identity: input.identity,
    name: input.name,
    ttl: TOKEN_TTL,
  });
  at.addGrant(input.grant ?? buildVideoGrant(input.roomName));
  return at.toJwt();
}
