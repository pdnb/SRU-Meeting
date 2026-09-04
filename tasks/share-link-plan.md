# Plan: Share link (guest join)

Source spec: [docs/specs/share-link.md](../docs/specs/share-link.md)  
Approved: 2026-09-04  

Repo already has the product roadmap in `tasks/plan.md`; this file is the **feature** plan for share-link only.

## Decisions locked on approve

| Question | Decision |
|----------|----------|
| Where defaults change | Adhoc **create** in `lib/rooms.ts` **and** Prisma `@default` (`allowGuests: true`, `signedInOnly: false`) so other creators match. No backfill of existing rows. |
| Copy feedback | Match `PersonalRoomCard` (“Copied”) — no new toast system. |
| Org override | None this round. |

## Current vs target

```text
Today                          Target
-----                          ------
adhoc create → guests OFF      adhoc create → guests ON
list: Join (auth only)         list: Join + Copy guest link
settings: relative <a>         settings: absolute URL + Copy
personal: already OK           personal: keep as reference UX
```

## Architecture

No new services. Reuse:

- Paths: `/u/{slug}`, `/join/{id}`
- Policy: `guestsAreAllowed` in `lib/join-policy.ts`
- Token: existing `POST /api/v1/rooms/[id]/tokens`

Add a **client-safe** helper (not under `server-only`) for guest path selection, shared by list + settings:

```ts
guestJoinPath({ kind, id, slug }) → `/u/...` | `/join/...`
```

Prefer `apps/web/lib/guest-join.ts` (or `@sru/shared` if we want package purity). Keep `personalJoinPath` as the personal-specific wrapper or migrate callers to `guestJoinPath`.

## Dependency graph

```text
1. guestJoinPath helper + unit tests
        │
        ├── 2. Adhoc defaults (create + Prisma migration) + tests
        │         │
        │         └── 3. RoomsManager “Copy link” (uses DTO allowGuests/signedInOnly)
        │
        └── 4. RoomSettings copy control (same helper)
        
5. Smoke checklist (personal + new meeting + guests-off)
```

Tasks 3 and 4 can run in parallel after 1; task 2 can parallel task 1.

## Risks

| Risk | Mitigation |
|------|------------|
| Flipping Prisma defaults surprises other `prisma.room.create` call sites (breakouts, tests) | Grep all creates; breakouts stay explicit `allowGuests: false`; update fixtures that assume old defaults |
| List UI shows copy for old rooms that still have guests off | Gate on `allowGuests && !signedInOnly` (same as settings) |
| Absolute URL needs `window` | Build absolute URL only in client components (pattern from `PersonalRoomCard`) |
| Schema default change needs migration | Add Prisma migration; do **not** UPDATE existing rows |

## Verification checkpoints

1. After task 2: `createRoomForUser` test asserts guest flags; migration applies cleanly.
2. After task 3: create room in UI → Copy → incognito `/join/{id}` → name → join.
3. After task 4: in-meeting settings copy matches list URL.
4. Final: personal `/u/{slug}` unchanged; guests-off room hides/fails guest link.

## Out of scope (do not implement)

Waiting room, password, expiring links, control-bar invite, backfill, breakout guest share, desktop-specific share UI.
