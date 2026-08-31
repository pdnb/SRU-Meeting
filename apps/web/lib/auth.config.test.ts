import { describe, expect, it } from "vitest";
import { sessionCookieOptions } from "./auth.config";

describe("session cookie", () => {
  it("is httpOnly so client scripts cannot read it", () => {
    expect(sessionCookieOptions.httpOnly).toBe(true);
  });
});
