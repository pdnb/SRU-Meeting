import { describe, expect, it } from "vitest";
import {
  recordingHlsPlaylistKey,
  recordingObjectKey,
  streamLivePlaylistKey,
} from "./egress";

describe("recording object keys", () => {
  it("builds MP4 and HLS playlist keys under recordings/", () => {
    expect(recordingObjectKey("room-1", "rec-1")).toBe(
      "recordings/room-1/rec-1.mp4",
    );
    expect(recordingHlsPlaylistKey("room-1", "rec-1")).toBe(
      "recordings/room-1/rec-1/index.m3u8",
    );
    expect(streamLivePlaylistKey("room-1", "st-1")).toBe(
      "streams/room-1/st-1/live.m3u8",
    );
  });
});
