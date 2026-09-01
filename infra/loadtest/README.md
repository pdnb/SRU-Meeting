# Compose loadtest

## Small-N join check (Task 54)

Join-time checks against **local Compose LiveKit** (`ws://127.0.0.1:7880` by default).

This section is for **small-N** smoke joins (1–10 participants) and the spec section 7.1 **join under 3s** gate at that scale only.

A green small-N run is **not** Production 1.0 load-test sign-off. Use the [500-concurrent runbook](#500-concurrent--turn4g-runbook) below for the sized scenario; leave the Production 1.0 “load-test gates met” checkpoint unchecked until that run exists and passes.

### Prerequisites

1. Compose stack up with LiveKit on port **7880** (see `infra/README.md`).
2. Workspace deps installed (`pnpm install` at repo root) so `apps/web` can resolve `livekit-client` / `livekit-server-sdk`.
3. API credentials matching Compose / `.env.example` (local placeholders only):
   - `LIVEKIT_API_KEY` default `devkey`
   - `LIVEKIT_API_SECRET` default `sru_livekit_local_dev_secret_do_not_use`

### Runner

From the repo root:

```bash
node infra/loadtest/run.mjs --help
node infra/loadtest/run.mjs --dry-run
node infra/loadtest/run.mjs --participants 3
```

Exit code `1` if any measured join exceeds **3000ms**.

### Join-time helper (tests)

- `apps/web/lib/loadtest-join.ts` — `assertJoinUnderBudget` / `summarizeJoinSamples`
- `apps/web/lib/loadtest-join.test.ts`

```bash
pnpm --filter web test -- lib/loadtest-join.test.ts
```

---

## 500-concurrent + TURN/4G runbook

**Status:** runbook only. No sized 500-concurrent result is recorded in this repo yet.  
**Do not** check `tasks/todo.md` / `tasks/plan.md` -> Checkpoint: Production 1.0 -> "Load-test gates met" until a sized run on adequate hardware has been executed and the gates below are met.

Spec reference: `docs/implement-plan.md` section 7.1 Performance.

### Gates (section 7.1)

| Gate | Pass criteria |
|------|----------------|
| Join time | **under 3s** (join under 3000ms) for participants in the scenario |
| Regional audio latency | End-to-end audio **under 200ms** within the same region |
| Packet loss tolerance | Call remains usable at packet loss **5% or less** |

Also record environment (region, SFU/TURN topology, client mix) with the result. Uptime SLA 99.5% is an ops target, not a single load-test pass/fail.

### Target scenario

- **500 concurrent** participants (publishers + subscribers as defined for the release under test).
- Media path forced through **TURN** for a representative share of clients (corporate NAT / blocked UDP), not LAN-only peer paths.
- A **4G-throttled** client cohort so Thai mobile / constrained-bandwidth behavior is exercised (see steps below).
- Prefer a **sized** environment (Helm/`infra/helm` or equivalent capacity), not laptop Compose with the small-N runner capped at 10 participants.

### TURN steps (explicit)

1. Deploy coturn with LiveKit as in production topology (`infra/README.md` ports; Helm: `infra/helm/coturn-values.yaml` + LiveKit ICE/TURN config). Local Compose references:
   - TURN/STUN **3478** UDP+TCP
   - TURN/TLS port **5349** (TLS when certs exist)
   - Production firewall path: **TURN over TLS on TCP 443** (see `infra/README.md` -> TCP 443)
2. Confirm LiveKit is configured for **external coturn** (embedded TURN off), with correct realm/credentials and advertised public IPs for ICE.
3. From a client behind NAT or with UDP blocked, join a room and verify ICE selects a **relay** candidate (Chrome `chrome://webrtc-internals` or equivalent): `typ relay` via coturn, not host-only.
4. Optionally force relay during verification (`iceTransportPolicy: "relay"`) to prove TURN/TCP -- **do not** ship relay-only as the default production client policy (Compose Windows note in `infra/README.md`).
5. Repeat a sample of joins over **TCP 443 TURN/TLS** when that path is terminated in front of coturn; local Compose does not bind host 443.

### 4G throttle steps (explicit)

1. Pick a fixed cohort (for example 10-50 of the 500) that will run under mobile constraints.
2. In Chromium DevTools -> Network -> throttling, select **Slow 4G** (or a custom profile ~1.6 Mbps down / 0.75 Mbps up / 150ms RTT). Keep the throttle on for the full join + hold window.
3. On devices that expose Effective Connection Type, confirm the app's **4G / save-data** publish defaults (360p camera preset from Task 39) engage when applicable.
4. Optionally add **~5% packet loss** on the throttled path (DevTools custom throttling, `tc`/`netem` on Linux agents, or a WAN emulator) to exercise the section 7.1 loss gate.
5. Measure join time, one-way/regional audio latency (same-region pair), and subjective usability (audio intelligible, video acceptable or correctly downshifted) for the throttled cohort while the remaining load holds at 500 concurrent.

### How to run (when capacity exists)

1. Provision SFU + coturn + app at capacity sized for 500 (not the Task 54 Compose smoke).
2. Use a LiveKit-compatible load generator (for example [livekit/loadtester](https://github.com/livekit/loadtester) or an equivalent k6/custom suite) aimed at the target `LIVEKIT_URL`, with tokens from the same key material as that environment.
3. Ramp to **500 concurrent**; hold long enough to sample joins and media stats (minutes, not seconds).
4. Apply TURN and 4G steps above on the designated cohorts.
5. Compare results to the section 7.1 gates table. Archive raw stats + pass/fail notes next to the release (do not flip the Production 1.0 checkbox without that evidence).

### Relationship to the small-N runner

```bash
node infra/loadtest/run.mjs --participants 3
```

Validates wiring and the **3s join helper** only (`--participants` max **10**). It cannot satisfy the 500-concurrent checkpoint.
