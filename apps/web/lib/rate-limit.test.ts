import { describe, expect, it } from "vitest";
import { consumeRateLimit, resetRateLimitForTests } from "./rate-limit";

describe("per-key rate limit", () => {
  it("allows traffic under the window and returns 429 after overflow", () => {
    resetRateLimitForTests();
    const key = "sru_ak_test";
    for (let i = 0; i < 3; i += 1) {
      expect(consumeRateLimit(key, 1_000 + i, 3, 60_000).ok).toBe(true);
    }
    const blocked = consumeRateLimit(key, 1_010, 3, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});
