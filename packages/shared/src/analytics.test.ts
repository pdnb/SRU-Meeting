import { describe, expect, it } from "vitest";
import {
  AnalyticsOverviewSchema,
  DailyOrgMetricsSchema,
  QosReportSchema,
  SubmitQosReportRequestSchema,
} from "./analytics";

describe("analytics contracts", () => {
  it("parses daily metrics", () => {
    const row = DailyOrgMetricsSchema.parse({
      date: "2026-09-01",
      roomsCreated: 2,
      participantMinutes: 120,
      recordingsFinished: 1,
      uniqueUsers: 5,
    });
    expect(row.date).toBe("2026-09-01");
  });

  it("parses analytics overview", () => {
    const overview = AnalyticsOverviewSchema.parse({
      from: "2026-09-01",
      to: "2026-09-07",
      daily: [
        {
          date: "2026-09-01",
          roomsCreated: 1,
          participantMinutes: 30,
          recordingsFinished: 0,
          uniqueUsers: 2,
        },
      ],
      totals: {
        roomsCreated: 1,
        participantMinutes: 30,
        recordingsFinished: 0,
        uniqueUsers: 2,
      },
    });
    expect(overview.daily).toHaveLength(1);
  });

  it("accepts QoS submit payload", () => {
    const payload = SubmitQosReportRequestSchema.parse({
      roomId: "room-1",
      rttMs: 42,
      packetLoss: 0.01,
      jitterMs: 5,
      bitrateKbps: 900,
    });
    expect(payload.roomId).toBe("room-1");
  });

  it("parses QoS report", () => {
    const report = QosReportSchema.parse({
      id: "qos-1",
      roomId: "room-1",
      userId: "user-1",
      rttMs: 42,
      packetLoss: 0.01,
      jitterMs: 5,
      bitrateKbps: 900,
      createdAt: "2026-09-01T12:00:00.000Z",
    });
    expect(report.rttMs).toBe(42);
  });
});
