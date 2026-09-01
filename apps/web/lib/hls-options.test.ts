import { describe, expect, it } from "vitest";
import { hlsLoadOptions, hlsXhrNeedsCredentials } from "./hls-options";

describe("hlsXhrNeedsCredentials", () => {
  it("sends cookies only for same-origin playlist URLs", () => {
    expect(hlsXhrNeedsCredentials("/api/v1/streams/st-1/media/live.m3u8")).toBe(
      true,
    );
    expect(
      hlsXhrNeedsCredentials(
        "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      ),
    ).toBe(false);
  });
});

describe("hlsLoadOptions", () => {
  it("uses a live sliding window for live.m3u8 playlists", () => {
    expect(hlsLoadOptions("/api/v1/streams/st-1/media/live.m3u8").live).toBe(
      true,
    );
    expect(
      hlsLoadOptions("/api/v1/recordings/rec-1/media/index.m3u8").live,
    ).toBe(false);
  });
});
