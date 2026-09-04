import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => {
  const room = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const roomParticipant = {
    findUnique: vi.fn(),
    count: vi.fn(),
  };
  return { prisma: { room, roomParticipant } };
});

vi.mock("@/lib/db", () => ({ prisma }));

import {
  closeRoomForOwner,
  createRoomForUser,
  listRoomsForUser,
  roomIsAtCapacity,
  toRoomDto,
  userMayCloseRoom,
  userMaySeeRoom,
} from "./rooms";

const hostId = "user-host";
const guestId = "user-guest";

function roomRow(
  overrides: Partial<{
    id: string;
    name: string;
    createdAt: Date;
    ownerId: string;
    kind: "adhoc" | "personal";
    slug: string | null;
    passwordHash: string | null;
    lobbyEnabled: boolean;
    locked: boolean;
    finishedAt: Date | null;
    allowGuests: boolean;
    signedInOnly: boolean;
    allowedEmailDomains: string[];
    allowScreenShare: boolean;
    allowChat: boolean;
    maxParticipants: number;
    chatRetentionDays: number | null;
    parentRoomId: string | null;
  }> = {},
) {
  return {
    id: "room-1",
    name: "Seminar",
    createdAt: new Date("2026-08-31T00:00:00.000Z"),
    ownerId: hostId,
    kind: "adhoc" as const,
    slug: null,
    passwordHash: null,
    lobbyEnabled: false,
    locked: false,
    finishedAt: null,
    allowGuests: true,
    signedInOnly: false,
    allowedEmailDomains: [] as string[],
    allowScreenShare: true,
    allowChat: true,
    maxParticipants: 25,
    chatRetentionDays: null,
    parentRoomId: null,
    ...overrides,
  };
}

describe("userMaySeeRoom", () => {
  it("shows rooms the owner or an admitted member can see", () => {
    expect(userMaySeeRoom(hostId, { ownerId: hostId }, null)).toBe(true);
    expect(
      userMaySeeRoom(guestId, { ownerId: hostId }, {
        banned: false,
        lobbyStatus: "admitted",
      }),
    ).toBe(true);
    expect(
      userMaySeeRoom(guestId, { ownerId: hostId }, {
        banned: false,
        lobbyStatus: "pending",
      }),
    ).toBe(false);
  });
});

describe("userMayCloseRoom", () => {
  it("allows only the owner", () => {
    expect(userMayCloseRoom(hostId, { ownerId: hostId })).toBe(true);
    expect(userMayCloseRoom(guestId, { ownerId: hostId })).toBe(false);
  });
});

describe("roomIsAtCapacity", () => {
  it("rejects the 26th join when the cap is 25", () => {
    expect(roomIsAtCapacity(25, 25)).toBe(true);
    expect(roomIsAtCapacity(24, 25)).toBe(false);
  });
});

describe("toRoomDto", () => {
  it("never includes a password hash", () => {
    const dto = toRoomDto(roomRow({ passwordHash: "hashed-secret" }));
    expect(dto.hasPassword).toBe(true);
    expect(JSON.stringify(dto)).not.toContain("hashed-secret");
  });
});

describe("room API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a room owned by the session user with guests allowed", async () => {
    const created = roomRow();
    prisma.room.create.mockResolvedValue(created);

    const room = await createRoomForUser(hostId, { name: "Seminar" });

    expect(room.ownerId).toBe(hostId);
    expect(room.name).toBe("Seminar");
    expect(room.allowGuests).toBe(true);
    expect(room.signedInOnly).toBe(false);
    expect(prisma.room.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: hostId,
          name: "Seminar",
          kind: "adhoc",
          allowGuests: true,
          signedInOnly: false,
        }),
      }),
    );
  });

  it("lists only rooms the user may see", async () => {
    prisma.room.findMany.mockResolvedValue([roomRow()]);

    const rooms = await listRoomsForUser(guestId);

    expect(rooms).toHaveLength(1);
    expect(prisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          parentRoomId: null,
          kind: "adhoc",
          OR: expect.arrayContaining([
            { ownerId: guestId },
            {
              participants: {
                some: {
                  userId: guestId,
                  banned: false,
                  lobbyStatus: "admitted",
                },
              },
            },
          ]),
        }),
      }),
    );
  });

  it("lets the owner close a room and forbids others", async () => {
    prisma.room.findUnique.mockResolvedValue(roomRow());
    prisma.room.update.mockResolvedValue(roomRow({ finishedAt: new Date() }));

    await expect(closeRoomForOwner(hostId, "room-1")).resolves.toEqual({
      ok: true,
    });
    await expect(closeRoomForOwner(guestId, "room-1")).resolves.toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("rejects closing a personal room", async () => {
    prisma.room.findUnique.mockResolvedValue(
      roomRow({ kind: "personal", slug: "somchai.jai" }),
    );

    await expect(closeRoomForOwner(hostId, "room-1")).resolves.toMatchObject({
      ok: false,
      status: 409,
      code: "CANNOT_CLOSE_PERSONAL",
    });
    expect(prisma.room.update).not.toHaveBeenCalled();
  });
});
