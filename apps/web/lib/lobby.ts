import "server-only";

import type { LobbyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getParticipation, getRoomRecord, isModeratorRole } from "@/lib/rooms";

export function applyKnock(current: LobbyStatus | null): LobbyStatus {
  if (current === "admitted") {
    return "admitted";
  }
  return "pending";
}

export async function upsertLobbyRequest(input: {
  roomId: string;
  userId: string;
}): Promise<{ lobbyStatus: LobbyStatus }> {
  const existing = await getParticipation(input.roomId, input.userId);
  const next = applyKnock(existing?.lobbyStatus ?? null);
  if (existing) {
    const updated = await prisma.roomParticipant.update({
      where: { id: existing.id },
      data: { lobbyStatus: next, banned: existing.banned },
    });
    return { lobbyStatus: updated.lobbyStatus };
  }
  const created = await prisma.roomParticipant.create({
    data: {
      roomId: input.roomId,
      userId: input.userId,
      role: "participant",
      banned: false,
      lobbyStatus: next,
    },
  });
  return { lobbyStatus: created.lobbyStatus };
}

export async function listPendingLobby(roomId: string) {
  return prisma.roomParticipant.findMany({
    where: { roomId, lobbyStatus: "pending", banned: false },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { id: "asc" },
  });
}

export async function decideLobby(input: {
  roomId: string;
  actorId: string;
  targetUserId: string;
  decision: "admit" | "deny";
}): Promise<
  | { ok: true; lobbyStatus: LobbyStatus }
  | { ok: false; status: number; code: string; message: string }
> {
  const room = await getRoomRecord(input.roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  const actor = await getParticipation(input.roomId, input.actorId);
  const actorRole = actor?.role ?? (room.ownerId === input.actorId ? "host" : null);
  if (!actorRole || !isModeratorRole(actorRole)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only a host or cohost can admit or deny",
    };
  }

  const target = await getParticipation(input.roomId, input.targetUserId);
  if (!target) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "No lobby request for that user",
    };
  }

  const lobbyStatus = input.decision === "admit" ? "admitted" : "denied";
  const updated = await prisma.roomParticipant.update({
    where: { id: target.id },
    data: { lobbyStatus },
  });
  return { ok: true, lobbyStatus: updated.lobbyStatus };
}
