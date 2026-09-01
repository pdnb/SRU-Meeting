import "server-only";

import {
  BreakoutActionRequestSchema,
  BreakoutSessionSchema,
  CreateBreakoutsRequestSchema,
  type BreakoutPacket,
  type BreakoutSession,
  type CreateBreakoutsRequest,
} from "@sru/shared";
import type { RoomRole } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { BREAKOUT_DATA_TOPIC } from "@/lib/breakout-ui";
import { ensureLiveKitRoom, sendRoomData } from "@/lib/livekit/room-service";
import {
  getParticipation,
  getRoomRecord,
  isModeratorRole,
  roomIsAtCapacity,
  userMaySeeRoom,
} from "@/lib/rooms";
import { assertE2eeCompatible } from "@/lib/e2ee/policy";

export function parentCanHostBreakouts(room: {
  parentRoomId: string | null;
  finishedAt: Date | null;
}): { ok: true } | { ok: false; code: "CHILD_CANNOT_HOST_BREAKOUTS" | "ROOM_CLOSED" } {
  if (room.parentRoomId !== null) {
    return { ok: false, code: "CHILD_CANNOT_HOST_BREAKOUTS" };
  }
  if (room.finishedAt !== null) {
    return { ok: false, code: "ROOM_CLOSED" };
  }
  return { ok: true };
}

export function evenSplitAssignments(
  userIds: string[],
  childRoomIds: string[],
): { userId: string; childRoomId: string }[] {
  if (childRoomIds.length === 0) {
    return [];
  }
  return userIds.map((userId, index) => ({
    userId,
    childRoomId: childRoomIds[index % childRoomIds.length] ?? childRoomIds[0],
  }));
}

export function canMintBreakoutChildToken(input: {
  childRoomId: string;
  sessionStatus: "open" | "closed" | null;
  assignedChildRoomId: string | null;
  parentRole: RoomRole | null;
  isParentOwner: boolean;
  parentBanned: boolean;
}): { ok: true; role: RoomRole } | { ok: false; code: "NOT_ASSIGNED" | "SESSION_CLOSED" | "BANNED" } {
  if (input.parentBanned) {
    return { ok: false, code: "BANNED" };
  }
  if (input.sessionStatus !== "open") {
    return { ok: false, code: "SESSION_CLOSED" };
  }
  const parentModerator =
    input.isParentOwner ||
    input.parentRole === "host" ||
    input.parentRole === "cohost";
  if (parentModerator) {
    return {
      ok: true,
      role: input.parentRole === "cohost" ? "cohost" : "host",
    };
  }
  if (input.assignedChildRoomId === input.childRoomId) {
    return { ok: true, role: "participant" };
  }
  return { ok: false, code: "NOT_ASSIGNED" };
}

export function canBroadcastBreakout(input: {
  role: RoomRole | null;
  isOwner: boolean;
}): boolean {
  return input.isOwner || (input.role !== null && isModeratorRole(input.role));
}

export function canRequestBreakoutHelp(input: {
  role: RoomRole | null;
  assignedChildRoomId: string | null;
}): boolean {
  if (input.role === "host" || input.role === "cohost") {
    return false;
  }
  return input.assignedChildRoomId !== null;
}

export function canClaimBreakout(input: {
  assignmentMode: "auto" | "manual" | "self_pick";
  sessionStatus: "open" | "closed";
  role: RoomRole | null;
  isOwner: boolean;
  childRoomId: string;
  childBelongsToSession: boolean;
  alreadyAssignedChildId: string | null;
  assignedCountOnChild: number;
  maxParticipants: number;
}):
  | { ok: true }
  | {
      ok: false;
      code: "NOT_SELF_PICK" | "SESSION_CLOSED" | "FORBIDDEN" | "NOT_FOUND" | "FULL";
    } {
  if (input.sessionStatus !== "open") {
    return { ok: false, code: "SESSION_CLOSED" };
  }
  if (input.assignmentMode !== "self_pick") {
    return { ok: false, code: "NOT_SELF_PICK" };
  }
  if (input.isOwner || input.role !== "participant") {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (!input.childBelongsToSession) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (input.alreadyAssignedChildId === input.childRoomId) {
    return { ok: true };
  }
  if (roomIsAtCapacity(input.assignedCountOnChild, input.maxParticipants)) {
    return { ok: false, code: "FULL" };
  }
  return { ok: true };
}

export function breakoutSendRooms(input: {
  action: "broadcast" | "help" | "recall";
  parentRoomId: string;
  childRoomIds: string[];
}): string[] {
  if (input.action === "help") {
    return [input.parentRoomId];
  }
  return input.childRoomIds;
}

export async function assertBreakoutChildJoin(input: {
  userId: string;
  child: {
    id: string;
    parentRoomId: string | null;
    breakoutSessionId: string | null;
  };
}): Promise<
  | { ok: true; role: RoomRole }
  | { ok: false; status: number; code: string; message: string }
> {
  if (!input.child.parentRoomId) {
    return { ok: true, role: "participant" };
  }
  const parent = await getRoomRecord(input.child.parentRoomId);
  if (!parent) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Parent room not found" };
  }
  const parentE2eeGate = assertE2eeCompatible(parent, "breakouts");
  if (!parentE2eeGate.ok) {
    return parentE2eeGate;
  }
  const parentParticipation = await getParticipation(
    input.child.parentRoomId,
    input.userId,
  );
  const session = input.child.breakoutSessionId
    ? await prisma.breakoutSession.findUnique({
        where: { id: input.child.breakoutSessionId },
      })
    : null;
  const assignment = session
    ? await prisma.breakoutAssignment.findUnique({
        where: {
          sessionId_userId: { sessionId: session.id, userId: input.userId },
        },
      })
    : null;
  const gate = canMintBreakoutChildToken({
    childRoomId: input.child.id,
    sessionStatus: session?.status ?? null,
    assignedChildRoomId: assignment?.childRoomId ?? null,
    parentRole: parentParticipation?.role ?? null,
    isParentOwner: parent.ownerId === input.userId,
    parentBanned: Boolean(parentParticipation?.banned),
  });
  if (!gate.ok) {
    const message =
      gate.code === "NOT_ASSIGNED"
        ? "You are not assigned to this breakout room"
        : gate.code === "BANNED"
          ? "You are banned from this room"
          : "This breakout session is closed";
    return { ok: false, status: 403, code: gate.code, message };
  }
  return gate;
}

function toBreakoutSessionDto(row: {
  id: string;
  parentRoomId: string;
  status: "open" | "closed";
  assignmentMode: "auto" | "manual" | "self_pick";
  endsAt: Date | null;
  createdAt: Date;
  childRooms?: { id: string }[];
  assignments?: { userId: string; childRoomId: string }[];
}): BreakoutSession {
  return BreakoutSessionSchema.parse({
    id: row.id,
    parentRoomId: row.parentRoomId,
    status: row.status,
    assignmentMode: row.assignmentMode,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    childRoomIds: row.childRooms?.map((child) => child.id),
    assignments: row.assignments?.map((row) => ({
      userId: row.userId,
      childRoomId: row.childRoomId,
    })),
  });
}

function childRoomName(parentName: string, index: number): string {
  const suffix = ` · ${index + 1}`;
  const maxBase = 120 - suffix.length;
  const base =
    parentName.length > maxBase ? parentName.slice(0, maxBase) : parentName;
  return `${base}${suffix}`;
}

function resolveChildCount(
  input: CreateBreakoutsRequest,
): { ok: true; count: number } | { ok: false } {
  if (input.mode === "manual") {
    const fromGroups = input.assignments?.length
      ? Math.max(...input.assignments.map((row) => row.groupIndex)) + 1
      : 0;
    const count = input.count ?? fromGroups;
    if (count < 1) {
      return { ok: false };
    }
    if (input.assignments?.some((row) => row.groupIndex >= count)) {
      return { ok: false };
    }
    return { ok: true, count };
  }
  if (input.count == null) {
    return { ok: false };
  }
  return { ok: true, count: input.count };
}

type ActorFail =
  | { ok: false; status: 403 | 404; code: string; message: string }
  | {
      ok: true;
      room: NonNullable<Awaited<ReturnType<typeof getRoomRecord>>>;
      role: RoomRole | null;
    };

async function loadParentRoom(input: {
  roomId: string;
  actorId: string;
  asModerator: boolean;
}): Promise<ActorFail> {
  const room = await getRoomRecord(input.roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  const participation = await getParticipation(input.roomId, input.actorId);
  if (participation?.banned) {
    return { ok: false, status: 403, code: "BANNED", message: "You are banned from this room" };
  }
  const role =
    participation?.role ?? (room.ownerId === input.actorId ? "host" : null);
  if (input.asModerator) {
    if (!role || !isModeratorRole(role)) {
      return {
        ok: false,
        status: 403,
        code: "FORBIDDEN",
        message: "Only a host or cohost can manage breakouts",
      };
    }
  } else if (!userMaySeeRoom(input.actorId, room, participation)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "You cannot view this room",
    };
  }
  return { ok: true, room, role };
}

const sessionInclude = {
  childRooms: { select: { id: true }, orderBy: { createdAt: "asc" as const } },
  assignments: { select: { userId: true, childRoomId: true } },
};

export async function getOpenBreakout(input: {
  roomId: string;
  actorId: string;
}): Promise<
  | { ok: true; session: BreakoutSession | null }
  | { ok: false; status: number; code: string; message: string }
> {
  const loaded = await loadParentRoom({
    roomId: input.roomId,
    actorId: input.actorId,
    asModerator: false,
  });
  if (!loaded.ok) {
    return loaded;
  }
  const hostable = parentCanHostBreakouts(loaded.room);
  if (!hostable.ok) {
    return {
      ok: false,
      status: 403,
      code: hostable.code,
      message: "Breakouts can only be listed on a parent room",
    };
  }
  const session = await prisma.breakoutSession.findFirst({
    where: { parentRoomId: input.roomId, status: "open" },
    include: sessionInclude,
  });
  return { ok: true, session: session ? toBreakoutSessionDto(session) : null };
}

export async function createBreakouts(input: {
  roomId: string;
  actorId: string;
  raw: unknown;
}): Promise<
  | { ok: true; session: BreakoutSession }
  | { ok: false; status: number; code: string; message: string }
> {
  const parsed = CreateBreakoutsRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid breakout request",
    };
  }
  const loaded = await loadParentRoom({
    roomId: input.roomId,
    actorId: input.actorId,
    asModerator: true,
  });
  if (!loaded.ok) {
    return loaded;
  }
  const e2eeGate = assertE2eeCompatible(loaded.room, "breakouts");
  if (!e2eeGate.ok) {
    return e2eeGate;
  }
  const hostable = parentCanHostBreakouts(loaded.room);
  if (!hostable.ok) {
    return {
      ok: false,
      status: 403,
      code: hostable.code,
      message:
        hostable.code === "ROOM_CLOSED"
          ? "This room is closed"
          : "A breakout room cannot host nested breakouts",
    };
  }
  const count = resolveChildCount(parsed.data);
  if (!count.ok) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Breakout count or assignments are required",
    };
  }
  const existing = await prisma.breakoutSession.findFirst({
    where: { parentRoomId: input.roomId, status: "open" },
  });
  if (existing) {
    return {
      ok: false,
      status: 409,
      code: "SESSION_OPEN",
      message: "This room already has an open breakout session",
    };
  }

  const endsAt =
    parsed.data.durationSeconds == null
      ? null
      : new Date(Date.now() + parsed.data.durationSeconds * 1000);

  const created = await prisma.$transaction(async (tx) => {
    const session = await tx.breakoutSession.create({
      data: {
        parentRoomId: loaded.room.id,
        assignmentMode: parsed.data.mode,
        endsAt,
      },
    });
    const childRooms = [];
    for (let index = 0; index < count.count; index += 1) {
      childRooms.push(
        await tx.room.create({
          data: {
            name: childRoomName(loaded.room.name, index),
            ownerId: loaded.room.ownerId,
            parentRoomId: loaded.room.id,
            breakoutSessionId: session.id,
            passwordHash: null,
            lobbyEnabled: false,
            allowGuests: false,
            signedInOnly: true,
            allowScreenShare: loaded.room.allowScreenShare,
            allowChat: loaded.room.allowChat,
            maxParticipants: loaded.room.maxParticipants,
          },
        }),
      );
    }
    const childRoomIds = childRooms.map((child) => child.id);
    let assignmentRows: { userId: string; childRoomId: string }[] = [];
    if (parsed.data.mode === "auto") {
      const members = await tx.roomParticipant.findMany({
        where: {
          roomId: loaded.room.id,
          banned: false,
          lobbyStatus: "admitted",
          role: "participant",
        },
        select: { userId: true },
        orderBy: { userId: "asc" },
      });
      assignmentRows = evenSplitAssignments(
        members.map((row) => row.userId),
        childRoomIds,
      );
    } else if (parsed.data.mode === "manual" && parsed.data.assignments) {
      assignmentRows = parsed.data.assignments.map((row) => ({
        userId: row.userId,
        childRoomId: childRoomIds[row.groupIndex] ?? childRoomIds[0],
      }));
    }
    if (assignmentRows.length > 0) {
      await tx.breakoutAssignment.createMany({
        data: assignmentRows.map((row) => ({
          sessionId: session.id,
          userId: row.userId,
          childRoomId: row.childRoomId,
        })),
      });
    }
    return {
      ...session,
      childRooms: childRooms.map((child) => ({ id: child.id })),
      assignments: assignmentRows,
    };
  });

  await writeAudit({
    actorId: input.actorId,
    action: "breakout.open",
    targetType: "room",
    targetId: input.roomId,
    metadata: { sessionId: created.id, mode: parsed.data.mode },
  });

  await Promise.all(
    created.childRooms.map((child) => ensureLiveKitRoom(child.id)),
  );

  return { ok: true, session: toBreakoutSessionDto(created) };
}

export async function closeBreakouts(input: {
  roomId: string;
  actorId: string;
}): Promise<
  | { ok: true; session: BreakoutSession }
  | { ok: false; status: number; code: string; message: string }
> {
  const loaded = await loadParentRoom({
    roomId: input.roomId,
    actorId: input.actorId,
    asModerator: true,
  });
  if (!loaded.ok) {
    return loaded;
  }
  const hostable = parentCanHostBreakouts(loaded.room);
  if (!hostable.ok) {
    return {
      ok: false,
      status: 403,
      code: hostable.code,
      message: "Breakouts can only be closed on a parent room",
    };
  }
  const session = await prisma.breakoutSession.findFirst({
    where: { parentRoomId: input.roomId, status: "open" },
  });
  if (!session) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "No open breakout session",
    };
  }
  const closed = await finishBreakoutSession(session.id);
  await writeAudit({
    actorId: input.actorId,
    action: "breakout.close",
    targetType: "room",
    targetId: input.roomId,
    metadata: { sessionId: session.id },
  });
  return { ok: true, session: toBreakoutSessionDto(closed) };
}

export async function closeOpenBreakoutsForParent(
  parentRoomId: string,
): Promise<void> {
  const session = await prisma.breakoutSession.findFirst({
    where: { parentRoomId, status: "open" },
  });
  if (!session) {
    return;
  }
  await finishBreakoutSession(session.id);
}

async function sendBreakoutPackets(
  roomIds: string[],
  packet: BreakoutPacket,
): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(packet));
  await Promise.all(
    roomIds.map((roomId) => sendRoomData(roomId, bytes, BREAKOUT_DATA_TOPIC)),
  );
}

function claimFailStatus(code: string): number {
  if (code === "NOT_FOUND") {
    return 404;
  }
  if (code === "FULL") {
    return 409;
  }
  return 403;
}

function claimFailMessage(code: string): string {
  if (code === "NOT_SELF_PICK") {
    return "This session does not allow choosing a room";
  }
  if (code === "FULL") {
    return "That breakout room is full";
  }
  if (code === "NOT_FOUND") {
    return "Breakout room not found";
  }
  if (code === "SESSION_CLOSED") {
    return "This breakout session is closed";
  }
  return "Only an admitted participant can claim a breakout room";
}

export async function applyBreakoutAction(input: {
  roomId: string;
  actorId: string;
  raw: unknown;
}): Promise<
  | { ok: true; packet: BreakoutPacket; assignment?: undefined }
  | {
      ok: true;
      packet?: undefined;
      assignment: { userId: string; childRoomId: string };
    }
  | { ok: false; status: number; code: string; message: string }
> {
  const parsed = BreakoutActionRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid breakout action",
    };
  }
  const room = await getRoomRecord(input.roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  if (
    (parsed.data.action === "broadcast" || parsed.data.action === "recall") &&
    room.parentRoomId
  ) {
    return {
      ok: false,
      status: 403,
      code: "CHILD_CANNOT_HOST_BREAKOUTS",
      message: "Broadcast and recall run from the parent room",
    };
  }
  const parentId = room.parentRoomId ?? room.id;
  const loaded = await loadParentRoom({
    roomId: parentId,
    actorId: input.actorId,
    asModerator:
      parsed.data.action !== "help" && parsed.data.action !== "claim",
  });
  if (!loaded.ok) {
    return loaded;
  }
  const session = await prisma.breakoutSession.findFirst({
    where: { parentRoomId: parentId, status: "open" },
    include: sessionInclude,
  });
  if (!session) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "No open breakout session",
    };
  }
  const isOwner = loaded.room.ownerId === input.actorId;
  const childRoomIds = session.childRooms.map((child) => child.id);

  if (parsed.data.action === "broadcast") {
    if (!canBroadcastBreakout({ role: loaded.role, isOwner })) {
      return {
        ok: false,
        status: 403,
        code: "FORBIDDEN",
        message: "Only a host or cohost can broadcast",
      };
    }
    const packet: BreakoutPacket = {
      type: "breakout.broadcast",
      sessionId: session.id,
      body: parsed.data.body,
      senderId: input.actorId,
    };
    await sendBreakoutPackets(
      breakoutSendRooms({
        action: "broadcast",
        parentRoomId: parentId,
        childRoomIds,
      }),
      packet,
    );
    await writeAudit({
      actorId: input.actorId,
      action: "breakout.broadcast",
      targetType: "room",
      targetId: parentId,
      metadata: { sessionId: session.id },
    });
    return { ok: true, packet };
  }

  if (parsed.data.action === "help") {
    const assignment = await prisma.breakoutAssignment.findUnique({
      where: {
        sessionId_userId: { sessionId: session.id, userId: input.actorId },
      },
    });
    if (
      !canRequestBreakoutHelp({
        role: loaded.role,
        assignedChildRoomId: assignment?.childRoomId ?? null,
      })
    ) {
      return {
        ok: false,
        status: 403,
        code: "FORBIDDEN",
        message: "Only an assigned participant can request help",
      };
    }
    const childRoomId = room.parentRoomId ? room.id : assignment!.childRoomId;
    if (room.parentRoomId && assignment?.childRoomId !== room.id) {
      return {
        ok: false,
        status: 403,
        code: "NOT_ASSIGNED",
        message: "You are not assigned to this breakout room",
      };
    }
    const packet: BreakoutPacket = {
      type: "breakout.help",
      sessionId: session.id,
      childRoomId,
      userId: input.actorId,
    };
    await sendBreakoutPackets(
      breakoutSendRooms({
        action: "help",
        parentRoomId: parentId,
        childRoomIds,
      }),
      packet,
    );
    await writeAudit({
      actorId: input.actorId,
      action: "breakout.help",
      targetType: "room",
      targetId: parentId,
      metadata: { sessionId: session.id, childRoomId },
    });
    return { ok: true, packet };
  }

  if (parsed.data.action === "claim") {
    const childRoomId = parsed.data.childRoomId;
    const persisted = await prisma.$transaction(async (tx) => {
      const existing = await tx.breakoutAssignment.findUnique({
        where: {
          sessionId_userId: { sessionId: session.id, userId: input.actorId },
        },
      });
      const assignedCountOnChild = await tx.breakoutAssignment.count({
        where: { sessionId: session.id, childRoomId },
      });
      const gate = canClaimBreakout({
        assignmentMode: session.assignmentMode,
        sessionStatus: session.status,
        role: loaded.role,
        isOwner,
        childRoomId,
        childBelongsToSession: childRoomIds.includes(childRoomId),
        alreadyAssignedChildId: existing?.childRoomId ?? null,
        assignedCountOnChild,
        maxParticipants: loaded.room.maxParticipants,
      });
      if (!gate.ok) {
        return { ok: false as const, code: gate.code };
      }
      if (existing?.childRoomId === childRoomId) {
        return {
          ok: true as const,
          assignment: {
            userId: existing.userId,
            childRoomId: existing.childRoomId,
          },
        };
      }
      const row = existing
        ? await tx.breakoutAssignment.update({
            where: {
              sessionId_userId: {
                sessionId: session.id,
                userId: input.actorId,
              },
            },
            data: { childRoomId },
          })
        : await tx.breakoutAssignment.create({
            data: {
              sessionId: session.id,
              userId: input.actorId,
              childRoomId,
            },
          });
      return {
        ok: true as const,
        assignment: { userId: row.userId, childRoomId: row.childRoomId },
      };
    });
    if (!persisted.ok) {
      return {
        ok: false,
        status: claimFailStatus(persisted.code),
        code: persisted.code,
        message: claimFailMessage(persisted.code),
      };
    }
    await writeAudit({
      actorId: input.actorId,
      action: "breakout.claim",
      targetType: "room",
      targetId: parentId,
      metadata: {
        sessionId: session.id,
        childRoomId: persisted.assignment.childRoomId,
      },
    });
    return { ok: true, assignment: persisted.assignment };
  }

  if (!canBroadcastBreakout({ role: loaded.role, isOwner })) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only a host or cohost can recall breakouts",
    };
  }
  await finishBreakoutSession(session.id);
  const packet: BreakoutPacket = {
    type: "breakout.recall",
    sessionId: session.id,
    parentRoomId: parentId,
  };
  await sendBreakoutPackets(
    breakoutSendRooms({
      action: "recall",
      parentRoomId: parentId,
      childRoomIds,
    }),
    packet,
  );
  await writeAudit({
    actorId: input.actorId,
    action: "breakout.recall",
    targetType: "room",
    targetId: parentId,
    metadata: { sessionId: session.id },
  });
  return { ok: true, packet };
}

async function finishBreakoutSession(sessionId: string) {
  await prisma.room.updateMany({
    where: { breakoutSessionId: sessionId },
    data: { finishedAt: new Date(), locked: true },
  });
  return prisma.breakoutSession.update({
    where: { id: sessionId },
    data: { status: "closed" },
    include: sessionInclude,
  });
}
