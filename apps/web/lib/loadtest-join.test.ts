import { describe, expect, it } from "vitest";
import {
  JOIN_BUDGET_MS,
  assertJoinUnderBudget,
  summarizeJoinSamples,
} from "./loadtest-join";

describe("assertJoinUnderBudget", () => {
  it("passes when join is under the 3s gate", () => {
    expect(assertJoinUnderBudget(2999)).toEqual({ ok: true });
    expect(assertJoinUnderBudget(0)).toEqual({ ok: true });
  });

  it("fails when join exceeds 3s", () => {
    const result = assertJoinUnderBudget(3001);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/3001/);
      expect(result.message).toMatch(/3000/);
    }
    expect(assertJoinUnderBudget(JOIN_BUDGET_MS).ok).toBe(true);
    expect(assertJoinUnderBudget(JOIN_BUDGET_MS + 1).ok).toBe(false);
  });
});

describe("summarizeJoinSamples", () => {
  it("fails the batch when any sample exceeds the budget", () => {
    const ok = summarizeJoinSamples([120, 800, 1500]);
    expect(ok.ok).toBe(true);
    expect(ok.maxMs).toBe(1500);

    const bad = summarizeJoinSamples([100, 4000, 200]);
    expect(bad.ok).toBe(false);
    expect(bad.maxMs).toBe(4000);
  });
});
