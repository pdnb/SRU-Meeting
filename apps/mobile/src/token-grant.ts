/** Read LiveKit video grants from a join JWT (UI only — enforcement is server-side). */

export type JwtVideoGrant = {
  roomAdmin?: boolean;
  canPublish?: boolean;
  canSubscribe?: boolean;
};

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("token is not a JWT");
  }
  const payload = parts[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const json =
    typeof globalThis.atob === "function"
      ? globalThis.atob(padded)
      : Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

export function readVideoGrantFromToken(token: string): JwtVideoGrant | null {
  try {
    const payload = decodeJwtPayload(token);
    const video = payload.video;
    if (!video || typeof video !== "object") {
      return null;
    }
    return video as JwtVideoGrant;
  } catch {
    return null;
  }
}

/** True when the existing join token already carries roomAdmin (host/cohost). */
export function hasModeratorGrant(token: string): boolean {
  return readVideoGrantFromToken(token)?.roomAdmin === true;
}

/**
 * Moderator chrome is shown only from the join token grant.
 * Never mint or assume a second elevated client grant in the app.
 */
export function shouldShowModeratorChrome(token: string): boolean {
  return hasModeratorGrant(token);
}

export function nextMicrophoneEnabled(current: boolean): boolean {
  return !current;
}
