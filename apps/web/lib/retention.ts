import "server-only";

import { prisma } from "@/lib/db";

export const DEFAULT_RECORDING_RETENTION_DAYS = 90;

export function chatExpiredBefore(
  retentionDays: number,
  now = new Date(),
): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

export async function getRecordingRetentionDays(): Promise<number> {
  const setting = await prisma.orgSetting.findUnique({
    where: { key: "recordingRetentionDays" },
  });
  if (setting && typeof setting.value === "number") {
    return setting.value;
  }
  if (
    setting &&
    typeof setting.value === "object" &&
    setting.value !== null &&
    "days" in setting.value &&
    typeof (setting.value as { days: unknown }).days === "number"
  ) {
    return (setting.value as { days: number }).days;
  }
  return DEFAULT_RECORDING_RETENTION_DAYS;
}

export async function runRetentionJobs(now = new Date()): Promise<{
  chatDeleted: number;
  recordingsDeleted: number;
}> {
  const rooms = await prisma.room.findMany({
    where: { chatRetentionDays: { not: null } },
    select: { id: true, chatRetentionDays: true },
  });

  let chatDeleted = 0;
  for (const room of rooms) {
    if (!room.chatRetentionDays) continue;
    const result = await prisma.chatMessage.deleteMany({
      where: {
        roomId: room.id,
        createdAt: { lt: chatExpiredBefore(room.chatRetentionDays, now) },
      },
    });
    chatDeleted += result.count;
  }

  const recordingDays = await getRecordingRetentionDays();
  const cutoff = chatExpiredBefore(recordingDays, now);
  const stale = await prisma.recording.findMany({
    where: {
      status: "finished",
      finishedAt: { lt: cutoff },
    },
    select: { id: true },
  });
  const deleted = await prisma.recording.deleteMany({
    where: { id: { in: stale.map((row) => row.id) } },
  });

  return { chatDeleted, recordingsDeleted: deleted.count };
}
