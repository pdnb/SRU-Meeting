import { describe, expect, it } from "vitest";
import {
  streamBannerKind,
  streamLivePlaylistUrl,
  streamMediaObjectKey,
} from "./stream-ui";

describe("streamBannerKind", () => {
  it("shows consent before egress starts, live while media is leaving, and hides when done", () => {
    expect(streamBannerKind("pending_consent")).toBe("consent");
    expect(streamBannerKind("starting")).toBe("live");
    expect(streamBannerKind("active")).toBe("live");
    expect(streamBannerKind("finishing")).toBe("hidden");
    expect(streamBannerKind("finished")).toBe("hidden");
    expect(streamBannerKind("failed")).toBe("hidden");
    expect(streamBannerKind(null)).toBe("hidden");
  });
});

describe("stream live playlist URL", () => {
  it("points HlsPlayer at the authenticated live playlist", () => {
    expect(streamLivePlaylistUrl("st-1")).toBe(
      "/api/v1/streams/st-1/media/live.m3u8",
    );
  });
});

describe("streamMediaObjectKey", () => {
  it("joins HLS objects under the stream prefix and rejects path traversal", () => {
    expect(
      streamMediaObjectKey("streams/room-1/st-1/", "live.m3u8"),
    ).toEqual({
      ok: true,
      key: "streams/room-1/st-1/live.m3u8",
    });
    expect(streamMediaObjectKey("streams/room-1/st-1/", "../secret")).toEqual({
      ok: false,
    });
    expect(streamMediaObjectKey("streams/room-1/st-1/", "/etc/passwd")).toEqual({
      ok: false,
    });
  });
});
