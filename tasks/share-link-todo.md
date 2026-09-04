# Todo: Share link (guest join)

Spec: [docs/specs/share-link.md](../docs/specs/share-link.md)  
Plan: [tasks/share-link-plan.md](share-link-plan.md)

- [x] **Task 1: Guest join path helper**
  - Acceptance: `guestJoinPath` returns `/u/{slug}` for personal with slug, else `/join/{id}`; unit tests cover both.
  - Verify: `pnpm --filter web test -- lib/guest-join.test.ts` ✓
  - Files: `apps/web/lib/guest-join.ts`, `apps/web/lib/guest-join.test.ts`
  - Deps: none

- [x] **Task 2: New adhoc rooms allow guests by default**
  - Acceptance: `createRoomForUser` persists `allowGuests: true`, `signedInOnly: false`; Prisma schema defaults match; migration added with **no** data backfill; breakout/explicit creates unchanged; tests updated for new defaults.
  - Verify: targeted Vitest + migration SQL reviewed ✓
  - Files: `apps/web/lib/rooms.ts`, `apps/web/lib/rooms.test.ts`, `apps/web/prisma/schema.prisma`, `apps/web/prisma/migrations/20260904093000_guest_link_defaults/migration.sql`
  - Deps: none

- [x] **Task 3: Copy guest link on rooms list**
  - Acceptance: Open adhoc room row shows Copy link when guests allowed; copies `origin + guestJoinPath`; shows brief “Copied”; when guests disabled, no guest copy; Join still goes to `/app/rooms/{id}`.
  - Files: `apps/web/components/rooms/RoomsManager.tsx`
  - Deps: Task 1, Task 2

- [x] **Task 4: Copy guest link in RoomSettings**
  - Acceptance: When guests allowed, show absolute guest URL + Copy; when not, keep off message; uses `guestJoinPath`.
  - Files: `apps/web/components/meeting/RoomSettings.tsx`
  - Deps: Task 1

- [x] **Task 5: Smoke against success criteria**
  - Acceptance: Automated checks for helper/defaults; typecheck clean. Manual: create → copy → incognito join; personal `/u/{slug}`; guests-off hides copy.
  - Verify: `pnpm --filter web test -- lib/guest-join.test.ts lib/rooms.test.ts lib/join-policy.test.ts lib/personal-room.test.ts lib/breakouts.test.ts`; `pnpm --filter web typecheck` ✓
  - Deps: Tasks 1–4
