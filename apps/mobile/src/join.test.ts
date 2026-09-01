import { describe, expect, it, vi } from "vitest";
import {
  fetchMintedJoin,
  joinCredentialsFromResponse,
  usableJoinToken,
} from "./join";

describe("usableJoinToken", () => {
  it("rejects empty or whitespace tokens", () => {
    expect(usableJoinToken("").ok).toBe(false);
    expect(usableJoinToken("   ").ok).toBe(false);
  });

  it("accepts a non-empty token string", () => {
    expect(usableJoinToken("eyJhbGciOiJIUzI1NiJ9.abc")).toEqual({ ok: true });
  });
});

describe("joinCredentialsFromResponse", () => {
  it("parses a valid mint response", () => {
    const result = joinCredentialsFromResponse({
      token: "eyJ.token",
      url: "ws://127.0.0.1:7880",
    });
    expect(result).toEqual({
      ok: true,
      token: "eyJ.token",
      url: "ws://127.0.0.1:7880",
    });
  });

  it("fails when token or url is missing", () => {
    expect(joinCredentialsFromResponse({ token: "", url: "ws://x" }).ok).toBe(
      false,
    );
    expect(joinCredentialsFromResponse({ token: "t", url: "" }).ok).toBe(false);
    expect(joinCredentialsFromResponse({}).ok).toBe(false);
  });
});

describe("fetchMintedJoin", () => {
  it("POSTs to the web mint endpoint and returns credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        token: "minted-jwt",
        url: "ws://127.0.0.1:7880",
      }),
    });

    const result = await fetchMintedJoin({
      apiBaseUrl: "http://127.0.0.1:3000",
      roomName: "demo",
      identity: "mobile-1",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({
      ok: true,
      token: "minted-jwt",
      url: "ws://127.0.0.1:7880",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/api/v1/dev/token",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body,
    );
    expect(body).toEqual({ roomName: "demo", identity: "mobile-1" });
    expect(JSON.stringify(body)).not.toMatch(/secret|API_KEY|apiSecret/i);
  });

  it("rejects blank room before calling the API", async () => {
    const fetchMock = vi.fn();
    const result = await fetchMintedJoin({
      apiBaseUrl: "http://127.0.0.1:3000/",
      roomName: "",
      identity: "x",
      fetchImpl: fetchMock,
    });
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces API errors without embedding secrets", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: { code: "VALIDATION_ERROR", message: "Invalid token request" },
      }),
    });

    const result = await fetchMintedJoin({
      apiBaseUrl: "http://127.0.0.1:3000/",
      roomName: "demo",
      identity: "x",
      fetchImpl: fetchMock,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Invalid token request/);
      expect(result.message).not.toMatch(/sru_livekit|secret/i);
    }
  });
});
