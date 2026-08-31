import { describe, expect, it } from "vitest";
import {
  TOKEN_TTL,
  buildVideoGrant,
  buildVideoGrantForRole,
  mintAccessToken,
} from "./token";

function decodeJwtPayload(token: string): {
  exp: number;
  iat?: number;
  nbf?: number;
  video?: {
    room?: string;
    roomJoin?: boolean;
    roomAdmin?: boolean;
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
  };
} {
  const payload = token.split(".")[1];
  if (!payload) {
    throw new Error("token is not a JWT");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    exp: number;
    iat?: number;
    nbf?: number;
    video?: {
      room?: string;
      roomJoin?: boolean;
      roomAdmin?: boolean;
      canPublish?: boolean;
      canSubscribe?: boolean;
      canPublishData?: boolean;
    };
  };
}

describe("buildVideoGrant", () => {
  it("grants join, publish, and subscribe for the named room", () => {
    const grant = buildVideoGrant("poc-room");

    expect(grant.room).toBe("poc-room");
    expect(grant.roomJoin).toBe(true);
    expect(grant.canPublish).toBe(true);
    expect(grant.canSubscribe).toBe(true);
  });
});

describe("TOKEN_TTL", () => {
  it("is measured in minutes, not days", () => {
    expect(TOKEN_TTL).toMatch(/^\d+m$/);
    const minutes = Number.parseInt(TOKEN_TTL, 10);
    expect(minutes).toBeGreaterThan(0);
    expect(minutes).toBeLessThanOrEqual(60);
  });
});

describe("buildVideoGrantForRole", () => {
  it("gives roomAdmin only to host and cohost", () => {
    expect(
      buildVideoGrantForRole({
        roomName: "room-1",
        role: "host",
        allowScreenShare: true,
        allowChat: true,
      }).roomAdmin,
    ).toBe(true);
    expect(
      buildVideoGrantForRole({
        roomName: "room-1",
        role: "cohost",
        allowScreenShare: true,
        allowChat: true,
      }).roomAdmin,
    ).toBe(true);
    expect(
      buildVideoGrantForRole({
        roomName: "room-1",
        role: "participant",
        allowScreenShare: true,
        allowChat: true,
      }).roomAdmin,
    ).toBe(false);
  });

  it("disables data publish when chat is off", () => {
    const grant = buildVideoGrantForRole({
      roomName: "room-1",
      role: "participant",
      allowScreenShare: true,
      allowChat: false,
    });
    expect(grant.canPublishData).toBe(false);
  });
});

describe("mintAccessToken", () => {
  it("embeds the video grant and expires in minutes", async () => {
    const token = await mintAccessToken({
      apiKey: "devkey",
      apiSecret: "unit-test-secret-at-least-32-chars",
      identity: "alice",
      roomName: "poc-room",
      name: "Alice",
    });

    const payload = decodeJwtPayload(token);
    const issuedAt = payload.iat ?? payload.nbf;
    expect(issuedAt).toBeTypeOf("number");
    expect(payload.video?.room).toBe("poc-room");
    expect(payload.video?.roomJoin).toBe(true);

    const lifetimeSeconds = payload.exp - (issuedAt as number);
    expect(lifetimeSeconds).toBeGreaterThan(0);
    expect(lifetimeSeconds).toBeLessThanOrEqual(60 * 60);
  });
});
