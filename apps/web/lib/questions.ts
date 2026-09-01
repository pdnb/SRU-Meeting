import "server-only";

import {
  ModerateQuestionRequestSchema,
  QuestionSchema,
  SubmitQuestionRequestSchema,
  type QaPacket,
  type Question,
} from "@sru/shared";
import { QA_DATA_TOPIC } from "@sru/shared";
import { prisma } from "@/lib/db";
import { sendRoomData } from "@/lib/livekit/room-service";
import {
  getParticipation,
  getRoomRecord,
  isModeratorRole,
  userMaySeeRoom,
} from "@/lib/rooms";

export { QA_DATA_TOPIC };

function toQuestionDto(
  row: {
    id: string;
    roomId: string;
    userId: string;
    body: string;
    status: "pending" | "answered" | "dismissed";
    isPinned: boolean;
    answer: string | null;
    upvoteCount: number;
    createdAt: Date;
    answeredAt: Date | null;
  },
  hasUpvoted?: boolean,
): Question {
  return QuestionSchema.parse({
    id: row.id,
    roomId: row.roomId,
    userId: row.userId,
    body: row.body,
    status: row.status,
    isPinned: row.isPinned,
    answer: row.answer,
    upvoteCount: row.upvoteCount,
    createdAt: row.createdAt.toISOString(),
    answeredAt: row.answeredAt ? row.answeredAt.toISOString() : null,
    hasUpvoted,
  });
}

async function broadcastQaPacket(roomId: string, packet: QaPacket) {
  await sendRoomData(
    roomId,
    new TextEncoder().encode(JSON.stringify(packet)),
    QA_DATA_TOPIC,
  );
}

async function admittedMember(
  roomId: string,
  userId: string,
): Promise<
  | { ok: true }
  | { ok: false; status: number; code: string; message: string }
> {
  const room = await getRoomRecord(roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  const participation = await getParticipation(roomId, userId);
  if (
    !userMaySeeRoom(userId, room, participation) ||
    participation?.lobbyStatus !== "admitted" ||
    participation?.banned
  ) {
    return {
      ok: false,
      status: 403,
      code: "NOT_IN_ROOM",
      message: "You must be in the room",
    };
  }
  return { ok: true };
}

async function moderatorForRoom(
  roomId: string,
  userId: string,
): Promise<
  | { ok: true }
  | { ok: false; status: number; code: string; message: string }
> {
  const room = await getRoomRecord(roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  const participation = await getParticipation(roomId, userId);
  const role =
    participation?.role ?? (room.ownerId === userId ? "host" : null);
  if (!role || !isModeratorRole(role)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only a host or cohost can moderate Q&A",
    };
  }
  return { ok: true };
}

export async function listQuestions(input: {
  roomId: string;
  userId: string;
}): Promise<
  | { ok: true; questions: Question[] }
  | { ok: false; status: number; code: string; message: string }
> {
  const member = await admittedMember(input.roomId, input.userId);
  if (!member.ok) {
    return member;
  }
  const rows = await prisma.question.findMany({
    where: {
      roomId: input.roomId,
      status: { not: "dismissed" },
    },
    orderBy: [{ isPinned: "desc" }, { upvoteCount: "desc" }, { createdAt: "asc" }],
    take: 200,
    include: {
      upvotes: { where: { userId: input.userId }, take: 1 },
    },
  });
  return {
    ok: true,
    questions: rows.map((row) =>
      toQuestionDto(row, row.upvotes.length > 0),
    ),
  };
}

export async function submitQuestion(input: {
  roomId: string;
  userId: string;
  raw: unknown;
}): Promise<
  | { ok: true; question: Question }
  | { ok: false; status: number; code: string; message: string }
> {
  const member = await admittedMember(input.roomId, input.userId);
  if (!member.ok) {
    return member;
  }
  const parsed = SubmitQuestionRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid question payload",
    };
  }
  const row = await prisma.question.create({
    data: {
      roomId: input.roomId,
      userId: input.userId,
      body: parsed.data.body,
    },
  });
  const question = toQuestionDto(row, false);
  await broadcastQaPacket(input.roomId, { type: "qa.submitted", question });
  return { ok: true, question };
}

export async function moderateQuestion(input: {
  roomId: string;
  actorId: string;
  raw: unknown;
}): Promise<
  | { ok: true; question: Question }
  | { ok: false; status: number; code: string; message: string }
> {
  const parsed = ModerateQuestionRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid moderation payload",
    };
  }

  if (parsed.data.action === "upvote") {
    const member = await admittedMember(input.roomId, input.actorId);
    if (!member.ok) {
      return member;
    }
  } else {
    const mod = await moderatorForRoom(input.roomId, input.actorId);
    if (!mod.ok) {
      return mod;
    }
  }

  const existing = await prisma.question.findFirst({
    where: { id: parsed.data.questionId, roomId: input.roomId },
  });
  if (!existing) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "Question not found",
    };
  }

  if (parsed.data.action === "upvote") {
    const prior = await prisma.questionUpvote.findUnique({
      where: {
        questionId_userId: {
          questionId: parsed.data.questionId,
          userId: input.actorId,
        },
      },
    });
    if (!prior) {
      await prisma.questionUpvote.create({
        data: {
          questionId: parsed.data.questionId,
          userId: input.actorId,
        },
      });
      await prisma.question.update({
        where: { id: parsed.data.questionId },
        data: { upvoteCount: { increment: 1 } },
      });
    }
  } else if (parsed.data.action === "pin") {
    await prisma.question.update({
      where: { id: parsed.data.questionId },
      data: { isPinned: parsed.data.value },
    });
  } else if (parsed.data.action === "answer") {
    await prisma.question.update({
      where: { id: parsed.data.questionId },
      data: {
        status: "answered",
        answer: parsed.data.answer,
        answeredAt: new Date(),
      },
    });
  } else if (parsed.data.action === "dismiss") {
    await prisma.question.update({
      where: { id: parsed.data.questionId },
      data: { status: "dismissed" },
    });
  }

  const row = await prisma.question.findUniqueOrThrow({
    where: { id: parsed.data.questionId },
    include: {
      upvotes: { where: { userId: input.actorId }, take: 1 },
    },
  });
  const question = toQuestionDto(row, row.upvotes.length > 0);
  await broadcastQaPacket(input.roomId, { type: "qa.updated", question });
  return { ok: true, question };
}

export function isModerationBody(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) {
    return false;
  }
  return "action" in raw && "questionId" in raw;
}
