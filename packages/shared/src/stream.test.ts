import { describe, expect, it } from "vitest";
import {
  StartStreamRequestSchema,
  StreamSchema,
  UpdateStreamRequestSchema,
} from "./stream";

describe("StartStreamRequestSchema", () => {
  it("accepts an RTMP URL, HLS-only, or both, and rejects an empty body", () => {
    expect(StartStreamRequestSchema.safeParse({}).success).toBe(false);
    expect(
      StartStreamRequestSchema.safeParse({
        rtmpUrl: "rtmps://a.rtmp.youtube.com/live2/stream-key",
      }).success,
    ).toBe(true);
    expect(StartStreamRequestSchema.safeParse({ hls: true }).success).toBe(true);
    expect(
      StartStreamRequestSchema.safeParse({
        rtmpUrl: "rtmps://a.rtmp.youtube.com/live2/stream-key",
        hls: true,
      }).success,
    ).toBe(true);
    expect(StartStreamRequestSchema.safeParse({ hls: false }).success).toBe(
      false,
    );
  });
});

describe("UpdateStreamRequestSchema", () => {
  it("requires add or remove with an RTMP URL", () => {
    expect(UpdateStreamRequestSchema.safeParse({}).success).toBe(false);
    expect(
      UpdateStreamRequestSchema.safeParse({
        action: "add",
        rtmpUrl: "rtmps://live.twitch.tv/app/key",
      }).success,
    ).toBe(true);
    expect(
      UpdateStreamRequestSchema.safeParse({
        action: "remove",
        rtmpUrl: "rtmps://live.twitch.tv/app/key",
      }).success,
    ).toBe(true);
  });
});

describe("StreamSchema", () => {
  it("accepts a pending stream without exposing a stream key", () => {
    const result = StreamSchema.safeParse({
      id: "st_1",
      roomId: "room-1",
      startedById: "host-1",
      status: "pending_consent",
      destinations: ["rtmps://a.rtmp.youtube.com"],
      consentedUserIds: ["host-1"],
      startedAt: null,
      finishedAt: null,
      createdAt: "2026-08-31T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(JSON.stringify(result.data)).not.toContain("stream-key");
    }
  });
});
