import { beforeEach, describe, expect, it, vi } from "vitest";
import { roomCanHostEngagement } from "./polls";

const { prisma, sendRoomData, putObject } = vi.hoisted(() => {
  const client = {
    whiteboardSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    roomParticipant: {
      findUnique: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
    },
  };
  return {
    prisma: client,
    sendRoomData: vi.fn(async () => undefined),
    putObject: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/livekit/room-service", () => ({
  getRoomService: () => null,
  sendRoomData,
}));
vi.mock("@/lib/storage", () => ({ putObject }));

import { closeWhiteboard, openWhiteboard } from "./whiteboards";

const parentRoom = {
  id: "room-1",
  name: "Town hall",
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  ownerId: "host-1",
  passwordHash: null,
  lobbyEnabled: false,
  locked: false,
  finishedAt: null,
  allowGuests: true,
  signedInOnly: false,
  allowedEmailDomains: [],
  allowScreenShare: true,
  allowChat: true,
  maxParticipants: 25,
  chatRetentionDays: null,
  parentRoomId: null,
  breakoutSessionId: null,
};

const childRoom = { ...parentRoom, id: "child-1", parentRoomId: "room-1" };

function hostParticipation() {
  return {
    id: "p1",
    roomId: "room-1",
    userId: "host-1",
    role: "host" as const,
    banned: false,
    lobbyStatus: "admitted" as const,
  };
}

describe("whiteboards API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a whiteboard session for the host", async () => {
    prisma.room.findUnique.mockResolvedValue(parentRoom);
    prisma.roomParticipant.findUnique.mockResolvedValue(hostParticipation());
    prisma.whiteboardSession.findFirst.mockResolvedValue(null);
    prisma.whiteboardSession.create.mockResolvedValue({
      id: "wb-1",
      roomId: "room-1",
      status: "open",
      openedById: "host-1",
      snapshotKey: null,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      closedAt: null,
    });

    const result = await openWhiteboard({ roomId: "room-1", actorId: "host-1" });

    expect(result.ok).toBe(true);
    expect(sendRoomData).toHaveBeenCalled();
  });

  it("rejects whiteboard open in a child breakout room", async () => {
    prisma.room.findUnique.mockResolvedValue(childRoom);
    prisma.roomParticipant.findUnique.mockResolvedValue({
      ...hostParticipation(),
      roomId: "child-1",
    });

    const result = await openWhiteboard({ roomId: "child-1", actorId: "host-1" });

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "CHILD_CANNOT_HOST",
      message: "Whiteboard is not available in breakout rooms",
    });
    expect(roomCanHostEngagement(childRoom).ok).toBe(false);
  });

  it("closes a session and optionally stores a snapshot", async () => {
    prisma.room.findUnique.mockResolvedValue(parentRoom);
    prisma.roomParticipant.findUnique.mockResolvedValue(hostParticipation());
    prisma.whiteboardSession.findFirst.mockResolvedValue({
      id: "wb-1",
      roomId: "room-1",
      status: "open",
      openedById: "host-1",
      snapshotKey: null,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      closedAt: null,
    });
    prisma.whiteboardSession.update.mockResolvedValue({
      id: "wb-1",
      roomId: "room-1",
      status: "closed",
      openedById: "host-1",
      snapshotKey: "whiteboards/room-1/wb-1.png",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      closedAt: new Date("2026-09-01T00:05:00.000Z"),
    });

    const result = await closeWhiteboard({
      roomId: "room-1",
      actorId: "host-1",
      snapshotPngBase64: Buffer.from("png").toString("base64"),
    });

    expect(result.ok).toBe(true);
    expect(putObject).toHaveBeenCalled();
  });
});
