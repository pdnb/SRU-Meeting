# Implementation Plan: SRU-Conf

## Overview

SRU-Conf is a self-hosted video conference platform. Organizations keep media and metadata on their own infrastructure, join from the web, and later connect existing identity systems via SSO and a public API. Phase 0–1 ship a branded Next.js app on a local LiveKit SFU: a real 25-person meeting with camera/mic, screen share, public and private chat, raise hand, moderator controls, room password, and lobby. Phase 2 (Tasks 25–40) and Phase 3 (Tasks 41–59) are split into S/M tasks; implement one numbered task per session.

Source spec: [docs/implement-plan.md](../docs/implement-plan.md). This repo is greenfield except for that spec. Do not start application code until a human asks to implement a numbered task.

## Architecture Decisions

- **LiveKit self-hosted, not Jitsi and not a custom SFU.** Phase 0 proves two browsers can join a local room. There is no bake-off.
- **Next.js 15 App Router is the only app process in Phase 0–1** (UI + `/api/v1` Route Handlers). Recording and webhook workers become separate processes in Phase 2. Do not introduce Nest or Go for the MVP.
- **pnpm workspace:** `apps/web`, `packages/shared`, `infra/`.
- **Prisma + PostgreSQL** for users, rooms, participants, chat history, and later recordings.
- **Auth.js (NextAuth v5)** with credentials now; Keycloak OIDC/SAML in Phase 2 on the same session layer.
- **Meeting chrome** starts from `@livekit/components-react` and `livekit-client`. Layouts are replaced incrementally. Tokens are minted only with `livekit-server-sdk` on the server. `LIVEKIT_API_SECRET` never ships in the client bundle.
- **Realtime chat, hands, and reactions** use LiveKit data packets and participant metadata. Chat history is persisted in Postgres and loaded over REST.
- **Moderator actions** go through `RoomServiceClient` plus server-side role checks. Client grants are never trusted alone.
- **Docker Compose from day one:** LiveKit, Redis, Postgres, coturn, MinIO (chat files now, recordings later). Kubernetes/Helm is Phase 3.
- **Passwords** use Argon2id. LiveKit JWTs are short-lived and scope-based.

```text
Clients (Next.js web)
        │ HTTPS / WSS / WebRTC
        ▼
Edge (Nginx / Traefik)          ── optional in Phase 1; Compose ports are enough locally
        │
        ├── Next.js Route Handlers ── PostgreSQL, Redis, MinIO
        └── LiveKit SFU + coturn   ── Redis (LiveKit room state)
```

Proposed tree (all new except the existing spec):

- `apps/web/` — Next.js App Router, meeting UI, `/api/v1/*`
- `packages/shared/` — Zod schemas and shared types (`@sru/shared`)
- `infra/docker-compose.yml`, `infra/livekit.yaml`
- `apps/web/prisma/schema.prisma`

## Dependency Graph

```text
Compose + Prisma
    └── Auth
            └── Rooms CRUD
                    └── Token + Join A/V
                            ├── Screen share
                            ├── Chat (+ DM, files)
                            ├── Raise hand / reactions
                            └── Moderator
                                    └── Password / Lobby / join policy
```

Implementation order is bottom-up on this graph, then one vertical user path at a time.

## Task List

### Phase 0: Foundation

- [x] Task 1: Monorepo and Next.js scaffold
- [x] Task 2: Local media stack (Compose)
- [x] Task 3: Prisma core schema
- [x] Task 4: Shared API contracts
- [x] Task 5: CI quality gate
- [x] Task 6: LiveKit token helper and two-browser PoC
- [x] Task 7: OpenAPI skeleton
- [x] Task 8: App shell and design tokens

### Checkpoint: Foundation

- [x] Compose stack is healthy
- [x] Two-browser PoC works (see/hear each other)
- [x] CI is green
- [x] Review with human before auth and product UI

### Phase 1: Core MVP

- [x] Task 9: Local register and login
- [x] Task 10: Create, list, and close rooms
- [x] Task 11: Join meeting with camera and mic
- [x] Task 12: Grid, speaker, and sidebar layouts
- [x] Task 13: Screen sharing
- [x] Task 14: Public chat with history
- [x] Task 15: Private chat, emoji, mention
- [x] Task 16: Chat file attachments
- [x] Task 17: Raise hand queue
- [x] Task 18: Reactions
- [x] Task 19: Moderator media controls
- [x] Task 20: Moderator membership controls
- [x] Task 21: Room password
- [x] Task 22: Lobby and knocking
- [x] Task 23: Join policies
- [x] Task 24: MVP hardening and health

### Checkpoint: Core MVP

- [x] Two (ideally three) browsers: A/V, share, public and DM chat, hand, host mute/kick/end
- [x] Password and lobby work
- [x] CI green; Compose-only local run
- [x] Review with human before Phase 2

Saved 2026-08-31 as git tag `checkpoint/phase-1-mvp`. Two-browser A/V and password/lobby were verified in live meetings.

### Phase 2: Enterprise (S/M tasks — split 2026-08-31)

- [x] Task 25: Egress worker + recording schema (E2.1)
- [x] Task 26: Composite start/stop + PDPA consent (E2.1)
- [x] Task 27: Recording objects + signed download (E2.1)
- [x] Task 28: Track egress (E2.2)
- [x] Task 29: HLS VOD playback (E2.2)
- [x] Task 30: Org RBAC (E2.5)
- [x] Task 31: OIDC SSO + JIT + role mapping (E2.3)
- [x] Task 32: SAML 2.0 (E2.3)
- [x] Task 33: LDAP / Active Directory bind (E2.4)
- [x] Task 34: API keys + HMAC (E2.6)
- [x] Task 35: Per-key rate limit (E2.6)
- [x] Task 36: Swagger UI (E2.6)
- [x] Task 37: Signed webhooks + retry tick (E2.7)
- [x] Task 38: Admin dashboard (E2.8)
- [x] Task 39: PWA + mobile web + 4G defaults (E2.9)
- [x] Task 40: Audit log + retention + deletion (E2.10)

### Checkpoint: Pilot

- [ ] Small-org pilot is usable (not production scale)
- [x] Review with human before Phase 3

### Phase 3: Advanced and scale (S/M tasks — split 2026-08-31)

- [x] Task 41: Breakout schema + contracts (E3.1)
- [x] Task 42: Create/list/close breakout API (E3.1)
- [x] Task 43: Child token mint + assignment gate (E3.1)
- [x] Task 44: Host breakout panel + participant move (E3.1)
- [x] Task 45: Timer, broadcast, help, recall-all (E3.1)
- [x] Task 46: Self-pick + moderator roam + pre-warm (E3.1)
- [x] Task 47: Stream model + RTMP start/stop + consent (E3.2)
- [x] Task 48: Multi-destination + HLS live playlist (E3.2)
- [x] Task 49: Stream banner + org HLS player (E3.2)
- [x] Task 50: Embed package + iframe page (E3.6)
- [x] Task 51: postMessage handshake + origin allowlist (E3.6)
- [x] Task 52: Helm chart for web/Postgres/Redis/MinIO (E3.4)
- [ ] Task 53: LiveKit + coturn + egress Helm + air-gap (E3.4)
- [ ] Task 54: Load-test runner against Compose (E3.5)
- [ ] Task 55: 500-concurrent + TURN/4G runbook (E3.5)
- [ ] Task 56: Expo app joins with a minted token (E3.3)
- [ ] Task 57: Native grid + mute (E3.3)
- [ ] Task 58: PiP + background audio (E3.3)
- [ ] Task 59: CallKit / ConnectionService + push (E3.3)

### Checkpoint: Production 1.0

- [ ] Pen-test and load-test gates passed
- [ ] Ready for Production Release 1.0 review

---

## Phase 0 — Foundation (detailed tasks)

## Task 1: Monorepo and Next.js scaffold

**Description:** Create the pnpm workspace, a Next.js 15 TypeScript app in `apps/web`, ESLint, and typed env placeholders so later tasks have a package graph that installs and builds. The app can render a placeholder page; it does not talk to LiveKit yet.

**Acceptance criteria:**

- [ ] `pnpm --filter web build` succeeds
- [ ] Shared package is importable as `@sru/shared`
- [ ] `.env.example` lists `DATABASE_URL`, `LIVEKIT_*`, and `AUTH_SECRET` with no real secrets committed

**Verification:**

- [ ] Tests pass: none required beyond workspace scripts existing
- [ ] Build succeeds: `pnpm install` then `pnpm --filter web typecheck` and `pnpm --filter web build`
- [ ] Manual check: open the default Next.js page via `pnpm --filter web dev`

**Dependencies:** None

**Files likely touched:**

- `package.json`
- `pnpm-workspace.yaml`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/app/layout.tsx`
- `.env.example`

**Estimated scope:** Medium: 3-5 files

## Task 2: Local media stack (Compose)

**Description:** Add a one-command local stack (LiveKit, Redis, Postgres, coturn, MinIO) and document the ports Windows Docker Desktop must expose. This is the media and data plane every later task assumes is running.

**Acceptance criteria:**

- [ ] `docker compose -f infra/docker-compose.yml up -d` reaches a healthy state
- [ ] LiveKit HTTP health endpoint responds
- [ ] `infra/README.md` covers Windows Docker Desktop, UDP 50000–60000, TCP 443, and TURN 3478/5349

**Verification:**

- [ ] Tests pass: not applicable (infra)
- [ ] Build succeeds: `docker compose -f infra/docker-compose.yml ps` shows healthy services
- [ ] Manual check: `curl` the LiveKit health endpoint

**Dependencies:** Task 1

**Files likely touched:**

- `infra/docker-compose.yml`
- `infra/livekit.yaml`
- `infra/README.md`

**Estimated scope:** Small: 1-2 files

## Task 3: Prisma core schema

**Description:** Introduce Prisma with `User`, `Room`, and `RoomParticipant` (role, ban flag, lobby status) and apply the first migration against Compose Postgres. Later features add tables in their own tasks.

**Acceptance criteria:**

- [ ] `pnpm prisma migrate dev` (from the web package) applies on Compose Postgres
- [ ] Roles include host, cohost, and participant
- [ ] Lobby status includes pending, admitted, and denied

**Verification:**

- [ ] Tests pass: not required
- [ ] Build succeeds: migrate completes without error
- [ ] Manual check: `prisma studio` shows the three tables

**Dependencies:** Task 2

**Files likely touched:**

- `apps/web/prisma/schema.prisma`
- `apps/web/prisma/migrations/` (first migration)
- `apps/web/lib/db.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 1-3

- [ ] Workspace installs and the web app builds
- [ ] Compose Postgres accepts a Prisma migration
- [ ] Review with human if migrate or UDP ports fail on Windows

## Task 4: Shared API contracts

**Description:** Add Zod schemas and TypeScript types for User, Room, token request/response, and ChatMessage in `packages/shared`. Route Handlers and UI must import these types instead of declaring a second Room shape.

**Acceptance criteria:**

- [ ] Invalid create-room payload fails Zod parse
- [ ] `apps/web` imports Room and token types from `@sru/shared` only

**Verification:**

- [ ] Tests pass: `pnpm --filter shared test` (one or two schema tests)
- [ ] Build succeeds: `pnpm --filter web typecheck`
- [ ] Manual check: not required

**Dependencies:** Task 1

**Files likely touched:**

- `packages/shared/src/room.ts`
- `packages/shared/src/auth.ts`
- `packages/shared/src/index.ts`
- `packages/shared/package.json`

**Estimated scope:** Small: 1-2 files

## Task 5: CI quality gate

**Description:** Add a PR workflow that runs lint, typecheck, and unit tests. The workflow must not require LiveKit or Docker so it stays cheap and deterministic.

**Acceptance criteria:**

- [ ] PR workflow fails on a TypeScript error
- [ ] Workflow jobs do not start LiveKit or Compose

**Verification:**

- [ ] Tests pass: the same scripts the workflow runs pass locally
- [ ] Build succeeds: workflow file is valid YAML
- [ ] Manual check: workflow file exists at `.github/workflows/ci.yml` (swap host if the remote is not GitHub)

**Dependencies:** Tasks 1, 4

**Files likely touched:**

- `.github/workflows/ci.yml`
- `package.json` (root scripts)

**Estimated scope:** Small: 1-2 files

## Task 6: LiveKit token helper and two-browser PoC

**Description:** Mint short-lived LiveKit JWTs on the server and ship a `/dev/poc` page with `@livekit/components-react`. This is the fail-fast media path: two browsers must see and hear each other on the Compose stack before product auth exists.

**Acceptance criteria:**

- [ ] Two browsers join the same room and see/hear each other on the Compose stack
- [ ] `LIVEKIT_API_SECRET` is not present in any client bundle
- [ ] Token TTL is measured in minutes, not days

**Verification:**

- [ ] Tests pass: `pnpm --filter web test` covers grant-building
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: two-browser join on `/dev/poc` against local LiveKit

**Dependencies:** Tasks 2, 3, 4

**Files likely touched:**

- `apps/web/lib/livekit/token.ts`
- `apps/web/app/api/v1/dev/token/route.ts`
- `apps/web/app/dev/poc/page.tsx`
- `apps/web/lib/livekit/token.test.ts`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 4-6

- [ ] Shared package tests pass
- [ ] CI workflow exists and local lint/typecheck/test pass
- [ ] Two-browser PoC works
- [ ] Review with human before OpenAPI and product chrome

## Task 7: OpenAPI skeleton

**Description:** Publish an OpenAPI 3 document for the Phase 1 HTTP surface (rooms, tokens, participants). Serve it at `/api/v1/openapi.json`. Swagger UI waits until Phase 2.

**Acceptance criteria:**

- [ ] Spec lists `POST /api/v1/rooms`, `GET /api/v1/rooms`, `GET /api/v1/rooms/{id}`, `DELETE /api/v1/rooms/{id}`, and `POST /api/v1/rooms/{id}/tokens`
- [ ] Schema names match the Zod names from Task 4

**Verification:**

- [ ] Tests pass: spec validates as OpenAPI 3 (CLI or unit assertion)
- [ ] Build succeeds: `pnpm --filter web build` if the route is in the app
- [ ] Manual check: `GET /api/v1/openapi.json` returns JSON

**Dependencies:** Task 4

**Files likely touched:**

- `packages/shared/openapi/v1.yaml`
- `apps/web/app/api/v1/openapi.json/route.ts`

**Estimated scope:** Small: 1-2 files

## Task 8: App shell and design tokens

**Description:** Add a logged-out landing page, an authenticated app shell with a nav placeholder, and a single token module for typography, color, and spacing. No meeting chrome yet.

**Acceptance criteria:**

- [ ] `/` and `/app` render without layout shift on a desktop width
- [ ] Tokens live in one CSS or TS module that later pages can reuse

**Verification:**

- [ ] Tests pass: not required
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: open `/` and `/app` in the browser

**Dependencies:** Task 1

**Files likely touched:**

- `apps/web/app/page.tsx`
- `apps/web/app/app/layout.tsx`
- `apps/web/app/globals.css`

**Estimated scope:** Small: 1-2 files

## Checkpoint: Foundation (after Tasks 7-8)

- [ ] All Phase 0 tests and builds pass
- [ ] Compose stack healthy and two-browser PoC still works
- [ ] OpenAPI skeleton is reachable
- [ ] Review with human before Task 9 (auth)

---

## Phase 1 — Core MVP (detailed tasks)

## Task 9: Local register and login

**Description:** Users can register, log in, keep a session, and log out via Auth.js credentials. Passwords are hashed with Argon2id. Unauthenticated visits to `/app` redirect to login.

**Acceptance criteria:**

- [ ] A new user can register and land on `/app`
- [ ] A bad password is rejected and the session cookie is httpOnly
- [ ] An unauthenticated request to `/app` redirects to login

**Verification:**

- [ ] Tests pass: unit tests for password hash and verify
- [ ] Build succeeds: `pnpm --filter web typecheck` and `pnpm --filter web build`
- [ ] Manual check: register → logout → login

**Dependencies:** Tasks 3, 5, 8

**Files likely touched:**

- `apps/web/lib/auth.ts`
- `apps/web/app/api/auth/[...nextauth]/route.ts`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/register/page.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 10: Create, list, and close rooms

**Description:** A signed-in host can create a room, see rooms they own or were admitted to, and close a room they own. Rows live in Postgres. Creating the LiveKit room via RoomService is optional in this task if token mint in Task 11 can create-on-join.

**Acceptance criteria:**

- [ ] `POST /api/v1/rooms` creates a row owned by the session user
- [ ] List shows only rooms the user may see (owner or admitted)
- [ ] `DELETE /api/v1/rooms/{id}` ends the room for the owner

**Verification:**

- [ ] Tests pass: API tests with a test session for create, list, and delete
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: UI create → list → close

**Dependencies:** Tasks 4, 7, 9

**Files likely touched:**

- `apps/web/app/api/v1/rooms/route.ts`
- `apps/web/app/api/v1/rooms/[id]/route.ts`
- `apps/web/app/app/rooms/page.tsx`
- `apps/web/lib/rooms.ts`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 9-10

- [ ] Register, login, and session work
- [ ] Host can create and close a room from the UI
- [ ] Review with human before the product join path

## Task 11: Join meeting with camera and mic

**Description:** Product join path: pre-join device check, `POST /api/v1/rooms/{id}/tokens` (session + room policy), LiveKit connect, publish/subscribe audio and video, mute/unmute, and a clean leave.

**Acceptance criteria:**

- [ ] Join on local LAN feels under 3 seconds
- [ ] Token grants match role (a participant does not receive `roomAdmin` unless host or cohost)
- [ ] User can mute and unmute camera and mic; leave disconnects cleanly

**Verification:**

- [ ] Tests pass: unit tests for token grants by role
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: two logged-in users in one room with camera and mic

**Dependencies:** Tasks 6, 10

**Files likely touched:**

- `apps/web/app/api/v1/rooms/[id]/tokens/route.ts`
- `apps/web/app/app/rooms/[id]/page.tsx`
- `apps/web/components/meeting/Prejoin.tsx`
- `apps/web/components/meeting/MeetingRoom.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 12: Grid, speaker, and sidebar layouts

**Description:** Offer grid, speaker, and sidebar layouts. Speaker view follows the active speaker from audio levels. Switching layout must not reconnect the LiveKit room.

**Acceptance criteria:**

- [ ] User can switch layout without reconnecting
- [ ] Speaker view follows the active speaker
- [ ] Two to nine tiles remain usable on desktop

**Verification:**

- [ ] Tests pass: not required beyond existing suite
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: switch layouts with two or more participants

**Dependencies:** Task 11

**Files likely touched:**

- `apps/web/components/meeting/layouts/GridView.tsx`
- `apps/web/components/meeting/layouts/SpeakerView.tsx`
- `apps/web/components/meeting/layouts/SidebarView.tsx`
- `apps/web/components/meeting/LayoutSwitcher.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 13: Screen sharing

**Description:** Publish a screen track separate from the camera via `getDisplayMedia` / LiveKit screen share. Chromium may include system audio. Browsers without the API show an explicit unsupported state.

**Acceptance criteria:**

- [ ] Others see camera and screen at the same time
- [ ] Stop share removes only the screen track
- [ ] UI states that sharing is unavailable when the API is missing (Safari / iOS)

**Verification:**

- [ ] Tests pass: not required
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: Chrome share visible in a second browser; Safari shows the fallback

**Dependencies:** Task 11

**Files likely touched:**

- `apps/web/components/meeting/ScreenShareButton.tsx`
- `apps/web/lib/livekit/screen-share.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 11-13

- [x] Two users join with A/V, switch layouts, and share a screen
- [x] Token grant tests pass
- [ ] Review with human before chat

## Task 14: Public chat with history

**Description:** Room-wide messages travel on the LiveKit data channel and persist as `ChatMessage`. Joining loads history over REST. Room may store a retention-days field; a deletion job waits until Phase 2.

**Acceptance criteria:**

- [ ] Messages appear for all in-room clients without refresh
- [ ] Rejoin shows history from Postgres
- [ ] Empty and long-list states work

**Verification:**

- [ ] Tests pass: one API test for message create/list
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: send/receive in two browsers; history remains after reload

**Dependencies:** Tasks 3, 11 (ChatMessage schema is added in this task)

**Files likely touched:**

- `apps/web/prisma/schema.prisma`
- `apps/web/app/api/v1/rooms/[id]/messages/route.ts`
- `apps/web/components/meeting/ChatPanel.tsx`
- `apps/web/lib/chat.ts`

**Estimated scope:** Medium: 3-5 files

## Task 15: Private chat, emoji, mention

**Description:** Direct messages use a targeted data packet and a persisted row visible only to the two parties. Emoji are allowed. `@name` highlights a present participant. There is no notification service yet.

**Acceptance criteria:**

- [ ] A DM is not visible to a third participant
- [ ] Server rejects a DM if the sender is not in the room
- [ ] Mention of a present participant is highlighted

**Verification:**

- [ ] Tests pass: API test that a third user cannot read a DM
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: three-browser test (A→B hidden from C)

**Dependencies:** Task 14

**Files likely touched:**

- `apps/web/lib/chat.ts`
- `apps/web/components/meeting/ChatPanel.tsx`
- `apps/web/app/api/v1/rooms/[id]/messages/route.ts`

**Estimated scope:** Medium: 3-5 files

## Task 16: Chat file attachments

**Description:** Upload an image or PDF to MinIO, store the object key on the chat message, and issue a short-lived signed download URL. This is the first Phase 1 task to drop if a sprint slips.

**Acceptance criteria:**

- [ ] Image or PDF under the size cap uploads and can be displayed or downloaded
- [ ] The bucket is not world-listable
- [ ] Signed URL expires

**Verification:**

- [ ] Tests pass: reject oversized upload
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: upload in one browser; second user downloads

**Dependencies:** Tasks 2, 14

**Files likely touched:**

- `apps/web/lib/storage.ts`
- `apps/web/app/api/v1/rooms/[id]/attachments/route.ts`
- `apps/web/components/meeting/ChatPanel.tsx` (attach control)

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 14-16

- [ ] Public chat, DM, and (if kept) attachments work
- [ ] History survives reload
- [ ] Review with human before hands and reactions

## Task 17: Raise hand queue

**Description:** Hand state lives in participant metadata and syncs through the SFU. The host sees a FIFO queue by timestamp. Lowering the hand removes the user from the queue.

**Acceptance criteria:**

- [ ] Raise and lower are realtime for everyone
- [ ] Host sees a FIFO queue
- [ ] Lowering removes the user from the queue

**Verification:**

- [ ] Tests pass: not required
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: two participants raise; host sees order

**Dependencies:** Task 11

**Files likely touched:**

- `apps/web/lib/livekit/metadata.ts`
- `apps/web/components/meeting/RaiseHand.tsx`
- `apps/web/components/meeting/HandQueue.tsx`

**Estimated scope:** Small: 1-2 files

## Task 18: Reactions

**Description:** Ephemeral reactions (thumbs, heart, laugh, clap) travel on data packets, auto-dismiss in 5 seconds, and are not stored as chat rows.

**Acceptance criteria:**

- [ ] Others see the reaction overlay
- [ ] Overlay disappears by 5 seconds
- [ ] No `ChatMessage` row is created

**Verification:**

- [ ] Tests pass: not required
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: send a reaction; confirm dismiss and no new DB row

**Dependencies:** Task 11

**Files likely touched:**

- `apps/web/components/meeting/Reactions.tsx`
- `apps/web/lib/livekit/reactions.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 17-18

- [ ] Hands and reactions work without reconnect
- [ ] Application still builds
- [ ] Review with human before moderator APIs

## Task 19: Moderator media controls

**Description:** Host and cohost can mute a participant, mute all (except themselves), disable a camera, and spotlight or pin via RoomService. Every action is authorized on the server.

**Acceptance criteria:**

- [ ] A participant calling these APIs receives 403
- [ ] Mute-all mutes everyone except the actor
- [ ] Spotlight is visible to all clients

**Verification:**

- [ ] Tests pass: host vs participant API tests
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: two-browser mute and spotlight

**Dependencies:** Task 11

**Files likely touched:**

- `apps/web/lib/moderation.ts`
- `apps/web/app/api/v1/rooms/[id]/moderation/route.ts`
- `apps/web/components/meeting/ModerationBar.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 20: Moderator membership controls

**Description:** Host and cohost can kick, ban (no rejoin), promote or demote a cohost, lock the room, end the meeting for everyone, and allow or deny screen share and chat. Flags are enforced on token grants and on chat POST.

**Acceptance criteria:**

- [ ] A banned user cannot mint a token
- [ ] A locked room rejects new joins
- [ ] End meeting disconnects everyone and marks the room finished
- [ ] Share and chat flags are enforced on token grants and chat POST

**Verification:**

- [ ] Tests pass: API tests for ban, lock, and end
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: kick a second user from the UI

**Dependencies:** Tasks 10, 19

**Files likely touched:**

- `apps/web/lib/moderation.ts`
- `apps/web/lib/rooms.ts`
- `apps/web/app/api/v1/rooms/[id]/moderation/route.ts`
- `apps/web/components/meeting/ParticipantList.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 21: Room password

**Description:** Optional room password, hashed with Argon2id, checked before a LiveKit JWT is issued. Host can set, change, or remove it. Plaintext never hits logs or storage.

**Acceptance criteria:**

- [ ] A wrong password never returns a LiveKit JWT
- [ ] Host can set, change, and remove the password
- [ ] Password is never stored or logged in plaintext

**Verification:**

- [ ] Tests pass: hash unit test; token route rejects wrong password
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: join with wrong password, then right password

**Dependencies:** Task 11

**Files likely touched:**

- `apps/web/lib/rooms.ts`
- `apps/web/app/api/v1/rooms/[id]/tokens/route.ts`
- `apps/web/components/meeting/RoomSettings.tsx`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 19-21

- [ ] Moderator media and membership APIs reject participants
- [ ] Room password blocks token mint
- [ ] Review with human before lobby

## Task 22: Lobby and knocking

**Description:** When the lobby is on, joiners stay `pending` until a host or cohost admits or denies them. Moderators get a realtime knock. Admitted users enter the existing room without recreating it.

**Acceptance criteria:**

- [ ] A pending user has no media in the meeting room
- [ ] Admit lets them in without recreating the room
- [ ] Deny rejects further token mint until a new request (document the policy in the PR or `infra/README.md`)

**Verification:**

- [ ] Tests pass: lobby admit/deny API tests
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: third user waits; host admits; denied user cannot publish

**Dependencies:** Tasks 3, 11, 20

**Files likely touched:**

- `apps/web/lib/lobby.ts`
- `apps/web/app/api/v1/rooms/[id]/lobby/route.ts`
- `apps/web/components/meeting/LobbyGate.tsx`
- `apps/web/components/meeting/WaitingRoom.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 23: Join policies

**Description:** Optional “signed-in only” and allowed email-domain list, evaluated at token mint. Guest links work only when the room allows guests. Settings are visible on the room settings page.

**Acceptance criteria:**

- [ ] Domain policy rejects `user@other.com` when the allow-list does not include that domain
- [ ] Guest link works only when policies allow guests
- [ ] Policy is shown on the room settings page

**Verification:**

- [ ] Tests pass: unit tests for the policy helper
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: one UI pass of settings + rejected guest

**Dependencies:** Tasks 9, 21

**Files likely touched:**

- `apps/web/lib/join-policy.ts`
- `apps/web/app/api/v1/rooms/[id]/tokens/route.ts`
- `apps/web/components/meeting/RoomSettings.tsx`

**Estimated scope:** Small: 1-2 files

## Task 24: MVP hardening and health

**Description:** Add `/api/health` (app plus optional LiveKit ping), meeting empty/error/reconnect copy, a default `maxParticipants` of 25, and basic request logging that does not print secrets.

**Acceptance criteria:**

- [ ] Health endpoint is unauthenticated and does not leak secrets
- [ ] After a DevTools offline toggle, the client reconnects or shows a clear error
- [ ] The 26th join is rejected when the cap is 25

**Verification:**

- [ ] Tests pass: cap test; health handler does not include env secrets
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: `curl` health; toggle network during a meeting

**Dependencies:** Tasks 11–23

**Files likely touched:**

- `apps/web/app/api/health/route.ts`
- `apps/web/components/meeting/MeetingErrorState.tsx`
- `apps/web/lib/rooms.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: Phase 1 MVP (after Tasks 22-24)

- [x] All Phase 1 tests pass and the web app builds
- [x] Two (ideally three) browsers: A/V, share, public and DM chat, hand, host mute/kick/end
- [x] Password and lobby work
- [x] Compose-only local run; CI green
- [x] Review with human before any Phase 2 epic

Saved 2026-08-31 as git tag `checkpoint/phase-1-mvp`. Two-browser A/V and password/lobby were verified in live meetings.

---

## Phase 2 — Enterprise (S/M tasks)

Split on 2026-08-31. Dependencies assume Phase 1 MVP is done. Implement in task number order except where Parallelization allows.

### Task 25: Egress worker + recording schema

**Description:** Isolated LiveKit Egress Compose service (never on the SFU container) and Prisma models for recordings and consent. No product start API yet.

**Acceptance criteria:**

- [ ] `docker compose -f infra/docker-compose.yml up -d` includes a healthy `egress` service with `cap_add: SYS_ADMIN` and its own Redis connection
- [ ] Prisma has `Recording` and `RecordingConsent` with composite/tracks modes and consent status
- [ ] Egress config writes to MinIO via the Compose network, not the SFU process

**Verification:**

- [ ] Tests pass: existing suite
- [ ] Build succeeds: `pnpm --filter web typecheck`
- [ ] Manual check: `docker compose -f infra/docker-compose.yml ps` shows egress

**Dependencies:** Tasks 2, 10, 24

**Files likely touched:** `infra/docker-compose.yml`, `infra/egress.yaml`, `apps/web/prisma/schema.prisma`

**Estimated scope:** Medium: 3-5 files

### Task 26: Composite start/stop + PDPA consent

**Description:** Host/cohost can request a composite recording. Status stays `pending_consent` until every admitted participant consents. Then Egress RoomComposite starts. Everyone sees a banner before media is written.

**Acceptance criteria:**

- [ ] `POST /api/v1/rooms/{id}/recording` from a participant returns 403
- [ ] Egress is not started until all admitted participants have a consent row
- [ ] In-room clients see a consent banner from room metadata without refresh

**Verification:**

- [ ] Tests pass: consent gate + 403 tests
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: host requests record; second user must consent before status is active

**Dependencies:** Task 25

**Files likely touched:** `apps/web/lib/recording.ts`, `apps/web/app/api/v1/rooms/[id]/recording/route.ts`, `apps/web/components/meeting/RecordingConsent.tsx`

**Estimated scope:** Medium: 3-5 files

### Task 27: Recording objects + signed download

**Description:** Persist object keys when egress finishes. Owners and org admins get short-lived signed download URLs. Bucket is not world-listable.

**Acceptance criteria:**

- [ ] `GET /api/v1/recordings/{id}` returns metadata without a permanent public URL
- [ ] Download URL expires (same cap as chat attachments or shorter)
- [ ] A non-member cannot download

**Verification:**

- [ ] Tests pass: authorization + expiry helper
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: signed URL retrieves an object from MinIO after a finished fixture

**Dependencies:** Task 26

**Files likely touched:** `apps/web/lib/storage.ts`, `apps/web/app/api/v1/recordings/[id]/route.ts`

**Estimated scope:** Small: 1-2 files

### Task 28: Track egress

**Description:** Per-track egress for post-production. Same consent gate as composite.

**Acceptance criteria:**

- [ ] `POST` with `mode: tracks` and `trackIds` starts one egress per track after consent
- [ ] Stop ends every child egress for that recording row

**Verification:**

- [ ] Tests pass: track-mode starts N egress calls
- [ ] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Task 26

**Files likely touched:** `apps/web/lib/recording.ts`, `apps/web/lib/egress.ts`

**Estimated scope:** Small: 1-2 files

### Task 29: HLS VOD playback

**Description:** Composite also writes HLS segments. In-product player plays the playlist through an authenticated media proxy.

**Acceptance criteria:**

- [ ] Finished composite recordings expose an HLS playlist path
- [ ] `/app/recordings/{id}` plays VOD for an authorized viewer
- [ ] Unauthenticated media proxy requests are rejected

**Verification:**

- [ ] Tests pass: playlist key helper
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: open the player page for a finished recording fixture

**Dependencies:** Task 27

**Files likely touched:** `apps/web/components/vod/HlsPlayer.tsx`, `apps/web/app/app/recordings/[id]/page.tsx`

**Estimated scope:** Medium: 3-5 files

### Task 30: Org RBAC

**Description:** Org roles `org_admin`, `host`, and `participant` sit above per-room roles. Existing users default to `host` so Phase 1 create-room still works. Participants cannot create rooms. Org admins reach `/app/admin`.

**Acceptance criteria:**

- [ ] A `participant` org role receives 403 on `POST /api/v1/rooms`
- [ ] A `host` can still create rooms
- [ ] Admin routes require `org_admin`

**Verification:**

- [ ] Tests pass: `pnpm --filter web test` covers `canCreateRoom` / `isOrgAdmin`
- [ ] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Task 9

**Files likely touched:** `apps/web/lib/rbac.ts`, `apps/web/prisma/schema.prisma`, `apps/web/app/api/v1/rooms/route.ts`

**Estimated scope:** Small: 1-2 files

### Task 31: OIDC SSO + JIT + role mapping

**Description:** Auth.js providers for Keycloak, Entra ID, Google Workspace, and Okta when env vars are set. First login JIT-creates a user. IdP groups map to org roles.

**Acceptance criteria:**

- [ ] Missing provider env hides that button
- [ ] JIT creates a user with `passwordHash` null
- [ ] Mapped group `IT-Admin` becomes `org_admin`

**Verification:**

- [ ] Tests pass: role-map unit tests
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: login page shows configured providers only

**Dependencies:** Tasks 9, 30

**Files likely touched:** `apps/web/lib/auth.ts`, `apps/web/lib/sso.ts`, `apps/web/app/(auth)/login/page.tsx`

**Estimated scope:** Medium: 3-5 files

### Task 32: SAML 2.0

**Description:** SP-initiated SAML 2.0 redirect and ACS. JIT + the same role map as OIDC.

**Acceptance criteria:**

- [ ] `/api/auth/saml` redirects to the IdP when SAML env is set
- [ ] ACS rejects a response that fails signature validation
- [ ] Successful ACS establishes an Auth.js session

**Verification:**

- [ ] Tests pass: ACS reject-invalid helper
- [ ] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Task 31

**Files likely touched:** `apps/web/lib/saml.ts`, `apps/web/app/api/auth/saml/route.ts`

**Estimated scope:** Medium: 3-5 files

### Task 33: LDAP / Active Directory

**Description:** Bind/search against LDAP or AD and JIT a user. For orgs without OIDC.

**Acceptance criteria:**

- [ ] Successful bind signs the user in
- [ ] Failed bind does not create a session
- [ ] `memberOf` maps through the same role helper as SSO

**Verification:**

- [ ] Tests pass: filter interpolation + role map
- [ ] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Task 31

**Files likely touched:** `apps/web/lib/ldap.ts`, `apps/web/lib/auth.ts`

**Estimated scope:** Medium: 3-5 files

### Task 34: API keys + HMAC

**Description:** Users mint an API key. External callers send key id, timestamp, and HMAC-SHA256 of the canonical request. Session cookies still work for the browser.

**Acceptance criteria:**

- [ ] Secret is shown only once at creation and stored encrypted
- [ ] Clock skew beyond 5 minutes is rejected
- [ ] A wrong signature never mutates rooms

**Verification:**

- [ ] Tests pass: sign/verify + skew
- [ ] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Tasks 7, 10

**Files likely touched:** `apps/web/lib/hmac.ts`, `apps/web/lib/api-keys.ts`, `apps/web/lib/api-auth.ts`

**Estimated scope:** Medium: 3-5 files

### Task 35: Per-key rate limit

**Description:** Sliding-window limit per API key.

**Acceptance criteria:**

- [ ] Exceeding the window returns 429
- [ ] Session cookie traffic is not limited by this key window

**Verification:**

- [ ] Tests pass: window overflow
- [ ] Build succeeds: `pnpm --filter web test`

**Dependencies:** Task 34

**Files likely touched:** `apps/web/lib/rate-limit.ts`

**Estimated scope:** Small: 1-2 files

### Task 36: Swagger UI

**Description:** Browse the OpenAPI 3 document in Swagger UI.

**Acceptance criteria:**

- [ ] `/api/v1/docs` (or `/docs`) renders Swagger UI against `/api/v1/openapi.json`
- [ ] Spec lists recording, keys, and webhook paths added in Phase 2

**Verification:**

- [ ] Tests pass: OpenAPI includes the new paths
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: open the docs page

**Dependencies:** Task 7, Task 34

**Files likely touched:** `packages/shared/openapi/v1.yaml`, `apps/web/app/docs/page.tsx`

**Estimated scope:** Small: 1-2 files

### Task 37: Signed webhooks

**Description:** Org-configured endpoints receive signed HTTP posts for room, participant, and recording events. A tick route retries failed deliveries.

**Acceptance criteria:**

- [ ] Body is signed with `X-SRU-Signature: sha256=<hex>`
- [ ] Production rejects non-HTTPS and private-IP destinations (SSRF)
- [ ] Failed deliveries retry with backoff

**Verification:**

- [ ] Tests pass: signature + URL allowlist
- [ ] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Tasks 34, 26

**Files likely touched:** `apps/web/lib/webhooks.ts`, `apps/web/app/api/internal/webhooks/tick/route.ts`

**Estimated scope:** Medium: 3-5 files

### Task 38: Admin dashboard

**Description:** Org-admin UI for users, rooms, recordings, and retention/SSO config.

**Acceptance criteria:**

- [ ] Non-admins hitting `/app/admin` are forbidden
- [ ] Admin can list users/rooms/recordings and set retention days
- [ ] Uses the same tokens as the rest of the app

**Verification:**

- [ ] Tests pass: admin API 403
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: open `/app/admin` as org_admin

**Dependencies:** Tasks 30, 27

**Files likely touched:** `apps/web/app/app/admin/page.tsx`, `apps/web/components/admin/AdminDashboard.tsx`

**Estimated scope:** Medium: 3-5 files

### Task 39: PWA + mobile web + 4G defaults

**Description:** Installable PWA, usable mobile meeting chrome, and lower publish defaults when the network reports 4G or save-data.

**Acceptance criteria:**

- [ ] `manifest.webmanifest` + service worker register
- [ ] Meeting bar and panels remain usable at a 390px width
- [ ] 4G / save-data uses a 360p camera preset

**Verification:**

- [ ] Tests pass: encoding helper
- [ ] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: docs page + meeting chrome at a narrow viewport

**Dependencies:** Tasks 11–13

**Files likely touched:** `apps/web/app/manifest.ts`, `apps/web/public/sw.js`, `apps/web/lib/livekit/connect-options.ts`

**Estimated scope:** Medium: 3-5 files

### Task 40: Audit log + retention + deletion

**Description:** Audit moderator and admin actions. Retention job deletes expired chat and recordings. `DELETE /api/v1/me` honors PDPA deletion.

**Acceptance criteria:**

- [ ] Mute/kick/ban/end and admin writes create an `AuditLog` row
- [ ] Retention deletes chat older than `chatRetentionDays` and recordings older than org policy
- [ ] User deletion anonymizes PII and revokes API keys; it does not leak other users' DMs

**Verification:**

- [ ] Tests pass: audit write, retention filter, deletion
- [ ] Build succeeds: `pnpm --filter web build`

**Dependencies:** Tasks 19–20, 27, 30

**Files likely touched:** `apps/web/lib/audit.ts`, `apps/web/lib/retention.ts`, `apps/web/lib/deletion.ts`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Phase 2

- [x] Each started epic has been split into S/M tasks and those tasks meet their criteria
- [ ] Small-org pilot is usable
- [x] Review with human before Phase 3

---

## Phase 3 — Advanced and scale (S/M tasks)

Split on 2026-08-31. Child breakouts are real `Room` rows with `parentRoomId`, grouped by `BreakoutSession`. Streaming reuses the isolated egress worker. Embed depends on API keys (Task 34). Helm does not replace Compose. WHEP / LL-HLS stays parked. Room cap stays 25. Native is last; CallKit/push need signing and will not ship from CI.

### Task 41: Breakout schema + contracts

**Description:** Prisma `parentRoomId` on `Room`, plus `BreakoutSession` and `BreakoutAssignment`. Shared Zod and an OpenAPI stub for `POST /api/v1/rooms/{id}/breakouts`. No HTTP product routes yet. A child room cannot host breakouts.

**Acceptance criteria:**

- [x] `Room.parentRoomId` is a self-relation; `BreakoutSession` has `parentRoomId`, `status`, `assignmentMode`, `endsAt`
- [x] `BreakoutAssignment` uniquely pairs `(sessionId, userId)` with a `childRoomId`
- [x] Shared Zod rejects an empty create-breakouts payload; OpenAPI lists `POST /api/v1/rooms/{id}/breakouts`

**Verification:**

- [x] Tests pass: `pnpm --filter @sru/shared test` and `pnpm --filter web test` cover parent-must-be-top-level
- [x] Build succeeds: `pnpm --filter web typecheck`
- [x] Manual check: `pnpm --filter web prisma migrate deploy` against Compose Postgres

**Dependencies:** Tasks 3, 10

**Files likely touched:** `apps/web/prisma/schema.prisma`, `packages/shared/src/breakout.ts`, `packages/shared/openapi/v1.yaml`, `apps/web/lib/breakouts.ts`

**Estimated scope:** Medium: 3-5 files

### Task 42: Create/list/close breakout API

**Description:** Host/cohost can open a breakout round on a parent room (`auto` or `manual`). Creates child `Room` rows that inherit `ownerId`. Closing the session marks children finished. Parent close cascades. No lobby/password on children.

**Acceptance criteria:**

- [x] `POST /api/v1/rooms/{id}/breakouts` as a participant returns 403
- [x] `GET` returns the open session and child room ids
- [x] `DELETE` closes the session and child rooms; a child id cannot host a nested round

**Verification:**

- [x] Tests pass: create/list/close + 403
- [x] Build succeeds: `pnpm --filter web test`

**Dependencies:** Task 41, Tasks 19–20

**Files likely touched:** `apps/web/lib/breakouts.ts`, `apps/web/app/api/v1/rooms/[id]/breakouts/route.ts`

**Estimated scope:** Medium: 3-5 files

### Task 43: Child token mint + assignment gate

**Description:** Mint a LiveKit token for a child room only if the caller is assigned or is a moderator of the parent. Create the LiveKit room for each child. Unassigned participants are rejected.

**Acceptance criteria:**

- [x] Assigned participant receives a token for their child `Room.id`
- [x] Unassigned participant receives 403
- [x] Parent host/cohost can mint for a child they roam into (full roam is Task 46; this task allows assigned + parent moderator)

**Verification:**

- [x] Tests pass: assigned vs unassigned mint
- [x] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Tasks 11, 42

**Files likely touched:** `apps/web/lib/tokens.ts`, `apps/web/lib/breakouts.ts`, `apps/web/app/api/v1/rooms/[id]/tokens/route.ts`

**Estimated scope:** Medium: 3-5 files

### Task 44: Host breakout panel + participant move

**Description:** Meeting chrome for the parent host: create/assign breakouts. Participants see which child they were assigned and a control to join it.

**Acceptance criteria:**

- [x] Host can open breakouts from the meeting UI without leaving the parent
- [x] Assigned participant sees their child room and can join
- [x] Same tokens and design tokens as the rest of the app

**Verification:**

- [x] Tests pass: existing suite
- [x] Build succeeds: `pnpm --filter web build`
- [ ] Manual check: two-browser assign and join

**Dependencies:** Task 43

**Files likely touched:** `apps/web/components/meeting/BreakoutPanel.tsx`, `apps/web/components/meeting/MeetingChrome.tsx`

**Estimated scope:** Medium: 3-5 files

### Task 45: Timer, broadcast, help, recall-all

**Description:** Session `endsAt` timer. Host broadcasts a message into every child. A participant can request help. Recall-all closes the session and sends everyone back to the parent. All of it is server-authorized; realtime uses data packets.

**Acceptance criteria:**

- [x] Broadcast from a participant is 403; from host/cohost reaches every child
- [x] Help request is visible to parent moderators
- [x] Recall-all closes the session and child rooms

**Verification:**

- [x] Tests pass: broadcast/help/recall authorization
- [x] Build succeeds: `pnpm --filter web typecheck`
- [ ] Manual check: recall returns both browsers to the parent

**Dependencies:** Task 44

**Files likely touched:** `apps/web/lib/breakouts.ts`, `apps/web/app/api/v1/rooms/[id]/breakouts/route.ts`, `apps/web/components/meeting/BreakoutPanel.tsx`

**Estimated scope:** Medium: 3-5 files

### Task 46: Self-pick + moderator roam + pre-warm

**Description:** `self_pick` lets admitted parent participants choose a child. Parent host/cohost can mint any child (roam). Client calls `prepareConnection` before disconnecting so a move stays under ~2 seconds.

**Acceptance criteria:**

- [x] `self_pick` allows an admitted parent member to claim a child with remaining capacity
- [x] Parent moderator can join any child without an assignment row
- [x] Join path pre-warms the child connection before leaving the parent

**Verification:**

- [x] Tests pass: self-pick capacity + moderator roam
- [x] Build succeeds: `pnpm --filter web build`
- [x] Manual check: host roams into a child and back

**Dependencies:** Tasks 43–45

**Files likely touched:** `apps/web/lib/breakouts.ts`, `apps/web/components/meeting/MeetingRoom.tsx`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 41-46

- [ ] Two browsers: host opens breakouts, participant lands in a child, recall returns everyone
- [ ] Child token mint rejects unassigned participants
- [ ] Review with human before streaming

### Task 47: Stream model + RTMP start/stop + consent

**Description:** `Stream` Prisma model and `POST/DELETE /api/v1/rooms/{id}/streaming`. Room-composite egress with RTMP `StreamOutput`. Reuse the recording consent gate (PDPA). Emit `streaming_started`.

**Acceptance criteria:**

- [x] Start stays pending until every admitted participant consents
- [x] Stop ends the egress job and marks the stream finished
- [x] `streaming_started` is enqueued when egress actually starts

**Verification:**

- [x] Tests pass: consent gate + start/stop
- [x] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Tasks 25–26

**Files likely touched:** `apps/web/prisma/schema.prisma`, `apps/web/lib/streaming.ts`, `apps/web/app/api/v1/rooms/[id]/streaming/route.ts`, `apps/web/lib/egress.ts`

**Estimated scope:** Medium: 3-5 files

### Task 48: Multi-destination + HLS live playlist

**Description:** Multiple RTMP URLs via `updateStream`. Optional HLS live playlist to MinIO (`live_playlist_name`).

**Acceptance criteria:**

- [x] Adding a second RTMP URL does not restart the whole egress job
- [x] HLS live playlist object is written when `hls: true`
- [x] A malformed RTMP URL is 422 and does not start egress

**Verification:**

- [x] Tests pass: URL validation + add/remove destination helper
- [x] Build succeeds: `pnpm --filter web test`

**Dependencies:** Task 47

**Files likely touched:** `apps/web/lib/egress.ts`, `apps/web/lib/streaming.ts`

**Estimated scope:** Small: 1-2 files

### Task 49: Stream banner + org HLS player

**Description:** In-meeting banner while a stream is live. Org page plays the HLS live playlist using the existing VOD player.

**Acceptance criteria:**

- [x] Everyone in the room sees that streaming is active before media leaves the org
- [x] Finished/failed streams hide the banner
- [x] Signed playlist URL works in `HlsPlayer`

**Verification:**

- [x] Tests pass: existing suite
- [x] Build succeeds: `pnpm --filter web build`
- [x] Manual check: banner + player page with a fixture playlist

**Dependencies:** Tasks 29, 48

**Files likely touched:** `apps/web/components/meeting/MeetingChrome.tsx`, `apps/web/components/vod/HlsPlayer.tsx`

**Estimated scope:** Medium: 3-5 files

### Task 50: Embed package + iframe page

**Description:** `packages/embed` mounts an iframe at `/embed/rooms/[id]`. The iframe renders the existing meeting chrome. No LiveKit secret in the embed bundle.

**Acceptance criteria:**

- [x] `@sru/embed` is importable from the workspace
- [x] `/embed/rooms/[id]` renders without requiring the parent site to bundle LiveKit
- [x] `LIVEKIT_API_SECRET` is absent from the embed package

**Verification:**

- [x] Tests pass: `pnpm --filter @sru/shared test` (and embed package tests if present)
- [x] Build succeeds: `pnpm --filter web build`

**Dependencies:** Tasks 11, 34

**Files likely touched:** `packages/embed/src/index.ts`, `apps/web/app/embed/rooms/[id]/page.tsx`, `pnpm-workspace.yaml`

**Estimated scope:** Medium: 3-5 files

### Task 51: postMessage handshake + origin allowlist

**Description:** Parent page sends a minted token over `postMessage`. The iframe accepts it only from an allowlisted origin. Document the message shape.

**Acceptance criteria:**

- [x] Token from a non-allowlisted origin is ignored
- [x] Successful handshake connects the meeting
- [x] Customer page never receives `LIVEKIT_API_SECRET`

**Verification:**

- [x] Tests pass: origin allowlist helper
- [x] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Task 50

**Files likely touched:** `packages/embed/src/index.ts`, `apps/web/app/embed/rooms/[id]/EmbedFrame.tsx`, `apps/web/lib/embed-origin.ts`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 47-51

- [ ] Host can start/stop RTMP; HLS live playlist is playable in-product
- [ ] Embed iframe joins with a postMessage token
- [ ] Review with human before Helm and load test

### Task 52: Helm chart for web, Postgres, Redis, MinIO

**Description:** `infra/helm/sru-conf` deploys the app and data stores. Compose remains the documented small-org path.

**Acceptance criteria:**

- [x] `helm template` renders web, Postgres, Redis, and MinIO
- [x] Values file has no real secrets committed
- [x] README states Compose is still the local default

**Verification:**

- [x] Tests pass: existing suite
- [x] Manual check: `helm template sru infra/helm/sru-conf` (or documented equivalent)

**Dependencies:** Tasks 2, 24

**Files likely touched:** `infra/helm/sru-conf/Chart.yaml`, `infra/helm/sru-conf/values.yaml`, `infra/README.md`

**Estimated scope:** Medium: 3-5 files

### Task 53: LiveKit + coturn + egress Helm + air-gap

**Description:** Values for LiveKit (Redis, `hostNetwork`, one SFU pod per node), coturn, and egress. Script to save images for air-gapped install. Official constraint: a room pins to one SFU node.

**Acceptance criteria:**

- [ ] LiveKit values set Redis and `hostNetwork`
- [ ] Egress is a separate workload from the SFU
- [ ] Image-save script lists LiveKit, egress, coturn, web, Postgres, Redis, MinIO

**Verification:**

- [ ] Manual check: values files render; script is dry-run safe
- [ ] Build succeeds: `pnpm --filter web typecheck`

**Dependencies:** Task 52

**Files likely touched:** `infra/helm/livekit-values.yaml`, `infra/scripts/save-images.sh`

**Estimated scope:** Medium: 3-5 files

### Task 54: Load-test runner against Compose

**Description:** Script (livekit-cli or k6) that joins the local Compose SFU and records join time. Assertion helper for the spec’s join-under-3s gate at small N.

**Acceptance criteria:**

- [ ] Runner starts from `infra/loadtest` against Compose LiveKit
- [ ] Join-time helper fails when join exceeds 3s
- [ ] README says this is not a 500-user run

**Verification:**

- [ ] Tests pass: join-time helper
- [ ] Manual check: runner --help or dry run

**Dependencies:** Task 11

**Files likely touched:** `infra/loadtest/README.md`, `apps/web/lib/loadtest-join.ts`

**Estimated scope:** Medium: 3-5 files

### Task 55: 500-concurrent + TURN/4G runbook

**Description:** Document the 500-concurrent scenario with TURN and 4G throttle. Gates from spec §7.1. Do not mark the Production 1.0 load-test box until a sized run exists.

**Acceptance criteria:**

- [ ] Runbook lists join under 3s, regional audio under 200ms, usable at loss of 5% or less
- [ ] TURN and 4G throttle steps are explicit
- [ ] Checkpoint box stays unchecked without a sized run

**Verification:**

- [ ] Manual check: runbook exists under `infra/loadtest`
- [ ] Build succeeds: existing suite

**Dependencies:** Tasks 53–54

**Files likely touched:** `infra/loadtest/README.md`

**Estimated scope:** Small: 1-2 files

### Task 56: Expo app joins with a minted token

**Description:** `apps/mobile` Expo app that connects to a room with a token minted by the web API. No CallKit yet.

**Acceptance criteria:**

- [ ] App is a workspace package under `apps/mobile`
- [ ] Joining with a valid token connects audio/video
- [ ] Invalid token shows an error; secret is not hardcoded

**Verification:**

- [ ] Tests pass: existing web suite still green
- [ ] Manual check: Expo start + join against local web tokens

**Dependencies:** Tasks 11, 39

**Files likely touched:** `apps/mobile/package.json`, `apps/mobile/App.tsx`, `pnpm-workspace.yaml`

**Estimated scope:** Medium: 3-5 files

### Task 57: Native grid + mute

**Description:** Meeting grid and mute using LiveKit React Native, matching web roles.

**Acceptance criteria:**

- [ ] Local mute toggles the microphone track
- [ ] Remote participants appear in a grid
- [ ] Host/cohost chrome is not a second unauthorized client grant

**Verification:**

- [ ] Manual check: two devices or simulators
- [ ] Build succeeds: mobile typecheck if present

**Dependencies:** Task 56

**Files likely touched:** `apps/mobile/src/MeetingGrid.tsx`

**Estimated scope:** Medium: 3-5 files

### Task 58: PiP + background audio

**Description:** Picture-in-picture and background audio so a meeting continues when the app is backgrounded.

**Acceptance criteria:**

- [ ] Audio continues with the screen locked (platform permitting)
- [ ] PiP shows at least the active speaker or local camera
- [ ] Behavior is documented where iOS/Android differ

**Verification:**

- [ ] Manual check: background the app during a call
- [ ] Existing web suite still passes

**Dependencies:** Task 57

**Files likely touched:** `apps/mobile/src/pip.ts`, `apps/mobile/app.json`

**Estimated scope:** Medium: 3-5 files

### Task 59: CallKit / ConnectionService + push

**Description:** Incoming meeting as a system call UI, plus push invites. Requires Apple/Google signing. CI does not ship store builds. iOS screen share via Broadcast Extension is in scope only if signing is available.

**Acceptance criteria:**

- [ ] CallKit / ConnectionService compiles in the mobile app
- [ ] Push invite payload includes room id, not a LiveKit secret
- [ ] Store ship is skipped in CI

**Verification:**

- [ ] Manual check: on a signed device profile
- [ ] Web suite still passes

**Dependencies:** Task 58

**Files likely touched:** `apps/mobile/src/callkeep.ts`, `apps/mobile/src/push.ts`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: Complete (Production 1.0)

- [ ] Pen-test completed
- [ ] Load-test gates met
- [ ] All in-scope Phase 0–3 acceptance criteria for started work are met
- [ ] Ready for Production Release 1.0 review

---

## Phase 4 — Parked (not in active todo work)

Do not pull these into a sprint without a new task breakdown:

- Virtual background / noise suppression
- Whiteboard, polls, Q&A
- AI transcription / meeting summary
- E2EE with Insertable Streams
- Analytics dashboard
- SCIM 2.0 (called out in the spec as post-SSO)

## Parallelization

**Safe to parallelize**

- After Task 4: Task 5 (CI) with Task 8 (shell); Task 7 (OpenAPI) with Task 6 (PoC)
- After Task 11: Task 12 (layouts), Task 13 (share), Task 14 (public chat), and Task 17 (raise hand)
- After Task 14: Task 15 and Task 16
- After Task 46: Task 47 (streaming) is independent of remaining native work
- After Task 11 and 34: Task 50 (embed) is independent of Helm
- Independent tests and docs for already-landed tasks

**Must stay sequential**

- Compose → Prisma migrate → Auth → Rooms → Tokens
- Task 22 (lobby) after Task 20 (membership)
- Recording workers after MinIO + rooms (E2.1)
- Shared Prisma schema edits (avoid parallel migrate PRs)
- Task 41 before 42–46; Task 52 before 53; Task 54 before 55; native 56–59 last

**Needs a contract first**

- Task 4 and Task 7 before parallel API and UI work
- E2.6 API contract before E2.7 webhooks and E3.6 embed (Tasks 50–51)

## Risks and Mitigations


| Risk                                          | Impact | Mitigation                                                                    |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| WebRTC/NAT on Thai 4G and corporate firewalls | High   | coturn in Compose from Task 2; test TURN over TCP 443 before calling MVP done |
| Bandwidth cost                                | High   | Keep LiveKit dynacast/simulcast defaults; cap rooms at 25 in Phase 1          |
| Next.js Route Handlers as the only API        | Med    | Fine until egress/webhooks; extract workers in E2.1 and E2.7                  |
| Windows + Docker UDP                          | Med    | Document Docker Desktop settings; WSL2 or Linux fallback                      |
| Scope creep                                   | High   | Phase 1 must-haves are Tasks 9–24; drop Task 16 first if a sprint slips       |
| iOS Safari screen share                       | Med    | Explicit unsupported state in Task 13; native app is E3.3                     |
| Privilege escalation                          | High   | Tasks 19–22 exist to keep authorization on the server                         |
| Team WebRTC inexperience                      | High   | Adopt LiveKit; fail fast on Task 6 PoC                                        |
| Recording starving the SFU                    | Med    | Isolated egress pool in E2.1; never colocate with SFU                         |


## Open Questions

- CI host is assumed to be GitHub Actions. Swap `.github/workflows/ci.yml` if the remote is elsewhere.
- Branding and visual theme wait until Task 8; there is no design-system repo yet.
- Create-on-join vs explicit RoomService `createRoom` in Task 10 is left to the implementer as long as Task 11 join works.

## Definition of Done (every S/M task)

Standing bar on top of each task’s acceptance criteria:

- [ ] Acceptance criteria checked
- [ ] Named verification command or manual path done
- [ ] App still builds; no secrets committed
- [ ] Repo stays runnable: Compose + `pnpm --filter web dev`

## How to use this plan

1. Implement one numbered task per session (see [todo.md](todo.md)).
2. Phase 2 (Tasks 25–40) and Phase 3 (Tasks 41–59) are already split; do not start an E2.* or E3.* row as a build unit.
3. Stop at each checkpoint for a human review.

