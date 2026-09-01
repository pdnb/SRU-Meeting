import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    qosReport: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/rooms", () => ({
  getParticipation: vi.fn(),
}));

import { getParticipation } from "@/lib/rooms";
import { extractQosFromStats } from "@/components/meeting/QosReporter";
import type { StatsReport } from "@/components/meeting/QosReporter";
import {
  QOS_REPORTS_PER_ROOM_CAP,
  submitQosReport,
} from "./analytics/qos";

describe("QoS reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts RTT and loss from RTC stats", () => {
    const reports: StatsReport[] = [
      {
        type: "candidate-pair",
        state: "succeeded",
        currentRoundTripTime: 0.05,
      },
      {
        type: "inbound-rtp",
        kind: "video",
        jitter: 0.012,
        packetsLost: 1,
        packetsReceived: 99,
        bytesReceived: 125000,
      },
    ];

    const sample = extractQosFromStats(reports);
    expect(sample.rttMs).toBe(50);
    expect(sample.jitterMs).toBe(12);
    expect(sample.packetLoss).toBeCloseTo(0.01);
    expect(sample.bitrateKbps).toBe(1000);
  });

  it("rejects QoS from non-participants", async () => {
    vi.mocked(getParticipation).mockResolvedValue(null);
    const result = await submitQosReport("user-1", { roomId: "room-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("stores reports and trims overflow", async () => {
    vi.mocked(getParticipation).mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-1",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });
    prisma.qosReport.create.mockResolvedValue({ id: "qos-1" });
    prisma.qosReport.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({ id: `old-${index}` })),
    );
    prisma.qosReport.deleteMany.mockResolvedValue({ count: 5 });

    const result = await submitQosReport("user-1", {
      roomId: "room-1",
      rttMs: 40,
    });
    expect(result.ok).toBe(true);
    expect(prisma.qosReport.create).toHaveBeenCalled();
    expect(prisma.qosReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: QOS_REPORTS_PER_ROOM_CAP }),
    );
  });
});
