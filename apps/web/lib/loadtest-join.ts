/** Spec §7.1 join gate for small-N Compose load checks (not the 500-user run). */
export const JOIN_BUDGET_MS = 3000;

export type JoinBudgetResult =
  | { ok: true }
  | { ok: false; message: string };

export function assertJoinUnderBudget(
  joinMs: number,
  budgetMs: number = JOIN_BUDGET_MS,
): JoinBudgetResult {
  if (!Number.isFinite(joinMs) || joinMs < 0) {
    return {
      ok: false,
      message: `Invalid join time ${String(joinMs)}`,
    };
  }
  if (joinMs > budgetMs) {
    return {
      ok: false,
      message: `Join took ${joinMs}ms; budget is ${budgetMs}ms`,
    };
  }
  return { ok: true };
}

export function summarizeJoinSamples(
  samplesMs: number[],
  budgetMs: number = JOIN_BUDGET_MS,
): {
  ok: boolean;
  maxMs: number;
  count: number;
  failures: number;
} {
  if (samplesMs.length === 0) {
    return { ok: false, maxMs: 0, count: 0, failures: 0 };
  }
  let maxMs = 0;
  let failures = 0;
  for (const sample of samplesMs) {
    if (sample > maxMs) {
      maxMs = sample;
    }
    if (!assertJoinUnderBudget(sample, budgetMs).ok) {
      failures += 1;
    }
  }
  return {
    ok: failures === 0,
    maxMs,
    count: samplesMs.length,
    failures,
  };
}
