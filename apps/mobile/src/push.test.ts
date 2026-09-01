import { describe, expect, it } from "vitest";
import {
  buildPushRoomInvitePayload,
  parsePushInvitePayload,
} from "./push-logic";

describe("parsePushInvitePayload", () => {
  it("accepts a room invite with room id only", () => {
    const result = parsePushInvitePayload({
      type: "room_invite",
      roomId: "room-abc",
      roomName: "Standup",
    });
    expect(result).toEqual({
      ok: true,
      invite: {
        type: "room_invite",
        roomId: "room-abc",
        roomName: "Standup",
      },
    });
  });

  it("rejects LiveKit secrets in the payload", () => {
    const withSecret = parsePushInvitePayload({
      type: "room_invite",
      roomId: "room-abc",
      livekitApiSecret: "do-not-send",
    });
    expect(withSecret.ok).toBe(false);

    const withToken = parsePushInvitePayload({
      type: "room_invite",
      roomId: "room-abc",
      token: "eyJhbG",
    });
    expect(withToken.ok).toBe(false);
    if (!withToken.ok) {
      expect(withToken.message).toMatch(/must not include token/i);
    }
  });

  it("parses JSON strings", () => {
    const payload = buildPushRoomInvitePayload({ roomId: "r1" });
    const result = parsePushInvitePayload(JSON.stringify(payload));
    expect(result.ok).toBe(true);
  });
});

describe("buildPushRoomInvitePayload", () => {
  it("never embeds secrets", () => {
    const payload = buildPushRoomInvitePayload({
      roomId: "room-1",
      inviterName: "Host",
    });
    expect(JSON.stringify(payload)).not.toMatch(/secret|token|apiKey/i);
    expect(payload.roomId).toBe("room-1");
  });
});
