# Production 1.0 load-test results

**Status:** NOT RUN — no sized 500-concurrent execution on record yet.

Do not check `tasks/todo.md` → Checkpoint: Production 1.0 → "Load-test gates met" until this file records a completed run that passes the gates below.

## Target scenario

- 500 concurrent participants (publishers + subscribers per release definition)
- TURN relay cohort (corporate NAT / blocked UDP)
- 4G-throttled cohort (Slow 4G or ~1.6 Mbps down / 0.75 Mbps up / 150ms RTT)
- Sized environment (Helm `infra/helm/`, not laptop Compose)

## Section 7.1 gates

| Gate | Pass criteria | Result | Evidence |
|------|---------------|--------|----------|
| Join time | under 3s | — | |
| Regional audio latency | under 200ms (same region) | — | |
| Packet loss tolerance | usable at ≤5% loss | — | |

## Run metadata (fill when executed)

| Field | Value |
|-------|-------|
| Date | |
| Environment | |
| Region | |
| SFU / TURN topology | |
| Load generator | |
| `LIVEKIT_URL` | |
| Participants (peak) | |
| TURN cohort size | |
| 4G cohort size | |
| Raw stats archive | |

## Outcome

- [ ] **PASS** — all gates met; link evidence above
- [ ] **FAIL** — note failing gates and follow-up actions

### Notes

<!-- Post-run summary, regressions, infra limits -->
