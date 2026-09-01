import "server-only";

import { prisma } from "@/lib/db";

export const ORG_ALLOW_E2EE_KEY = "allowE2eeRooms" as const;

export async function getOrgAllowsE2eeRooms(): Promise<boolean> {
  const row = await prisma.orgSetting.findUnique({
    where: { key: ORG_ALLOW_E2EE_KEY },
  });
  if (!row) {
    return false;
  }
  return row.value === true;
}

export async function setOrgAllowsE2eeRooms(enabled: boolean): Promise<void> {
  await prisma.orgSetting.upsert({
    where: { key: ORG_ALLOW_E2EE_KEY },
    update: { value: enabled },
    create: { key: ORG_ALLOW_E2EE_KEY, value: enabled },
  });
}

export async function roomHasActiveE2eeBlockers(roomId: string): Promise<{
  hasActiveRecording: boolean;
  hasActiveStream: boolean;
  hasOpenBreakouts: boolean;
}> {
  const [recording, stream, breakout] = await Promise.all([
    prisma.recording.findFirst({
      where: {
        roomId,
        status: { in: ["pending_consent", "starting", "active"] },
      },
      select: { id: true },
    }),
    prisma.stream.findFirst({
      where: {
        roomId,
        status: { in: ["pending_consent", "starting", "active"] },
      },
      select: { id: true },
    }),
    prisma.breakoutSession.findFirst({
      where: { parentRoomId: roomId, status: "open" },
      select: { id: true },
    }),
  ]);
  return {
    hasActiveRecording: recording !== null,
    hasActiveStream: stream !== null,
    hasOpenBreakouts: breakout !== null,
  };
}
