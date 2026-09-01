import { beforeEach, describe, expect, it, vi } from "vitest";
import { roomCanHostEngagement } from "./polls";

describe("roomCanHostEngagement", () => {
  it("allows a top-level room", () => {
    expect(
      roomCanHostEngagement({ parentRoomId: null, finishedAt: null }),
    ).toEqual({ ok: true });
  });

  it("rejects a child breakout room", () => {
    expect(
      roomCanHostEngagement({
        parentRoomId: "room-parent",
        finishedAt: null,
      }),
    ).toEqual({ ok: false, code: "CHILD_CANNOT_HOST" });
  });
});

const { prisma, sendRoomData } = vi.hoisted(() => {
  const client = {
    poll: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pollVote: {
      upsert: vi.fn(),
    },
    roomParticipant: {
      findUnique: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
    },
  };
  return { prisma: client, sendRoomData: vi.fn(async () => undefined) };
});

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/livekit/room-service", () => ({
  getRoomService: () => null,
  sendRoomData,
}));

import { closePoll, createPoll, votePoll } from "./polls";

const room = {
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

function participantParticipation() {
  return {
    id: "p2",
    roomId: "room-1",
    userId: "user-2",
    role: "participant" as const,
    banned: false,
    lobbyStatus: "admitted" as const,
  };
}

describe("polls API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.room.findUnique.mockResolvedValue(room);
  });

  it("creates a poll for a host", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue(hostParticipation());
    prisma.poll.findFirst.mockResolvedValue(null);
    prisma.poll.create.mockResolvedValue({
      id: "poll-1",
      roomId: "room-1",
      question: "Ready?",
      status: "open",
      createdById: "host-1",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      closedAt: null,
      options: [
        { id: "opt-a", label: "Yes", sortOrder: 0, _count: { votes: 0 } },
        { id: "opt-b", label: "No", sortOrder: 1, _count: { votes: 0 } },
      ],
    });

    const result = await createPoll({
      roomId: "room-1",
      actorId: "host-1",
      raw: { question: "Ready?", options: ["Yes", "No"] },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.poll.question).toBe("Ready?");
    }
    expect(sendRoomData).toHaveBeenCalled();
  });

  it("rejects poll creation from a participant", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue(participantParticipation());

    const result = await createPoll({
      roomId: "room-1",
      actorId: "user-2",
      raw: { question: "Ready?", options: ["Yes", "No"] },
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only a host or cohost can perform this action",
    });
  });

  it("votes idempotently and broadcasts counts", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue(participantParticipation());
    prisma.poll.findFirst.mockResolvedValue({
      id: "poll-1",
      roomId: "room-1",
      question: "Ready?",
      status: "open",
      createdById: "host-1",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      closedAt: null,
      options: [
        { id: "opt-a", label: "Yes", sortOrder: 0, _count: { votes: 1 } },
        { id: "opt-b", label: "No", sortOrder: 1, _count: { votes: 0 } },
      ],
    });
    prisma.pollVote.upsert.mockResolvedValue({});
    prisma.poll.findUniqueOrThrow.mockResolvedValue({
      id: "poll-1",
      roomId: "room-1",
      question: "Ready?",
      status: "open",
      createdById: "host-1",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      closedAt: null,
      options: [
        { id: "opt-a", label: "Yes", sortOrder: 0, _count: { votes: 1 } },
        { id: "opt-b", label: "No", sortOrder: 1, _count: { votes: 0 } },
      ],
      votes: [{ optionId: "opt-a" }],
    });

    const result = await votePoll({
      roomId: "room-1",
      userId: "user-2",
      raw: { optionId: "opt-a" },
    });

    expect(result.ok).toBe(true);
    expect(prisma.pollVote.upsert).toHaveBeenCalled();
    expect(sendRoomData).toHaveBeenCalled();
  });

  it("closes an open poll for a host", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue(hostParticipation());
    prisma.poll.findFirst.mockResolvedValue({
      id: "poll-1",
      roomId: "room-1",
      question: "Ready?",
      status: "open",
      createdById: "host-1",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      closedAt: null,
      options: [
        { id: "opt-a", label: "Yes", sortOrder: 0, _count: { votes: 2 } },
        { id: "opt-b", label: "No", sortOrder: 1, _count: { votes: 1 } },
      ],
    });
    prisma.poll.update.mockResolvedValue({
      id: "poll-1",
      roomId: "room-1",
      question: "Ready?",
      status: "closed",
      createdById: "host-1",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      closedAt: new Date("2026-09-01T00:05:00.000Z"),
      options: [
        { id: "opt-a", label: "Yes", sortOrder: 0, _count: { votes: 2 } },
        { id: "opt-b", label: "No", sortOrder: 1, _count: { votes: 1 } },
      ],
    });

    const result = await closePoll({ roomId: "room-1", actorId: "host-1" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.poll.status).toBe("closed");
    }
  });
});
