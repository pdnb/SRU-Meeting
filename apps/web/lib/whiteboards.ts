import "server-only";

import {
  WhiteboardSessionSchema,
  type WhiteboardPacket,
  type WhiteboardSession,
} from "@sru/shared";
import { WHITEBOARD_DATA_TOPIC } from "@sru/shared";
import { prisma } from "@/lib/db";
import { roomCanHostEngagement } from "@/lib/polls";
import { sendRoomData } from "@/lib/livekit/room-service";
import { putObject } from "@/lib/storage";
import {
  getParticipation,
  getRoomRecord,
  isModeratorRole,
  userMaySeeRoom,
} from "@/lib/rooms";

export { WHITEBOARD_DATA_TOPIC };

function toSessionDto(row: {
  id: string;
  roomId: string;
  status: "open" | "closed";
  openedById: string;
  snapshotKey: string | null;
  createdAt: Date;
  closedAt: Date | null;
}): WhiteboardSession {
  return WhiteboardSessionSchema.parse({
    id: row.id,
    roomId: row.roomId,
    status: row.status,
    openedById: row.openedById,
    snapshotKey: row.snapshotKey,
    createdAt: row.createdAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
  });
}

async function broadcastWhiteboardPacket(
  roomId: string,
  packet: WhiteboardPacket,
) {
  await sendRoomData(
    roomId,
    new TextEncoder().encode(JSON.stringify(packet)),
    WHITEBOARD_DATA_TOPIC,
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

async function hostForRoom(
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
  if (role !== "host" && room.ownerId !== userId) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only the host can manage the whiteboard",
    };
  }
  return { ok: true };
}

export async function getOpenWhiteboard(input: {
  roomId: string;
  userId: string;
}): Promise<
  | { ok: true; session: WhiteboardSession | null }
  | { ok: false; status: number; code: string; message: string }
> {
  const member = await admittedMember(input.roomId, input.userId);
  if (!member.ok) {
    return member;
  }
  const session = await prisma.whiteboardSession.findFirst({
    where: { roomId: input.roomId, status: "open" },
  });
  return {
    ok: true,
    session: session ? toSessionDto(session) : null,
  };
}

export async function openWhiteboard(input: {
  roomId: string;
  actorId: string;
}): Promise<
  | { ok: true; session: WhiteboardSession }
  | { ok: false; status: number; code: string; message: string }
> {
  const host = await hostForRoom(input.roomId, input.actorId);
  if (!host.ok) {
    return host;
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
      message: "Whiteboard is not available in breakout rooms",
    };
  }
  const existing = await prisma.whiteboardSession.findFirst({
    where: { roomId: input.roomId, status: "open" },
  });
  if (existing) {
    return {
      ok: true,
      session: toSessionDto(existing),
    };
  }
  const created = await prisma.whiteboardSession.create({
    data: {
      roomId: input.roomId,
      openedById: input.actorId,
    },
  });
  const session = toSessionDto(created);
  await broadcastWhiteboardPacket(input.roomId, {
    type: "whiteboard.opened",
    session,
  });
  return { ok: true, session };
}

export async function closeWhiteboard(input: {
  roomId: string;
  actorId: string;
  snapshotPngBase64?: string;
}): Promise<
  | { ok: true; session: WhiteboardSession }
  | { ok: false; status: number; code: string; message: string }
> {
  const host = await hostForRoom(input.roomId, input.actorId);
  if (!host.ok) {
    return host;
  }
  const session = await prisma.whiteboardSession.findFirst({
    where: { roomId: input.roomId, status: "open" },
  });
  if (!session) {
    return {
      ok: false,
      status: 404,
      code: "NO_OPEN_WHITEBOARD",
      message: "There is no open whiteboard session",
    };
  }
  let snapshotKey: string | null = null;
  if (input.snapshotPngBase64) {
    try {
      const buffer = Buffer.from(input.snapshotPngBase64, "base64");
      snapshotKey = `whiteboards/${input.roomId}/${session.id}.png`;
      await putObject(snapshotKey, buffer, "image/png");
    } catch {
      // Snapshot export is optional; closing still succeeds.
    }
  }
  const closed = await prisma.whiteboardSession.update({
    where: { id: session.id },
    data: {
      status: "closed",
      closedAt: new Date(),
      snapshotKey,
    },
  });
  const dto = toSessionDto(closed);
  await broadcastWhiteboardPacket(input.roomId, {
    type: "whiteboard.closed",
    sessionId: session.id,
  });
  return { ok: true, session: dto };
}

export { isModeratorRole };
