import { describe, expect, it } from "vitest";
import {
  hasModeratorGrant,
  nextMicrophoneEnabled,
  readVideoGrantFromToken,
  shouldShowModeratorChrome,
} from "./token-grant";

function jwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("readVideoGrantFromToken", () => {
  it("reads roomAdmin from the join JWT", () => {
    const grant = readVideoGrantFromToken(
      jwt({ video: { roomAdmin: true, canPublish: true } }),
    );
    expect(grant?.roomAdmin).toBe(true);
  });

  it("returns null for invalid tokens", () => {
    expect(readVideoGrantFromToken("not-a-jwt")).toBeNull();
  });
});

describe("shouldShowModeratorChrome", () => {
  it("is true only when roomAdmin is in the existing token", () => {
    expect(
      shouldShowModeratorChrome(jwt({ video: { roomAdmin: true } })),
    ).toBe(true);
    expect(
      shouldShowModeratorChrome(jwt({ video: { roomAdmin: false } })),
    ).toBe(false);
    expect(shouldShowModeratorChrome(jwt({ video: {} }))).toBe(false);
  });

  it("does not treat participant tokens as moderator", () => {
    expect(hasModeratorGrant(jwt({ video: { canPublish: true } }))).toBe(false);
  });
});

describe("nextMicrophoneEnabled", () => {
  it("toggles local mic state", () => {
    expect(nextMicrophoneEnabled(true)).toBe(false);
    expect(nextMicrophoneEnabled(false)).toBe(true);
  });
});
