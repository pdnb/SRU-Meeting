# SRU-Conf Task List

Use with [plan.md](plan.md). Check a box only when that task’s acceptance criteria and verification steps are done. Implement one numbered task per session. Split Phase 2–3 epics into S/M tasks before building them.

Standing bar for every S/M task: criteria met, verification run, `pnpm --filter web build` still works, no secrets committed, Compose + `pnpm --filter web dev` still runs.

---

## Phase 0: Foundation

- [x] **Task 1:** Monorepo and Next.js scaffold
- [x] **Task 2:** Local media stack (Compose)
- [x] **Task 3:** Prisma core schema

### Checkpoint: After Tasks 1-3

- [x] Workspace installs and the web app builds
- [x] Compose Postgres accepts a Prisma migration
- [x] Review with human if migrate or UDP ports fail on Windows

- [x] **Task 4:** Shared API contracts
- [x] **Task 5:** CI quality gate
- [x] **Task 6:** LiveKit token helper and two-browser PoC

### Checkpoint: After Tasks 4-6

- [x] Shared package tests pass
- [x] CI workflow exists and local lint/typecheck/test pass
- [x] Two-browser PoC works
- [ ] Review with human before OpenAPI and product chrome

- [x] **Task 7:** OpenAPI skeleton
- [x] **Task 8:** App shell and design tokens

### Checkpoint: Foundation

- [x] Compose stack is healthy
- [x] Two-browser PoC works (see/hear each other)
- [ ] CI is green
- [x] OpenAPI skeleton is reachable
- [ ] Review with human before Task 9 (auth)

---

## Phase 1: Core MVP

- [x] **Task 9:** Local register and login
- [x] **Task 10:** Create, list, and close rooms

### Checkpoint: After Tasks 9-10

- [x] Register, login, and session work
- [x] Host can create and close a room from the UI
- [ ] Review with human before the product join path

- [x] **Task 11:** Join meeting with camera and mic
- [x] **Task 12:** Grid, speaker, and sidebar layouts
- [x] **Task 13:** Screen sharing

### Checkpoint: After Tasks 11-13

- [x] Two users join with A/V, switch layouts, and share a screen
- [x] Token grant tests pass
- [ ] Review with human before chat

- [x] **Task 14:** Public chat with history
- [x] **Task 15:** Private chat, emoji, mention
- [x] **Task 16:** Chat file attachments (drop first if a sprint slips)

### Checkpoint: After Tasks 14-16

- [ ] Public chat, DM, and (if kept) attachments work
- [ ] History survives reload
- [ ] Review with human before hands and reactions

- [x] **Task 17:** Raise hand queue
- [x] **Task 18:** Reactions

### Checkpoint: After Tasks 17-18

- [ ] Hands and reactions work without reconnect
- [x] Application still builds
- [ ] Review with human before moderator APIs

- [x] **Task 19:** Moderator media controls
- [x] **Task 20:** Moderator membership controls
- [x] **Task 21:** Room password

### Checkpoint: After Tasks 19-21

- [x] Moderator media and membership APIs reject participants
- [x] Room password blocks token mint
- [ ] Review with human before lobby

- [x] **Task 22:** Lobby and knocking
- [x] **Task 23:** Join policies
- [x] **Task 24:** MVP hardening and health

### Checkpoint: Phase 1 MVP

- [x] All Phase 1 tests pass and the web app builds
- [x] Two (ideally three) browsers: A/V, share, public and DM chat, hand, host mute/kick/end
- [x] Password and lobby work
- [x] Compose-only local run; CI green
- [x] Review with human before any Phase 2 epic

Saved 2026-08-31 as git tag `checkpoint/phase-1-mvp`. Two-browser A/V and password/lobby were verified in live meetings (TURN/TCP on Windows Docker). Split each Phase 2 epic into S/M tasks before building.

---

## Phase 2: Enterprise (S/M tasks — split 2026-08-31)

Do not treat the E2.* rows as build units. Work the numbered tasks below.

- [x] **Task 25:** Egress Compose worker + Prisma recording schema (E2.1)
- [x] **Task 26:** Composite start/stop API + PDPA consent banner (E2.1)
- [x] **Task 27:** Recording metadata + signed MinIO download (E2.1)
- [x] **Task 28:** Track egress API (E2.2)
- [x] **Task 29:** HLS VOD playlist + in-product player (E2.2)
- [x] **Task 30:** Org-level RBAC (org_admin / host / participant) (E2.5)
- [x] **Task 31:** Auth.js OIDC (Keycloak, Entra, Google, Okta) + JIT + group role map (E2.3)
- [x] **Task 32:** SAML 2.0 ACS + JIT (E2.3)
- [x] **Task 33:** LDAP / Active Directory bind and search (E2.4)
- [x] **Task 34:** Public API keys + HMAC request signing (E2.6)
- [x] **Task 35:** Per-key rate limit (E2.6)
- [x] **Task 36:** Swagger UI for OpenAPI 3 (E2.6)
- [x] **Task 37:** Signed webhooks + delivery retries (E2.7)
- [x] **Task 38:** Admin dashboard (users, rooms, recordings, config) (E2.8)
- [x] **Task 39:** Installable PWA, mobile meeting layout, 4G encoding defaults (E2.9)
- [x] **Task 40:** Audit log + chat/recording retention jobs + user deletion (E2.10)

### Checkpoint: Pilot

- [x] Each started epic was split into S/M tasks and those tasks met their criteria
- [ ] Small-org pilot is usable (not production scale) — recording/SSO still need a human two-browser pass
- [x] Review with human before Phase 3

---

## Phase 3: Advanced and scale (S/M tasks — split 2026-08-31)

Do not treat the E3.* rows as build units. Work the numbered tasks below. WHEP / LL-HLS stays parked. Room cap stays 25 until a later task.

- [x] **Task 41:** Breakout Prisma schema + shared contracts (E3.1)
- [x] **Task 42:** Create/list/close breakout API (E3.1)
- [x] **Task 43:** Child token mint + assignment gate (E3.1)
- [x] **Task 44:** Host breakout panel + participant move control (E3.1)
- [x] **Task 45:** Timer, broadcast, help, recall-all (E3.1)
- [x] **Task 46:** Self-pick + moderator roam + pre-warm (E3.1)
- [x] **Task 47:** Stream model + RTMP start/stop + consent + webhook (E3.2)
- [x] **Task 48:** Multi-destination UpdateStream + HLS live playlist (E3.2)
- [x] **Task 49:** In-meeting stream banner + org HLS player (E3.2)
- [x] **Task 50:** Embed package + iframe meeting page (E3.6)
- [x] **Task 51:** postMessage token handshake + origin allowlist (E3.6)
- [x] **Task 52:** Helm chart for web, Postgres, Redis, MinIO (E3.4)
- [x] **Task 53:** LiveKit + coturn + egress Helm values + air-gap images (E3.4)
- [x] **Task 54:** Load-test runner against Compose (E3.5)
- [ ] **Task 55:** 500-concurrent + TURN/4G runbook and gates (E3.5)
- [ ] **Task 56:** Expo app that joins with a minted token (E3.3)
- [ ] **Task 57:** Native grid + mute (E3.3)
- [ ] **Task 58:** PiP + background audio (E3.3)
- [ ] **Task 59:** CallKit / ConnectionService + push (signing required) (E3.3)

### Checkpoint: After Tasks 41-46 (breakouts)

- [ ] Two browsers: host opens breakouts, participant lands in a child, recall returns everyone
- [ ] Child token mint rejects unassigned participants
- [ ] Application still builds

### Checkpoint: After Tasks 47-51 (streaming + embed)

- [ ] Host can start/stop RTMP; HLS live playlist is playable in-product
- [ ] Embed iframe joins with a postMessage token; secret never in the customer page
- [ ] Review with human before Helm and load test

### Checkpoint: Production 1.0

- [ ] Pen-test completed
- [ ] Load-test gates met (do not claim 500 concurrent until a sized run exists)
- [ ] Ready for Production Release 1.0 review

---

## Phase 4: Parked

Do not pull into a sprint without a new task breakdown.

- [ ] Virtual background / noise suppression
- [ ] Whiteboard, polls, Q&A
- [ ] AI transcription / meeting summary
- [ ] E2EE with Insertable Streams
- [ ] Analytics dashboard
- [ ] SCIM 2.0

---

## Parallel tracks (after contracts exist)

Safe after Task 4: Task 5 with Task 8; Task 7 with Task 6.

Safe after Task 11: Tasks 12, 13, 14, and 17.

Safe after Task 14: Task 15 with Task 16.

Keep sequential: Compose → Prisma → Auth → Rooms → Tokens; Task 22 after Task 20.

Phase 3: Task 41 before 42–46; 47 after 25–26; 50 after 11 and 34; 53 after 52; 55 after 54; native 56–59 last.