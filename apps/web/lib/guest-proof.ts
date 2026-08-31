import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";

export const GUEST_COOKIE = "sru_guest";

export function signGuestProof(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(userId).digest("hex");
}

export function verifyGuestProof(
  userId: string,
  proof: string,
  secret: string,
): boolean {
  const expected = signGuestProof(userId, secret);
  const left = Buffer.from(expected);
  const right = Buffer.from(proof);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function encodeGuestCookie(userId: string, secret: string): string {
  return `${userId}.${signGuestProof(userId, secret)}`;
}

export function decodeGuestCookie(
  value: string | undefined,
  secret: string,
): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = value.slice(0, dot);
  const proof = value.slice(dot + 1);
  return verifyGuestProof(userId, proof, secret) ? userId : null;
}

export function guestCookieSecret(): string {
  return getServerEnv().AUTH_SECRET ?? "dev-only-guest-proof-secret";
}
