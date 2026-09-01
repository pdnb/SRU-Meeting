import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, sendRoomData } = vi.hoisted(() => {
  const client = {
    question: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    questionUpvote: {
      findUnique: vi.fn(),
      create: vi.fn(),
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

import { moderateQuestion, submitQuestion } from "./questions";

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

function admitted(role: "host" | "participant") {
  return {
    id: "p1",
    roomId: "room-1",
    userId: role === "host" ? "host-1" : "user-2",
    role,
    banned: false,
    lobbyStatus: "admitted" as const,
  };
}

describe("questions API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.room.findUnique.mockResolvedValue(room);
  });

  it("submits a question for an admitted participant", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue(admitted("participant"));
    prisma.question.create.mockResolvedValue({
      id: "q1",
      roomId: "room-1",
      userId: "user-2",
      body: "When is launch?",
      status: "pending",
      isPinned: false,
      answer: null,
      upvoteCount: 0,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      answeredAt: null,
    });

    const result = await submitQuestion({
      roomId: "room-1",
      userId: "user-2",
      raw: { body: "When is launch?" },
    });

    expect(result.ok).toBe(true);
    expect(sendRoomData).toHaveBeenCalled();
  });

  it("rejects moderator pin from a participant", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue(admitted("participant"));
    prisma.question.findFirst.mockResolvedValue({
      id: "q1",
      roomId: "room-1",
      userId: "user-2",
      body: "When is launch?",
      status: "pending",
      isPinned: false,
      answer: null,
      upvoteCount: 0,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      answeredAt: null,
    });

    const result = await moderateQuestion({
      roomId: "room-1",
      actorId: "user-2",
      raw: { action: "pin", questionId: "q1", value: true },
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only a host or cohost can moderate Q&A",
    });
  });

  it("allows a host to answer a question", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue(admitted("host"));
    prisma.question.findFirst.mockResolvedValue({
      id: "q1",
      roomId: "room-1",
      userId: "user-2",
      body: "When is launch?",
      status: "pending",
      isPinned: false,
      answer: null,
      upvoteCount: 0,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      answeredAt: null,
    });
    prisma.question.findUniqueOrThrow.mockResolvedValue({
      id: "q1",
      roomId: "room-1",
      userId: "user-2",
      body: "When is launch?",
      status: "answered",
      isPinned: false,
      answer: "Next month",
      upvoteCount: 0,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      answeredAt: new Date("2026-09-01T00:10:00.000Z"),
      upvotes: [],
    });

    const result = await moderateQuestion({
      roomId: "room-1",
      actorId: "host-1",
      raw: { action: "answer", questionId: "q1", answer: "Next month" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.question.status).toBe("answered");
    }
  });
});
