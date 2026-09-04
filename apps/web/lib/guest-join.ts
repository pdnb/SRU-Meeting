/**
 * Client-safe guest join path helper (no server-only).
 * Personal rooms use vanity `/u/{slug}`; everything else uses `/join/{id}`.
 */
export function guestJoinPath(room: {
  kind?: string | null;
  id: string;
  slug?: string | null;
}): string {
  if (room.kind === "personal" && room.slug) {
    return `/u/${room.slug}`;
  }
  return `/join/${room.id}`;
}
