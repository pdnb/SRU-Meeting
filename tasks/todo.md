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

- [ ] Compose stack is healthy
- [ ] Two-browser PoC works (see/hear each other)
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

- [ ] Two users join with A/V, switch layouts, and share a screen
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
- [ ] Two (ideally three) browsers: A/V, share, public and DM chat, hand, host mute/kick/end
- [ ] Password and lobby work
- [x] Compose-only local run; CI green
- [x] Review with human before any Phase 2 epic

Saved 2026-08-31 as git tag `checkpoint/phase-1-mvp`. Known gap: two-browser A/V can still fail on Windows Docker ICE/UDP. Split each Phase 2 epic into S/M tasks before building.

---

## Phase 2: Enterprise (epics — split before building)

- [ ] **E2.1:** Composite recording + PDPA consent + MinIO
- [ ] **E2.2:** Track egress + HLS VOD
- [ ] **E2.3:** SSO (OIDC/SAML, JIT, role mapping)
- [ ] **E2.4:** LDAP / Active Directory
- [ ] **E2.5:** Admin RBAC
- [ ] **E2.6:** Public API keys + HMAC + rate limit + Swagger UI
- [ ] **E2.7:** Signed webhooks
- [ ] **E2.8:** Admin dashboard
- [ ] **E2.9:** PWA / mobile web
- [ ] **E2.10:** Audit log + retention + deletion rights

### Checkpoint: Pilot

- [ ] Each started epic was split into S/M tasks and those tasks met their criteria
- [ ] Small-org pilot is usable (not production scale)
- [ ] Review with human before Phase 3

---

## Phase 3: Advanced and scale (epics — split before building)

- [ ] **E3.1:** Breakout rooms
- [ ] **E3.2:** Live streaming (RTMP / HLS)
- [ ] **E3.3:** Native mobile apps
- [ ] **E3.4:** Multi-node SFU + Helm
- [ ] **E3.5:** Load test 500+ concurrent
- [ ] **E3.6:** Embed SDK

### Checkpoint: Production 1.0

- [ ] Pen-test completed
- [ ] Load-test gates met
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