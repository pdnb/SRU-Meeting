import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, createRoom } = vi.hoisted(() => {
  const createRoom = vi.fn(async (opts: { name: string }) => ({
    name: opts.name,
  }));
  const client = {
    room: { findUnique: vi.fn() },
    roomParticipant: { findUnique: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    breakoutSession: { findUnique: vi.fn() },
    breakoutAssignment: { findUnique: vi.fn() },
  };
  return { prisma: client, createRoom };
});

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/livekit/room-service", () => ({
  getRoomService: () => ({ createRoom }),
  ensureLiveKitRoom: async (name: string) => {
    await createRoom({ name });
  },
}));
vi.mock("@/lib/guest-proof", () => ({
  GUEST_COOKIE: "sru_guest",
  guestCookieSecret: () => "secret",
  encodeGuestCookie: () => "cookie",
}));

import { mintRoomJoinToken } from "./tokens";

const parentRoom = {
  id: "room-1",
  name: "Seminar",
  createdAt: new Date(),
  ownerId: "host-1",
  passwordHash: null,
  lobbyEnabled: false,
  locked: false,
  finishedAt: null,
  allowGuests: false,
  signedInOnly: true,
  allowedEmailDomains: [],
  allowScreenShare: true,
  allowChat: true,
  maxParticipants: 25,
  chatRetentionDays: null,
  parentRoomId: null,
  breakoutSessionId: null,
};

const childRoom = {
  ...parentRoom,
  id: "child-1",
  name: "Seminar · 1",
  parentRoomId: "room-1",
  breakoutSessionId: "bo-1",
  lobbyEnabled: false,
  passwordHash: null,
  allowGuests: false,
};

const participant = {
  id: "user-a",
  email: "a@sru.ac.th",
  name: "Ada",
  orgRole: "participant" as const,
};

describe("mintRoomJoinToken breakout child", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.room.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "child-1") return childRoom;
      if (where.id === "room-1") return parentRoom;
      return null;
    });
    prisma.breakoutSession.findUnique.mockResolvedValue({
      id: "bo-1",
      parentRoomId: "room-1",
      status: "open",
    });
    prisma.roomParticipant.upsert.mockResolvedValue({});
    prisma.roomParticipant.count.mockResolvedValue(1);
  });

  it("mints a token for an assigned participant", async () => {
    prisma.roomParticipant.findUnique.mockImplementation(
      async ({
        where,
      }: {
        where: { roomId_userId: { roomId: string; userId: string } };
      }) => {
        if (where.roomId_userId.roomId === "room-1") {
          return {
            role: "participant",
            banned: false,
            lobbyStatus: "admitted",
          };
        }
        return null;
      },
    );
    prisma.breakoutAssignment.findUnique.mockResolvedValue({
      sessionId: "bo-1",
      userId: "user-a",
      childRoomId: "child-1",
    });

    const result = await mintRoomJoinToken({
      roomId: "child-1",
      user: participant,
      raw: { roomName: "child-1", identity: "user-a", name: "Ada" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.body.token.length).toBeGreaterThan(8);
    expect(createRoom).toHaveBeenCalledWith({ name: "child-1" });
  });

  it("returns 403 when the participant is not assigned to that child", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });
    prisma.breakoutAssignment.findUnique.mockResolvedValue({
      sessionId: "bo-1",
      userId: "user-a",
      childRoomId: "child-2",
    });

    const result = await mintRoomJoinToken({
      roomId: "child-1",
      user: participant,
      raw: { roomName: "child-1", identity: "user-a" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.code).toBe("NOT_ASSIGNED");
    }
    expect(createRoom).not.toHaveBeenCalled();
  });

  it("lets a parent cohost mint a child token without an assignment", async () => {
    prisma.roomParticipant.findUnique.mockImplementation(
      async ({
        where,
      }: {
        where: { roomId_userId: { roomId: string; userId: string } };
      }) => {
        if (where.roomId_userId.roomId === "room-1") {
          return {
            role: "cohost",
            banned: false,
            lobbyStatus: "admitted",
          };
        }
        return null;
      },
    );
    prisma.breakoutAssignment.findUnique.mockResolvedValue(null);

    const result = await mintRoomJoinToken({
      roomId: "child-1",
      user: { ...participant, id: "cohost-1", email: "c@sru.ac.th" },
      raw: { roomName: "child-1", identity: "cohost-1" },
    });

    expect(result.ok).toBe(true);
  });
});
