import { describe, expect, it } from "vitest";
import { nextRetryAt } from "./webhooks";

describe("webhook retry backoff", () => {
  it("grows exponentially and caps", () => {
    const now = Date.parse("2026-08-31T00:00:00.000Z");
    expect(nextRetryAt(0, now).getTime() - now).toBe(1000);
    expect(nextRetryAt(3, now).getTime() - now).toBe(8000);
    expect(nextRetryAt(20, now).getTime() - now).toBe(30 * 60 * 1000);
  });
});
