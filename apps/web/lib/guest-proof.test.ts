import { describe, expect, it } from "vitest";
import {
  decodeGuestCookie,
  encodeGuestCookie,
  signGuestProof,
  verifyGuestProof,
} from "./guest-proof";

describe("guest proof", () => {
  it("accepts a valid cookie and rejects a tampered one", () => {
    const secret = "unit-test-secret";
    const cookie = encodeGuestCookie("user-1", secret);
    expect(decodeGuestCookie(cookie, secret)).toBe("user-1");
    expect(decodeGuestCookie(cookie.replace("user-1", "user-2"), secret)).toBe(
      null,
    );
    expect(
      verifyGuestProof("user-1", signGuestProof("user-1", secret), secret),
    ).toBe(true);
  });
});
