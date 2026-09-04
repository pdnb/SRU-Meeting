import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => {
  const room = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const user = {
    findUnique: vi.fn(),
  };
  return { prisma: { room, user } };
});

vi.mock("@/lib/db", () => ({ prisma }));

import {
  ensurePersonalRoom,
  personalJoinPath,
  slugifyIdentity,
  toPersonalRoomDto,
} from "./personal-room";

describe("slugifyIdentity", () => {
  it("builds a vanity slug from a display name", () => {
    expect(slugifyIdentity({ name: "Somchai Jai", email: "x@sru.ac.th" })).toBe(
      "somchai.jai",
    );
  });

  it("falls back to the email local-part", () => {
    expect(slugifyIdentity({ name: null, email: "anee.wong@sru.ac.th" })).toBe(
      "anee.wong",
    );
  });

  it("strips diacritics and odd characters", () => {
    expect(slugifyIdentity({ name: "José Ñoño!!", email: "a@b.c" })).toBe(
      "jose.nono",
    );
  });
});

describe("personalJoinPath", () => {
  it("prefixes /u/", () => {
    expect(personalJoinPath("somchai.jai")).toBe("/u/somchai.jai");
  });
});

describe("toPersonalRoomDto", () => {
  it("requires a slug", () => {
    expect(() =>
      toPersonalRoomDto({ id: "r1", name: "Room", slug: null }),
    ).toThrow(/missing a slug/);
  });
});

describe("ensurePersonalRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an existing personal room without creating another", async () => {
    prisma.room.findFirst.mockResolvedValue({
      id: "room-p",
      name: "Somchai's room",
      slug: "somchai.jai",
      kind: "personal",
      ownerId: "user-1",
    });

    const dto = await ensurePersonalRoom("user-1");

    expect(dto).toEqual({
      id: "room-p",
      name: "Somchai's room",
      slug: "somchai.jai",
      joinPath: "/u/somchai.jai",
    });
    expect(prisma.room.create).not.toHaveBeenCalled();
  });

  it("creates a personal room with open guest defaults", async () => {
    prisma.room.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "somchai.jai@sru.ac.th",
      name: "Somchai Jai",
      isGuest: false,
      deletedAt: null,
    });
    prisma.room.findUnique.mockResolvedValue(null);
    prisma.room.create.mockResolvedValue({
      id: "room-new",
      name: "Somchai Jai's room",
      slug: "somchai.jai",
      kind: "personal",
      ownerId: "user-1",
    });

    const dto = await ensurePersonalRoom("user-1");

    expect(dto.slug).toBe("somchai.jai");
    expect(prisma.room.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "personal",
          slug: "somchai.jai",
          allowGuests: true,
          signedInOnly: false,
          lobbyEnabled: false,
          locked: false,
          ownerId: "user-1",
        }),
      }),
    );
  });

  it("rejects guests", async () => {
    prisma.room.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      id: "g1",
      email: "guest@sru.invalid",
      name: "Guest",
      isGuest: true,
      deletedAt: null,
    });

    await expect(ensurePersonalRoom("g1")).rejects.toThrow(/org members/);
  });
});
