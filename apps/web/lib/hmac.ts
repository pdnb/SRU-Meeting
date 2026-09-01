import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const HMAC_MAX_SKEW_SECONDS = 5 * 60;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function signHmacSha256(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function timingSafeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  if (a.length === 0 || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function canonicalApiRequest(input: {
  method: string;
  path: string;
  timestamp: string;
  body: string;
}): string {
  return `${input.timestamp}.${input.method.toUpperCase()}.${input.path}.${sha256Hex(input.body)}`;
}

export function timestampIsFresh(
  timestamp: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxSkew = HMAC_MAX_SKEW_SECONDS,
): boolean {
  const value = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(value)) {
    return false;
  }
  return Math.abs(nowSeconds - value) <= maxSkew;
}

export function verifyApiHmac(input: {
  secret: string;
  method: string;
  path: string;
  timestamp: string;
  body: string;
  signature: string;
  nowSeconds?: number;
}): boolean {
  if (!timestampIsFresh(input.timestamp, input.nowSeconds)) {
    return false;
  }
  const expected = signHmacSha256(
    input.secret,
    canonicalApiRequest({
      method: input.method,
      path: input.path,
      timestamp: input.timestamp,
      body: input.body,
    }),
  );
  return timingSafeEqualHex(expected, input.signature.toLowerCase());
}

export function webhookSignatureHeader(secret: string, body: string): string {
  return `sha256=${signHmacSha256(secret, body)}`;
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  header: string,
): boolean {
  const prefix = "sha256=";
  if (!header.startsWith(prefix)) {
    return false;
  }
  return timingSafeEqualHex(
    signHmacSha256(secret, body),
    header.slice(prefix.length).toLowerCase(),
  );
}
