import "server-only";

import {
  CreatePollRequestSchema,
  PollSchema,
  VotePollRequestSchema,
  POLL_DATA_TOPIC,
  type Poll,
  type PollPacket,
} from "@sru/shared";
import { prisma } from "@/lib/db";
import { sendRoomData } from "@/lib/livekit/room-service";
import {
  getParticipation,
  getRoomRecord,
  isModeratorRole,
  userMaySeeRoom,
} from "@/lib/rooms";

export { POLL_DATA_TOPIC };

export function roomCanHostEngagement(room: {
  parentRoomId: string | null;
  finishedAt: Date | null;
}): { ok: true } | { ok: false; code: "CHILD_CANNOT_HOST" | "ROOM_CLOSED" } {
  if (room.parentRoomId !== null) {
    return { ok: false, code: "CHILD_CANNOT_HOST" };
  }
  if (room.finishedAt !== null) {
    return { ok: false, code: "ROOM_CLOSED" };
  }
  return { ok: true };
}

async function moderatorForRoom(
  roomId: string,
  userId: string,
): Promise<
  | { ok: true; role: "host" | "cohost" }
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
      message: "Only a host or cohost can perform this action",
    };
  }
  return { ok: true, role: role as "host" | "cohost" };
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

function toPollDto(
  row: {
    id: string;
    roomId: string;
    question: string;
    status: "open" | "closed";
    createdById: string;
    createdAt: Date;
    closedAt: Date | null;
    options: { id: string; label: string; sortOrder: number; _count?: { votes: number } }[];
    votes?: { optionId: string }[];
  },
  myVoteOptionId?: string | null,
): Poll {
  return PollSchema.parse({
    id: row.id,
    roomId: row.roomId,
    question: row.question,
    status: row.status,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    options: row.options
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((option) => ({
        id: option.id,
        label: option.label,
        voteCount: option._count?.votes ?? 0,
      })),
    myVoteOptionId: myVoteOptionId ?? row.votes?.[0]?.optionId ?? null,
  });
}

async function broadcastPollPacket(roomId: string, packet: PollPacket) {
  await sendRoomData(
    roomId,
    new TextEncoder().encode(JSON.stringify(packet)),
    POLL_DATA_TOPIC,
  );
}

export async function getOpenPoll(input: {
  roomId: string;
  userId: string;
}): Promise<
  | { ok: true; poll: Poll | null }
  | { ok: false; status: number; code: string; message: string }
> {
  const member = await admittedMember(input.roomId, input.userId);
  if (!member.ok) {
    return member;
  }
  const poll = await prisma.poll.findFirst({
    where: { roomId: input.roomId, status: "open" },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
      votes: { where: { userId: input.userId }, take: 1 },
    },
  });
  if (!poll) {
    return { ok: true, poll: null };
  }
  return { ok: true, poll: toPollDto(poll) };
}

export async function createPoll(input: {
  roomId: string;
  actorId: string;
  raw: unknown;
}): Promise<
  | { ok: true; poll: Poll }
  | { ok: false; status: number; code: string; message: string }
> {
  const mod = await moderatorForRoom(input.roomId, input.actorId);
  if (!mod.ok) {
    return mod;
  }
  const room = await getRoomRecord(input.roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  const hostCheck = roomCanHostEngagement(room);
  if (!hostCheck.ok) {
    return {
      ok: false,
      status: 403,
      code: hostCheck.code,
      message: "Polls are not available in this room",
    };
  }
  const parsed = CreatePollRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid poll payload",
    };
  }
  const existing = await prisma.poll.findFirst({
    where: { roomId: input.roomId, status: "open" },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      status: 409,
      code: "POLL_ALREADY_OPEN",
      message: "Close the current poll before starting a new one",
    };
  }
  const uniqueOptions = [
    ...new Set(parsed.data.options.map((label) => label.trim())),
  ];
  if (uniqueOptions.length < 2) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Provide at least two unique options",
    };
  }
  const created = await prisma.poll.create({
    data: {
      roomId: input.roomId,
      question: parsed.data.question,
      createdById: input.actorId,
      options: {
        create: uniqueOptions.map((label, index) => ({
          label,
          sortOrder: index,
        })),
      },
    },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
    },
  });
  const poll = toPollDto(created, null);
  await broadcastPollPacket(input.roomId, { type: "poll.created", poll });
  return { ok: true, poll };
}

export async function votePoll(input: {
  roomId: string;
  userId: string;
  raw: unknown;
}): Promise<
  | { ok: true; poll: Poll }
  | { ok: false; status: number; code: string; message: string }
> {
  const member = await admittedMember(input.roomId, input.userId);
  if (!member.ok) {
    return member;
  }
  const parsed = VotePollRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid vote payload",
    };
  }
  const poll = await prisma.poll.findFirst({
    where: { roomId: input.roomId, status: "open" },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
    },
  });
  if (!poll) {
    return {
      ok: false,
      status: 404,
      code: "NO_OPEN_POLL",
      message: "There is no open poll in this room",
    };
  }
  const option = poll.options.find((row) => row.id === parsed.data.optionId);
  if (!option) {
    return {
      ok: false,
      status: 404,
      code: "OPTION_NOT_FOUND",
      message: "That option is not part of the open poll",
    };
  }
  await prisma.pollVote.upsert({
    where: {
      pollId_userId: { pollId: poll.id, userId: input.userId },
    },
    update: { optionId: parsed.data.optionId },
    create: {
      pollId: poll.id,
      optionId: parsed.data.optionId,
      userId: input.userId,
    },
  });
  const refreshed = await prisma.poll.findUniqueOrThrow({
    where: { id: poll.id },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
      votes: { where: { userId: input.userId }, take: 1 },
    },
  });
  const dto = toPollDto(refreshed);
  const voteCounts = Object.fromEntries(
    dto.options.map((row) => [row.id, row.voteCount]),
  );
  await broadcastPollPacket(input.roomId, {
    type: "poll.voted",
    pollId: poll.id,
    optionId: parsed.data.optionId,
    userId: input.userId,
    voteCounts,
  });
  return { ok: true, poll: dto };
}

export async function closePoll(input: {
  roomId: string;
  actorId: string;
}): Promise<
  | { ok: true; poll: Poll }
  | { ok: false; status: number; code: string; message: string }
> {
  const mod = await moderatorForRoom(input.roomId, input.actorId);
  if (!mod.ok) {
    return mod;
  }
  const poll = await prisma.poll.findFirst({
    where: { roomId: input.roomId, status: "open" },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
    },
  });
  if (!poll) {
    return {
      ok: false,
      status: 404,
      code: "NO_OPEN_POLL",
      message: "There is no open poll to close",
    };
  }
  const closed = await prisma.poll.update({
    where: { id: poll.id },
    data: { status: "closed", closedAt: new Date() },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
    },
  });
  const dto = toPollDto(closed, null);
  await broadcastPollPacket(input.roomId, {
    type: "poll.closed",
    pollId: poll.id,
    poll: dto,
  });
  return { ok: true, poll: dto };
}

export function isCreatePollBody(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) {
    return false;
  }
  return "question" in raw || "options" in raw;
}
