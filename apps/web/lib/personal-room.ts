import "server-only";

import { PersonalRoomSchema, type PersonalRoom } from "@sru/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_MAX_PARTICIPANTS, toRoomDto } from "@/lib/rooms";

const SLUG_MAX = 48;

/**
 * Build a vanity slug base from a display name or email local-part.
 * Collision suffixes are applied separately in allocatePersonalSlug.
 */
export function slugifyIdentity(input: {
  name?: string | null;
  email: string;
}): string {
  const raw =
    (input.name?.trim() ? input.name : null) ??
    input.email.split("@")[0] ??
    "user";
  const ascii = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const slug = ascii
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/\.+$/g, "");
  return slug.length >= 2 ? slug : "user";
}

export function personalJoinPath(slug: string): string {
  return `/u/${slug}`;
}

export function toPersonalRoomDto(room: {
  id: string;
  name: string;
  slug: string | null;
}): PersonalRoom {
  if (!room.slug) {
    throw new Error("Personal room is missing a slug");
  }
  return PersonalRoomSchema.parse({
    id: room.id,
    name: room.name,
    slug: room.slug,
    joinPath: personalJoinPath(room.slug),
  });
}

async function allocatePersonalSlug(base: string): Promise<string> {
  const candidates: string[] = [base];
  for (let i = 2; i <= 50; i += 1) {
    const suffix = `-${i}`;
    const truncated = base.slice(0, Math.max(2, SLUG_MAX - suffix.length));
    candidates.push(`${truncated}${suffix}`);
  }
  for (const candidate of candidates) {
    const taken = await prisma.room.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) {
      return candidate;
    }
  }
  return `${base.slice(0, 32)}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function getPersonalRoomForUser(userId: string) {
  return prisma.room.findFirst({
    where: { ownerId: userId, kind: "personal" },
  });
}

export async function getPersonalRoomBySlug(slug: string) {
  return prisma.room.findFirst({
    where: { kind: "personal", slug },
  });
}

/**
 * Idempotently provision a permanent Personal Room for a non-guest user.
 */
export async function ensurePersonalRoom(userId: string): Promise<PersonalRoom> {
  const existing = await getPersonalRoomForUser(userId);
  if (existing?.slug) {
    return toPersonalRoomDto(existing);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isGuest || user.deletedAt) {
    throw new Error("Personal rooms are only for active org members");
  }

  if (existing && !existing.slug) {
    const slug = await allocatePersonalSlug(
      slugifyIdentity({ name: user.name, email: user.email }),
    );
    const patched = await prisma.room.update({
      where: { id: existing.id },
      data: { slug },
    });
    return toPersonalRoomDto(patched);
  }

  const displayName = user.name?.trim() || user.email.split("@")[0] || "User";
  const baseSlug = slugifyIdentity({ name: user.name, email: user.email });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = await allocatePersonalSlug(baseSlug);
    try {
      const room = await prisma.room.create({
        data: {
          name: `${displayName}'s room`,
          ownerId: userId,
          kind: "personal",
          slug,
          allowGuests: true,
          signedInOnly: false,
          lobbyEnabled: false,
          locked: false,
          maxParticipants: DEFAULT_MAX_PARTICIPANTS,
          participants: {
            create: {
              userId,
              role: "host",
              banned: false,
              lobbyStatus: "admitted",
            },
          },
        },
      });
      return toPersonalRoomDto(room);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await getPersonalRoomForUser(userId);
        if (raced?.slug) {
          return toPersonalRoomDto(raced);
        }
        continue;
      }
      throw error;
    }
  }

  const fallback = await getPersonalRoomForUser(userId);
  if (fallback?.slug) {
    return toPersonalRoomDto(fallback);
  }
  throw new Error("Could not provision a personal room");
}

export async function ensurePersonalRoomDto(userId: string) {
  const personal = await ensurePersonalRoom(userId);
  const room = await prisma.room.findUniqueOrThrow({ where: { id: personal.id } });
  return { personal, room: toRoomDto(room) };
}
