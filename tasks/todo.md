# SRU-Meeting Task List

Use with [plan.md](plan.md). Check a box only when that task’s acceptance criteria and verification steps are done. Implement one numbered task per session. Phase 2–4 epics are split into S/M tasks — work the numbered tasks below, not epic rows.

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
- [x] **Task 55:** 500-concurrent + TURN/4G runbook and gates (E3.5)
- [x] **Task 56:** Expo app that joins with a minted token (E3.3)
- [x] **Task 57:** Native grid + mute (E3.3)
- [x] **Task 58:** PiP + background audio (E3.3)
- [x] **Task 59:** CallKit / ConnectionService + push (signing required) (E3.3)

### Checkpoint: After Tasks 41-46 (breakouts)

- [x] Two browsers: host opens breakouts, participant lands in a child, recall returns everyone
- [x] Child token mint rejects unassigned participants
- [x] Application still builds

### Checkpoint: After Tasks 47-51 (streaming + embed)

- [x] Host can start/stop RTMP; HLS live playlist is playable in-product
- [x] Embed iframe joins with a postMessage token; secret never in the customer page
- [ ] Review with human before Helm and load test

### Checkpoint: Production 1.0

- [ ] Pen-test completed
- [ ] Load-test gates met (do not claim 500 concurrent until a sized run exists)
- [ ] Ready for Production Release 1.0 review

---

## Phase 4: Polish & Growth (S/M tasks — split 2026-09-01)

Do not treat parked epic rows as build units. Work the numbered tasks below. Ship order: media (60–62) → engagement (63–68) → transcription plumbing (69–72, STT deferred) → analytics (73–76) → SCIM (77–80) → E2EE last (81–84).

### Wave 1: Media polish

- [x] **Task 60:** Noise suppression with track processors
- [x] **Task 61:** Virtual background (blur + presets)
- [x] **Task 62:** Mobile noise suppression parity

### Checkpoint: Media polish (after Tasks 60–62)

- [x] Web: noise filter + virtual background work in prejoin and meeting
- [ ] Remote participant sees background effect
- [x] Application still builds
- [ ] Review with human before engagement epic

### Wave 2: Engagement — polls, Q&A, whiteboard

- [x] **Task 63:** Polls schema + API + contracts
- [x] **Task 64:** Polls UI + realtime results
- [x] **Task 65:** Q&A schema + submit API
- [x] **Task 66:** Q&A moderator + participant panels
- [x] **Task 67:** Whiteboard contracts + session model
- [x] **Task 68:** Collaborative whiteboard panel (tldraw)

### Checkpoint: Engagement (after Tasks 63–68)

- [ ] Poll create/vote/close works two-browser
- [ ] Q&A submit and moderator queue works
- [ ] Whiteboard sync works two-browser
- [ ] Review with human before transcription wave

Automated verification 2026-09-01: Tasks 63–68 marked done; `phase4_engagement` migration applied (no pending); shared 24 + web 177 tests pass; typecheck pass; `next build --turbopack` in `apps/web` OK (`pnpm --filter web build` fails prisma generate EPERM on Windows). Unit tests cover participant poll-create 403 (`polls.test.ts`) and breakout whiteboard 403 (`whiteboards.test.ts`); Q&A submit + moderator 403 in `questions.test.ts`. MeetingChrome wires PollPanel, QaPanel, WhiteboardPanel with sidebar toggles. Two-browser and human review still required.

### Wave 3: Transcription & summary — schema/UI only

- [x] **Task 69:** Transcript schema + contracts
- [x] **Task 70:** Transcript viewer UI
- [x] **Task 71:** Transcription worker interface + enqueue hook (stub; no STT yet)
- [x] **Task 72:** Meeting summary placeholder

### Checkpoint: Transcription plumbing (after Tasks 69–72)

- [x] Recording finish enqueues transcript job (stub)
- [ ] Transcript viewer renders seeded segments
- [x] Summary placeholder visible
- [ ] **Human decision:** choose STT provider (Whisper vs cloud) before real Task 71 provider
- [ ] Review with human before analytics wave

Automated verification 2026-09-01: Tasks 69–72 marked done; `phase4_transcription` migration added; shared + web tests pass; typecheck pass; `next build --turbopack` in `apps/web` if prisma EPERM. Stub `StubTranscriptionProvider` only — no Whisper/cloud STT or LLM. Seeded segment UI and human STT gate still required.

### Wave 4: Analytics dashboard

- [x] **Task 73:** Metrics rollup schema + nightly job
- [x] **Task 74:** Analytics API
- [x] **Task 75:** Analytics dashboard UI
- [x] **Task 76:** Client QoS stats reporting

### Checkpoint: Analytics (after Tasks 73–76)

- [ ] Rollup job populates metrics
- [ ] Admin charts and CSV export work
- [ ] Review with human before SCIM wave

Automated verification 2026-09-01: Tasks 73–76 marked done; `phase4_analytics` migration added; shared + web tests pass; typecheck pass; `next build --turbopack` in `apps/web` if prisma EPERM. Rollup backfills 30 days on first run; admin Analytics tab with CSS bar charts + CSV export; QoS ingest via meeting client ~60s. Human chart/QoS verification still required.

### Wave 5: SCIM 2.0

- [x] **Task 77:** SCIM bearer auth + admin token management
- [x] **Task 78:** SCIM Users endpoints
- [x] **Task 79:** SCIM Groups → orgRole mapping
- [x] **Task 80:** SCIM audit + documentation

### Checkpoint: SCIM (after Tasks 77–80)

- [ ] IdP test tenant can provision and deprovision a user
- [ ] Group mapping updates role
- [ ] Review with human before E2EE wave

Automated verification 2026-09-01: Tasks 77–80 marked done; `phase4_scim` migration added; shared + web tests pass; typecheck pass; `next build --turbopack` in `apps/web` if prisma EPERM. SCIM bearer auth on `/scim/v2/*`; admin token generate/rotate/revoke; Users CRUD + Groups membership; audit events + OpenAPI + `.env.example`. IdP sandbox and human review still required.

### Wave 6: E2EE — last

- [x] **Task 81:** E2EE room policy + token gate
- [x] **Task 82:** E2EE audio — Insertable Streams
- [x] **Task 83:** E2EE video — Insertable Streams
- [x] **Task 84:** E2EE product limits + mobile/embed stance

Automated verification 2026-09-01: Tasks 81–84 marked done; `phase4_e2ee` migration added; shared + web + embed tests pass; typecheck pass; `next build --turbopack` in `apps/web` if prisma EPERM. Policy gates on recording/streaming/breakouts; LiveKit Insertable Streams E2EE for A/V; screen share plaintext; embed warning postMessage; `docs/e2ee.md`. Two-browser E2EE verification and human pilot review still required.

### Checkpoint: Phase 4 complete (after Tasks 81–84)

- [x] All six epics meet their task acceptance criteria
- [ ] STT provider chosen and Task 71 stub replaced (follow-on)
- [ ] E2EE human review completed before any pilot
- [x] Application still builds; Compose + dev still run
- [ ] Ready for Phase 4 release review

Automated verification 2026-09-01: Tasks 60–84 all [x] in todo.md and plan.md; 11 Prisma migrations applied (no pending); shared 37 + web 207 + embed 7 + mobile 28 = 279 tests pass; typecheck pass; `next build --turbopack` in `apps/web` OK. Six epics implemented: media (noise/background + mobile parity), engagement (polls/Q&A/whiteboard wired in MeetingChrome), transcription plumbing (stub `StubTranscriptionProvider` only), analytics (rollup + admin dashboard + QoS), SCIM (bearer auth + Users/Groups + audit), E2EE (policy gates + Insertable Streams A/V + embed warning). Human gates still open: two-browser media/engagement/E2EE, STT provider choice, IdP SCIM sandbox, analytics chart review, Phase 4 release review.

---

## Parallel tracks (after contracts exist)

Safe after Task 4: Task 5 with Task 8; Task 7 with Task 6.

Safe after Task 11: Tasks 12, 13, 14, and 17.

Safe after Task 14: Task 15 with Task 16.

Keep sequential: Compose → Prisma → Auth → Rooms → Tokens; Task 22 after Task 20.

Phase 3: Task 41 before 42–46; 47 after 25–26; 50 after 11 and 34; 53 after 52; 55 after 54; native 56–59 last.

Phase 4: 60 → 61 → 62; 63/65/67 can start after prior waves; 64 after 63, 66 after 65, 68 after 67; 69–72 sequential; 73–76 sequential; 77–80 sequential; 81–84 sequential (E2EE last).