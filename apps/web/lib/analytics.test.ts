import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    auditLog: { count: vi.fn() },
    room: { count: vi.fn(), findMany: vi.fn() },
    recording: { count: vi.fn() },
    dailyOrgMetrics: {
      count: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));

import {
  aggregateMetricsForDay,
  formatUtcDate,
  parseUtcDateOnly,
  runAnalyticsRollup,
  validateAnalyticsDateRange,
} from "./analytics/rollup";

describe("analytics rollup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses and validates UTC date ranges", () => {
    expect(parseUtcDateOnly("2026-09-01")?.toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(validateAnalyticsDateRange("2026-09-07", "2026-09-01").ok).toBe(
      false,
    );
    expect(validateAnalyticsDateRange(null, "2026-09-01").ok).toBe(false);
    const ok = validateAnalyticsDateRange("2026-09-01", "2026-09-07");
    expect(ok.ok).toBe(true);
  });

  it("aggregates rooms, participants, and recordings for a day", async () => {
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.room.count.mockResolvedValue(1);
    prisma.recording.count.mockResolvedValue(2);
    prisma.room.findMany.mockResolvedValue([
      {
        id: "room-1",
        createdAt: new Date("2026-08-31T12:00:00.000Z"),
        finishedAt: null,
        participants: [{ userId: "u1" }, { userId: "u2" }],
      },
    ]);

    const metrics = await aggregateMetricsForDay(
      new Date("2026-09-01T00:00:00.000Z"),
    );
    expect(metrics.roomsCreated).toBe(1);
    expect(metrics.recordingsFinished).toBe(2);
    expect(metrics.uniqueUsers).toBe(2);
    expect(metrics.participantMinutes).toBeGreaterThan(0);
  });

  it("backfills 30 days on first run and always rolls up yesterday", async () => {
    prisma.dailyOrgMetrics.count.mockResolvedValue(0);
    prisma.auditLog.count.mockResolvedValue(0);
    prisma.room.count.mockResolvedValue(0);
    prisma.recording.count.mockResolvedValue(0);
    prisma.room.findMany.mockResolvedValue([]);
    prisma.dailyOrgMetrics.upsert.mockResolvedValue({});

    const now = new Date("2026-09-01T12:00:00.000Z");
    const result = await runAnalyticsRollup(now);
    expect(result.backfilled).toBe(true);
    expect(result.processedDays).toBe(30);
    expect(prisma.dailyOrgMetrics.upsert).toHaveBeenCalledTimes(30);
    const firstCall = prisma.dailyOrgMetrics.upsert.mock.calls[0]?.[0];
    expect(formatUtcDate(firstCall.create.date)).toBe("2026-08-02");
  });
});
