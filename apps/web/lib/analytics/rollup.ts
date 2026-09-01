import "server-only";

import { prisma } from "@/lib/db";

export const ROLLUP_BACKFILL_DAYS = 30;

export function utcDayStart(input: Date): Date {
  return new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
  );
}

export function utcDayEnd(input: Date): Date {
  const start = utcDayStart(input);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function formatUtcDate(input: Date): string {
  return input.toISOString().slice(0, 10);
}

export function parseUtcDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || formatUtcDate(parsed) !== value) {
    return null;
  }
  return parsed;
}

export function listUtcDays(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let cursor = utcDayStart(from);
  const end = utcDayStart(to);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return days;
}

export async function aggregateMetricsForDay(day: Date): Promise<{
  roomsCreated: number;
  participantMinutes: number;
  recordingsFinished: number;
  uniqueUsers: number;
}> {
  const start = utcDayStart(day);
  const end = utcDayEnd(day);

  const [auditRooms, roomCount, recordingsFinished, activeRooms] =
    await Promise.all([
      prisma.auditLog.count({
        where: {
          action: "room.create",
          createdAt: { gte: start, lt: end },
        },
      }),
      prisma.room.count({
        where: {
          createdAt: { gte: start, lt: end },
          parentRoomId: null,
        },
      }),
      prisma.recording.count({
        where: {
          status: "finished",
          finishedAt: { gte: start, lt: end },
        },
      }),
      prisma.room.findMany({
        where: {
          createdAt: { lt: end },
          OR: [{ finishedAt: null }, { finishedAt: { gte: start } }],
        },
        select: {
          id: true,
          createdAt: true,
          finishedAt: true,
          participants: {
            where: { banned: false, lobbyStatus: "admitted" },
            select: { userId: true },
          },
        },
      }),
    ]);

  const roomsCreated = Math.max(auditRooms, roomCount);
  let participantMinutes = 0;
  const uniqueUsers = new Set<string>();

  for (const room of activeRooms) {
    const sessionStart =
      room.createdAt.getTime() > start.getTime() ? room.createdAt : start;
    const sessionEnd =
      room.finishedAt && room.finishedAt.getTime() < end.getTime()
        ? room.finishedAt
        : end;
    const durationMs = sessionEnd.getTime() - sessionStart.getTime();
    if (durationMs <= 0) {
      continue;
    }
    const durationMinutes = Math.ceil(durationMs / 60_000);
    participantMinutes += durationMinutes * room.participants.length;
    for (const participant of room.participants) {
      uniqueUsers.add(participant.userId);
    }
  }

  return {
    roomsCreated,
    participantMinutes,
    recordingsFinished,
    uniqueUsers: uniqueUsers.size,
  };
}

export async function upsertDailyMetrics(day: Date): Promise<void> {
  const metrics = await aggregateMetricsForDay(day);
  await prisma.dailyOrgMetrics.upsert({
    where: { date: utcDayStart(day) },
    create: {
      date: utcDayStart(day),
      ...metrics,
    },
    update: metrics,
  });
}

export async function runAnalyticsRollup(now = new Date()): Promise<{
  processedDays: number;
  backfilled: boolean;
}> {
  const existingCount = await prisma.dailyOrgMetrics.count();
  const daysToProcess: Date[] = [];

  if (existingCount === 0) {
    for (let offset = ROLLUP_BACKFILL_DAYS; offset >= 1; offset -= 1) {
      daysToProcess.push(
        utcDayStart(new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)),
      );
    }
  }

  const yesterday = utcDayStart(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
  );
  if (!daysToProcess.some((day) => day.getTime() === yesterday.getTime())) {
    daysToProcess.push(yesterday);
  }

  for (const day of daysToProcess) {
    await upsertDailyMetrics(day);
  }

  return {
    processedDays: daysToProcess.length,
    backfilled: existingCount === 0,
  };
}

export function validateAnalyticsDateRange(
  fromRaw: string | null,
  toRaw: string | null,
):
  | { ok: true; from: Date; to: Date }
  | { ok: false; message: string } {
  if (!fromRaw || !toRaw) {
    return { ok: false, message: "from and to query parameters are required" };
  }
  const from = parseUtcDateOnly(fromRaw);
  const to = parseUtcDateOnly(toRaw);
  if (!from || !to) {
    return {
      ok: false,
      message: "from and to must be UTC dates (YYYY-MM-DD)",
    };
  }
  if (from.getTime() > to.getTime()) {
    return { ok: false, message: "from must be on or before to" };
  }
  const spanDays =
    Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (spanDays > 366) {
    return { ok: false, message: "Date range may not exceed 366 days" };
  }
  return { ok: true, from, to };
}

export async function getAnalyticsOverview(from: Date, to: Date) {
  const rows = await prisma.dailyOrgMetrics.findMany({
    where: {
      date: {
        gte: utcDayStart(from),
        lte: utcDayStart(to),
      },
    },
    orderBy: { date: "asc" },
  });
  const byDate = new Map(rows.map((row) => [formatUtcDate(row.date), row]));
  const daily = listUtcDays(from, to).map((day) => {
    const key = formatUtcDate(day);
    const row = byDate.get(key);
    return {
      date: key,
      roomsCreated: row?.roomsCreated ?? 0,
      participantMinutes: row?.participantMinutes ?? 0,
      recordingsFinished: row?.recordingsFinished ?? 0,
      uniqueUsers: row?.uniqueUsers ?? 0,
    };
  });
  const totals = daily.reduce(
    (acc, row) => ({
      roomsCreated: acc.roomsCreated + row.roomsCreated,
      participantMinutes: acc.participantMinutes + row.participantMinutes,
      recordingsFinished: acc.recordingsFinished + row.recordingsFinished,
      uniqueUsers: acc.uniqueUsers + row.uniqueUsers,
    }),
    {
      roomsCreated: 0,
      participantMinutes: 0,
      recordingsFinished: 0,
      uniqueUsers: 0,
    },
  );
  return {
    from: formatUtcDate(from),
    to: formatUtcDate(to),
    daily,
    totals,
  };
}
