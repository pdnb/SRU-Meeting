import { describe, expect, it } from "vitest";
import {
  acceptEmbedConnect,
  isEmbedOriginAllowed,
  parseEmbedAllowedOrigins,
} from "./embed-origin";

describe("parseEmbedAllowedOrigins", () => {
  it("splits a comma list and drops empties", () => {
    expect(parseEmbedAllowedOrigins("https://app.example.com, http://localhost:5173")).toEqual([
      "https://app.example.com",
      "http://localhost:5173",
    ]);
    expect(parseEmbedAllowedOrigins("")).toEqual([]);
    expect(parseEmbedAllowedOrigins(undefined)).toEqual([]);
  });
});

describe("isEmbedOriginAllowed", () => {
  it("allows only exact origins on the list", () => {
    const allowlist = ["https://app.example.com", "http://localhost:5173"];
    expect(isEmbedOriginAllowed("https://app.example.com", allowlist)).toBe(true);
    expect(isEmbedOriginAllowed("http://localhost:5173", allowlist)).toBe(true);
    expect(isEmbedOriginAllowed("https://evil.example.com", allowlist)).toBe(false);
    expect(isEmbedOriginAllowed("https://app.example.com", [])).toBe(false);
  });
});

describe("acceptEmbedConnect", () => {
  const allowlist = ["https://app.example.com"];
  const good = {
    type: "sru-embed.connect",
    roomId: "room-1",
    token: "jwt-token",
    url: "wss://livekit.example.com",
    identity: "user-1",
    name: "Ada",
    role: "participant",
    audio: true,
    video: false,
  };

  it("accepts a valid connect message from an allowlisted origin", () => {
    const result = acceptEmbedConnect({
      origin: "https://app.example.com",
      allowlist,
      roomId: "room-1",
      data: good,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.token).toBe("jwt-token");
      expect(result.payload.url).toBe("wss://livekit.example.com");
    }
  });

  it("ignores tokens from a non-allowlisted origin", () => {
    const result = acceptEmbedConnect({
      origin: "https://evil.example.com",
      allowlist,
      roomId: "room-1",
      data: good,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("origin");
    }
  });

  it("ignores connect messages for a different room", () => {
    const result = acceptEmbedConnect({
      origin: "https://app.example.com",
      allowlist,
      roomId: "room-1",
      data: { ...good, roomId: "other-room" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("room");
    }
  });

  it("rejects payloads that look like they carry LIVEKIT_API_SECRET", () => {
    const result = acceptEmbedConnect({
      origin: "https://app.example.com",
      allowlist,
      roomId: "room-1",
      data: { ...good, apiSecret: "nope" },
    });
    expect(result.ok).toBe(false);
  });
});
