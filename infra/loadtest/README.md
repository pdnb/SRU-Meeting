# Compose loadtest (small N)

Join-time checks against **local Compose LiveKit** (`ws://127.0.0.1:7880` by default).

## This is not a 500-user run

This directory is for **small-N** smoke joins (1–10 participants) and the spec §7.1 **join under 3s** gate at that scale.

The **500-concurrent** scenario (TURN, 4G throttle, full §7.1 gates) is a separate runbook — Task 55. Do not treat a green small-N run as Production 1.0 load-test sign-off.

## Prerequisites

1. Compose stack up with LiveKit on port **7880** (see `infra/README.md`).
2. Workspace deps installed (`pnpm install` at repo root) so `apps/web` can resolve `livekit-client` / `livekit-server-sdk`.
3. API credentials matching Compose / `.env.example` (local placeholders only):
   - `LIVEKIT_API_KEY` default `devkey`
   - `LIVEKIT_API_SECRET` default `sru_livekit_local_dev_secret_do_not_use`

## Runner

From the repo root:

```bash
node infra/loadtest/run.mjs --help
node infra/loadtest/run.mjs --dry-run
node infra/loadtest/run.mjs --participants 3
```

Exit code `1` if any measured join exceeds **3000ms**.

## Join-time helper (tests)

The same 3s gate is asserted in TypeScript for unit tests:

- `apps/web/lib/loadtest-join.ts` — `assertJoinUnderBudget` / `summarizeJoinSamples`
- `apps/web/lib/loadtest-join.test.ts`

```bash
pnpm --filter web test -- lib/loadtest-join.test.ts
```
