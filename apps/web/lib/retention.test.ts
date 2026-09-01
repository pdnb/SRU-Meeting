import { describe, expect, it } from "vitest";
import { chatExpiredBefore } from "./retention";

describe("retention cutoff", () => {
  it("deletes chat older than the room retention window", () => {
    const now = new Date("2026-08-31T00:00:00.000Z");
    const cutoff = chatExpiredBefore(7, now);
    expect(cutoff.toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(new Date("2026-08-23T00:00:00.000Z") < cutoff).toBe(true);
    expect(new Date("2026-08-30T00:00:00.000Z") < cutoff).toBe(false);
  });
});
