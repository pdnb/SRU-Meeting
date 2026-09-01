import "server-only";

import { prisma } from "@/lib/db";
import { getParticipation } from "@/lib/rooms";
import type { SubmitQosReportRequest } from "@sru/shared";

export const QOS_REPORTS_PER_ROOM_CAP = 100;

export async function submitQosReport(
  userId: string,
  input: SubmitQosReportRequest,
): Promise<
  | { ok: true }
  | { ok: false; status: 403 | 404; code: string; message: string }
> {
  const participation = await getParticipation(input.roomId, userId);
  if (!participation || participation.banned || participation.lobbyStatus !== "admitted") {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "You must be an admitted participant in this room",
    };
  }

  await prisma.qosReport.create({
    data: {
      roomId: input.roomId,
      userId,
      rttMs: input.rttMs ?? null,
      packetLoss: input.packetLoss ?? null,
      jitterMs: input.jitterMs ?? null,
      bitrateKbps: input.bitrateKbps ?? null,
    },
  });

  const overflow = await prisma.qosReport.findMany({
    where: { roomId: input.roomId },
    orderBy: { createdAt: "desc" },
    skip: QOS_REPORTS_PER_ROOM_CAP,
    select: { id: true },
  });
  if (overflow.length > 0) {
    await prisma.qosReport.deleteMany({
      where: { id: { in: overflow.map((row) => row.id) } },
    });
  }

  return { ok: true };
}

export async function listLatestQosByRoom() {
  const rooms = await prisma.room.findMany({
    where: { parentRoomId: null },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      qosReports: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: { qosReports: true },
      },
    },
  });

  return rooms
    .filter((room) => room._count.qosReports > 0)
    .map((room) => ({
      roomId: room.id,
      roomName: room.name,
      reportCount: room._count.qosReports,
      latest: room.qosReports[0] ?? null,
    }));
}
