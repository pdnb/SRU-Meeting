# Implementation Plan: SRU-Conf

## Overview

SRU-Conf is a self-hosted video conference platform. Organizations keep media and metadata on their own infrastructure, join from the web, and later connect existing identity systems via SSO and a public API. Phase 0–1 ship a branded Next.js app on a local LiveKit SFU: a real 25-person meeting with camera/mic, screen share, public and private chat, raise hand, moderator controls, room password, and lobby. Phase 2–3 (recording, SSO, public API, breakouts, streaming, native apps, multi-node) stay as epics and must be re-broken into S/M tasks before work starts.

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

- [ ] Task 1: Monorepo and Next.js scaffold
- [ ] Task 2: Local media stack (Compose)
- [ ] Task 3: Prisma core schema
- [ ] Task 4: Shared API contracts
- [ ] Task 5: CI quality gate
- [ ] Task 6: LiveKit token helper and two-browser PoC
- [ ] Task 7: OpenAPI skeleton
- [ ] Task 8: App shell and design tokens

### Checkpoint: Foundation

- [ ] Compose stack is healthy
- [ ] Two-browser PoC works (see/hear each other)
- [ ] CI is green
- [ ] Review with human before auth and product UI

### Phase 1: Core MVP

- [ ] Task 9: Local register and login
- [ ] Task 10: Create, list, and close rooms
- [ ] Task 11: Join meeting with camera and mic
- [ ] Task 12: Grid, speaker, and sidebar layouts
- [ ] Task 13: Screen sharing
- [ ] Task 14: Public chat with history
- [ ] Task 15: Private chat, emoji, mention
- [ ] Task 16: Chat file attachments
- [ ] Task 17: Raise hand queue
- [ ] Task 18: Reactions
- [ ] Task 19: Moderator media controls
- [ ] Task 20: Moderator membership controls
- [ ] Task 21: Room password
- [ ] Task 22: Lobby and knocking
- [ ] Task 23: Join policies
- [ ] Task 24: MVP hardening and health

### Checkpoint: Core MVP

- [ ] Two (ideally three) browsers: A/V, share, public and DM chat, hand, host mute/kick/end
- [ ] Password and lobby work
- [x] CI green; Compose-only local run
- [x] Review with human before Phase 2

Saved 2026-08-31 as git tag `checkpoint/phase-1-mvp`.

### Phase 2: Enterprise (epics — split before building)

- [ ] Epic E2.1: Composite recording + PDPA consent + MinIO
- [ ] Epic E2.2: Track egress + HLS VOD
- [ ] Epic E2.3: SSO (OIDC/SAML, JIT, role mapping)
- [ ] Epic E2.4: LDAP / Active Directory
- [ ] Epic E2.5: Admin RBAC
- [ ] Epic E2.6: Public API keys + HMAC + rate limit + Swagger UI
- [ ] Epic E2.7: Signed webhooks
- [ ] Epic E2.8: Admin dashboard
- [ ] Epic E2.9: PWA / mobile web
- [ ] Epic E2.10: Audit log + retention + deletion rights

### Checkpoint: Pilot

- [ ] Small-org pilot is usable (not production scale)

### Phase 3: Advanced and scale (epics — split before building)

- [ ] Epic E3.1: Breakout rooms
- [ ] Epic E3.2: Live streaming (RTMP / HLS)
- [ ] Epic E3.3: Native mobile apps
- [ ] Epic E3.4: Multi-node SFU + Helm
- [ ] Epic E3.5: Load test 500+ concurrent
- [ ] Epic E3.6: Embed SDK

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

- [ ] Two users join with A/V, switch layouts, and share a screen
- [ ] Token grant tests pass
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
- [ ] Two (ideally three) browsers: A/V, share, public and DM chat, hand, host mute/kick/end
- [ ] Password and lobby work
- [x] Compose-only local run; CI green
- [x] Review with human before any Phase 2 epic

Saved 2026-08-31 as git tag `checkpoint/phase-1-mvp`. Known gap: two-browser A/V can still fail on Windows Docker ICE/UDP.

---

## Phase 2 — Enterprise (epics)

Do not implement these until each epic is re-broken into S/M tasks with acceptance criteria. Dependencies assume Phase 1 MVP is done.

### Epic E2.1: Composite recording + PDPA consent + MinIO

**Description:** LiveKit Egress composite recording on an isolated worker pool (never on the SFU node). Everyone in the room sees a consent banner before recording starts (PDPA). Output lands in MinIO with signed download URLs.

**Dependencies:** Tasks 2, 10, 24

**Split before building.** Likely slices: Egress compose service, start/stop API, consent banner, object metadata, signed download.

### Epic E2.2: Track egress + HLS VOD

**Description:** Per-track egress for post-production and auto-transcode to HLS for in-product playback.

**Dependencies:** E2.1

### Epic E2.3: SSO (OIDC/SAML, JIT, role mapping)

**Description:** Auth.js providers for Keycloak, Entra ID, Google Workspace, and Okta; SAML 2.0; JIT user create on first login; map IdP/AD groups to host or admin roles.

**Dependencies:** Task 9

### Epic E2.4: LDAP / Active Directory

**Description:** Bind/search against LDAP or AD for organizations that do not yet have OIDC.

**Dependencies:** E2.3

### Epic E2.5: Admin RBAC

**Description:** Org-level roles (org admin vs host vs participant) beyond per-room host/cohost/participant.

**Dependencies:** Task 9, E2.3

### Epic E2.6: Public API keys + HMAC + rate limit + Swagger UI

**Description:** External integrations authenticate with API key and HMAC, are rate-limited per key, and browse OpenAPI 3 via Swagger UI.

**Dependencies:** Task 7, Task 10

### Epic E2.7: Signed webhooks

**Description:** Signed HTTP posts for `room_started`, `room_finished`, `participant_joined`, `participant_left`, `recording_started`, `recording_finished`, `streaming_started`. Extract a worker if Next.js Route Handlers cannot meet delivery retries.

**Dependencies:** E2.6, E2.1 (for recording events)

### Epic E2.8: Admin dashboard

**Description:** Internal UI for rooms, users, recordings, and configuration.

**Dependencies:** E2.5, E2.1

### Epic E2.9: PWA / mobile web

**Description:** Installable PWA, mobile meeting layout, and 4G-friendly encoding defaults. Native PiP and CallKit wait for Phase 3.

**Dependencies:** Tasks 11–13

### Epic E2.10: Audit log + retention + deletion rights

**Description:** Audit every moderator and admin action. Enforce chat and recording retention jobs and a user data-deletion path (PDPA).

**Dependencies:** Tasks 19–20, E2.1

## Checkpoint: After Phase 2

- [ ] Each started epic has been split into S/M tasks and those tasks meet their criteria
- [ ] Small-org pilot is usable
- [ ] Review with human before Phase 3

---

## Phase 3 — Advanced and scale (epics)

### Epic E3.1: Breakout rooms

**Description:** Child LiveKit rooms keyed by `parent_room_id`. Assign automatically, manually, or by self-pick. Timer, broadcast, help request, recall-all. Pre-warm connections so a move stays under 2 seconds.

**Dependencies:** Tasks 11, 20

### Epic E3.2: Live streaming (RTMP / HLS)

**Description:** Egress RTMP to multiple destinations and HLS for an org web player. Optional WHEP / LL-HLS later.

**Dependencies:** E2.1

### Epic E3.3: Native mobile apps

**Description:** React Native + LiveKit SDK with PiP, background audio, CallKit / ConnectionService, and push invites. iOS screen share uses a Broadcast Extension.

**Dependencies:** E2.9, Task 13

### Epic E3.4: Multi-node SFU + Helm

**Description:** Extra SFU nodes, Helm chart, TLS automation, air-gapped image bundle. Compose remains the small-org path.

**Dependencies:** Task 2, Task 24

### Epic E3.5: Load test 500+ concurrent

**Description:** Load test to 500+ concurrent users with TURN and 4G throttle. Budgets from the spec: join under 3s, regional audio latency under 200ms, usable at loss ≤ 5%.

**Dependencies:** E3.4, Task 11

### Epic E3.6: Embed SDK

**Description:** JS embed that mounts a meeting in a customer iframe, with documented auth and postMessage.

**Dependencies:** E2.6, Task 11

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
- Independent tests and docs for already-landed tasks

**Must stay sequential**

- Compose → Prisma migrate → Auth → Rooms → Tokens
- Task 22 (lobby) after Task 20 (membership)
- Recording workers after MinIO + rooms (E2.1)
- Shared Prisma schema edits (avoid parallel migrate PRs)

**Needs a contract first**

- Task 4 and Task 7 before parallel API and UI work
- E2.6 API contract before E2.7 webhooks and E3.6 embed

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebRTC/NAT on Thai 4G and corporate firewalls | High | coturn in Compose from Task 2; test TURN over TCP 443 before calling MVP done |
| Bandwidth cost | High | Keep LiveKit dynacast/simulcast defaults; cap rooms at 25 in Phase 1 |
| Next.js Route Handlers as the only API | Med | Fine until egress/webhooks; extract workers in E2.1 and E2.7 |
| Windows + Docker UDP | Med | Document Docker Desktop settings; WSL2 or Linux fallback |
| Scope creep | High | Phase 1 must-haves are Tasks 9–24; drop Task 16 first if a sprint slips |
| iOS Safari screen share | Med | Explicit unsupported state in Task 13; native app is E3.3 |
| Privilege escalation | High | Tasks 19–22 exist to keep authorization on the server |
| Team WebRTC inexperience | High | Adopt LiveKit; fail fast on Task 6 PoC |
| Recording starving the SFU | Med | Isolated egress pool in E2.1; never colocate with SFU |

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
2. Do not start a Phase 2 or Phase 3 epic until it has been split into S/M tasks in a follow-up planning pass.
3. Stop at each checkpoint for a human review.
