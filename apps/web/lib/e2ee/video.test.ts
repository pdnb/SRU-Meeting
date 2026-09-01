import { describe, expect, it } from "vitest";
import { E2EE_SCREEN_SHARE_PLAINTEXT } from "./video";

describe("e2ee video policy", () => {
  it("documents plaintext screen share in v1", () => {
    expect(E2EE_SCREEN_SHARE_PLAINTEXT).toBe(true);
  });
});
