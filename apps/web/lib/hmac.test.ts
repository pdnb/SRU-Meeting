import { describe, expect, it } from "vitest";
import {
  HMAC_MAX_SKEW_SECONDS,
  canonicalApiRequest,
  signHmacSha256,
  timestampIsFresh,
  verifyApiHmac,
  verifyWebhookSignature,
  webhookSignatureHeader,
} from "./hmac";

const secret = "unit-test-hmac-secret";

describe("API HMAC", () => {
  it("accepts a matching signature within the skew window", () => {
    const timestamp = "1756598400";
    const body = '{"name":"Seminar"}';
    const signature = signHmacSha256(
      secret,
      canonicalApiRequest({
        method: "POST",
        path: "/api/v1/rooms",
        timestamp,
        body,
      }),
    );

    expect(
      verifyApiHmac({
        secret,
        method: "POST",
        path: "/api/v1/rooms",
        timestamp,
        body,
        signature,
        nowSeconds: 1756598400,
      }),
    ).toBe(true);
  });

  it("rejects a wrong signature", () => {
    expect(
      verifyApiHmac({
        secret,
        method: "POST",
        path: "/api/v1/rooms",
        timestamp: "1756598400",
        body: "{}",
        signature: "ab".repeat(32),
        nowSeconds: 1756598400,
      }),
    ).toBe(false);
  });

  it("rejects timestamps outside five minutes", () => {
    expect(timestampIsFresh("100", 100 + HMAC_MAX_SKEW_SECONDS + 1)).toBe(
      false,
    );
    expect(timestampIsFresh("100", 100 + HMAC_MAX_SKEW_SECONDS)).toBe(true);
  });
});

describe("webhook signatures", () => {
  it("round-trips sha256 headers", () => {
    const body = JSON.stringify({ event: "room_started" });
    const header = webhookSignatureHeader(secret, body);
    expect(header.startsWith("sha256=")).toBe(true);
    expect(verifyWebhookSignature(secret, body, header)).toBe(true);
    expect(verifyWebhookSignature(secret, body, "sha256=deadbeef")).toBe(false);
  });
});
