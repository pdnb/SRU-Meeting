# Spec: Share link (guest join)

## Intent (confirmed)

- **Outcome:** Guest opens a personal-room or meeting-room link, enters a name if needed, and joins without signing in.
- **Users:** Link recipients (external guests) and hosts who send the link.
- **Why now:** Join paths exist, but meeting-room guests are off by default and share/copy is incomplete; personal and meeting feel inconsistent.
- **Out of scope this round:** Waiting room, room password, expiring/one-time links.

## Assumptions (validate before implement)

1. **New adhoc meeting rooms** default to guest join enabled (`allowGuests: true`, `signedInOnly: false`), matching personal rooms.
2. **Existing adhoc rooms** keep their current flags (no migration/backfill).
3. Guest URLs stay as today: personal `/u/{slug}`, meeting `/join/{id}` (absolute URL when copying).
4. Host continues to open meetings via `/app/rooms/{id}`; share UX surfaces the **guest** URL.
5. Lobby / password / lock / domain allowlist **remain** as host-configurable join policy; this work only makes the default happy path “open link → name → join.”
6. Breakout rooms are unchanged (still not guest-share targets).
7. Scope is `apps/web` only (desktop/embed out of scope unless they already reuse the same join URLs).

→ Correct these before coding, or treat approval of this spec as accepting them.

## Objective

Make “share link → guest joins” work the same way for **personal rooms** and **adhoc meeting rooms**:

| Actor | Can… |
|-------|------|
| Host (signed in) | See and copy the guest join URL from the rooms list (and keep in-meeting guest link when guests are allowed) |
| Guest (no account) | Open that URL, enter a display name on Prejoin, enter the LiveKit room |

### User stories

1. As a host, I create a meeting room and immediately copy a guest link without opening Room Settings.
2. As a guest, I open a meeting `/join/{id}` link, type my name, and join without logging in.
3. As a host, I copy my personal `/u/{slug}` link (existing) and guests still join the same way.
4. As a host who turns on “signed-in only” or turns off guests, the guest link stops working (existing policy), and the UI does not pretend guests can join.

## Current state (baseline)

| Area | Today |
|------|--------|
| Personal | `/u/{slug}` public; guests on by default; Prejoin name; `PersonalRoomCard` copy link |
| Meeting | `/join/{id}` public page exists; token path supports guests; **defaults** `allowGuests: false`, `signedInOnly: true` |
| Rooms list | Join → `/app/rooms/{id}` only; no guest copy for adhoc |
| RoomSettings | Shows relative guest link only when guests allowed; no copy button |

## Tech stack

- Next.js 15 App Router (`apps/web`), React 19, Prisma + PostgreSQL
- Auth: Auth.js / NextAuth v5 (middleware gates `/app/*` only)
- LiveKit tokens via `POST /api/v1/rooms/[id]/tokens` + `lib/join.ts` / `lib/join-policy.ts`
- Tests: Vitest (`apps/web`)

## Commands

```bash
# from repo root
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web dev
pnpm --filter web build
```

Targeted tests (examples):

```bash
pnpm --filter web test -- lib/rooms.test.ts
pnpm --filter web test -- lib/join-policy.test.ts
pnpm --filter web test -- lib/personal-room.test.ts
```

## Project structure (touch points)

```
docs/specs/share-link.md          → this spec
apps/web/lib/rooms.ts             → adhoc create defaults / joinPath helpers
apps/web/lib/join-policy.ts       → guestsAreAllowed (likely unchanged)
apps/web/prisma/schema.prisma     → Room.allowGuests / signedInOnly defaults (if changed)
apps/web/components/rooms/        → RoomsManager + share/copy UI
apps/web/components/rooms/PersonalRoomCard.tsx  → reference UX for copy
apps/web/components/meeting/RoomSettings.tsx    → copy guest link
apps/web/app/join/[id]/page.tsx  → guest meeting entry (verify only)
apps/web/app/u/[slug]/page.tsx   → guest personal entry (verify only)
apps/web/lib/*.test.ts            → default + policy tests
```

## Code style

Follow existing room/join patterns: thin route handlers, policy in `lib/`, Vitest colocated as `*.test.ts`. Prefer shared helpers for absolute guest URLs over duplicating string builds.

```ts
// Good: one helper used by list card + settings
export function guestJoinPath(room: { kind: string; id: string; slug?: string | null }) {
  if (room.kind === "personal" && room.slug) return `/u/${room.slug}`;
  return `/join/${room.id}`;
}
```

UI: match `PersonalRoomCard` copy-link affordance (button + absolute URL), do not invent a new share modal in this round.

## Behavior requirements

### Defaults (new adhoc rooms)

- Creating an adhoc room sets `allowGuests: true` and `signedInOnly: false` (unless product later adds an explicit “private meeting” create option — **not** in this round).
- Personal room provisioning stays as today (`allowGuests: true`, `signedInOnly: false`, `lobbyEnabled: false`).

### Guest happy path

1. Guest opens absolute URL for personal or meeting guest path.
2. Page loads without NextAuth redirect.
3. Prejoin requires display name when `guest`.
4. Token mint succeeds when `guestsAreAllowed(room)` and other join gates pass.
5. Guest enters the room.

### Share / copy UX

1. **Rooms list (adhoc):** Host can copy the guest absolute URL (`origin + /join/{id}`) without entering the meeting.
2. **Personal card:** Keep existing copy for `/u/{slug}`.
3. **RoomSettings:** When guests are allowed, show absolute (or clearly copyable) guest URL with a copy control; when guests are not allowed, do not show a working guest link.
4. Do not require control-bar invite in this round (nice-to-have only if trivial).

### Policy unchanged (explicit)

- Host may still disable guests / enable signed-in only; token returns `GUESTS_DISABLED` / equivalent.
- Lobby, password, lock, capacity, finished, domain allowlist keep current semantics if enabled.
- This round does **not** add waiting room, password, or expiring links.

## Testing strategy

| Level | What |
|-------|------|
| Unit | Room create defaults; `guestJoinPath` / URL helper; `guestsAreAllowed` still correct |
| Unit | Personal ensure still sets guest-friendly flags |
| Manual | Create adhoc room → copy link in incognito → enter name → join; same for personal `/u/{slug}` |
| Manual | Toggle guests off → guest link fails appropriately; host `/app/rooms/{id}` still works |

No new E2E required for merge if Vitest + manual smoke pass; add Playwright only if the team already runs join E2E in CI for this area.

## Boundaries

- **Always:** Keep personal and meeting guest entry consistent; run targeted Vitest before claiming done; preserve host `/app/rooms/{id}` path.
- **Ask first:** Changing Prisma column defaults / migration for existing rows; removing lobby/password features; unifying `/u` and `/join` into one URL scheme; enabling guests on breakouts.
- **Never:** Require login on `/join/*` or `/u/*` for the happy path; commit secrets; silently backfill all historical rooms to guest-open without an explicit decision.

## Success criteria

1. New adhoc meeting: guest can complete open link → name → join **without** the host opening Room Settings first.
2. Personal room: same flow still works; copy link still present.
3. Rooms list (or equivalent host surface) exposes **copy guest link** for adhoc meetings.
4. When guests are disabled, guest token/join fails; UI does not present a false “guests can join” copy target.
5. Automated tests cover new adhoc defaults (and any URL helper).
6. No new waiting-room / password / expiring-link feature shipped in this change set.

## Open questions (resolved on approve)

1. **Defaults:** Change adhoc **create** path in `lib/rooms.ts` (and align Prisma `@default` so other creators match). No backfill of existing rooms.
2. **Copy feedback:** Match `PersonalRoomCard` (“Copied”) — no separate toast system.
3. **Org policy:** None for this round — new meetings are guest-open by default.

## Approval

- [x] Assumptions accepted (or corrected in-place)
- [x] Spec approved to proceed to plan / tasks (2026-09-04)
