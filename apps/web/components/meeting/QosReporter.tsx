"use client";

import { useRoomContext } from "@livekit/components-react";
import { useEffect } from "react";
import type { SubmitQosReportRequest } from "@sru/shared";

export const QOS_REPORT_INTERVAL_MS = 60_000;

export type StatsReport = Record<string, unknown> & {
  type?: string;
  state?: string;
  kind?: string;
  currentRoundTripTime?: number;
  jitter?: number;
  packetsLost?: number;
  packetsReceived?: number;
  bytesReceived?: number;
};

export function extractQosFromStats(
  reports: StatsReport[],
): Omit<SubmitQosReportRequest, "roomId"> {
  let rttMs: number | null = null;
  let packetLoss: number | null = null;
  let jitterMs: number | null = null;
  let bitrateKbps: number | null = null;

  for (const report of reports) {
    if (report.type === "candidate-pair" && report.state === "succeeded") {
      if (typeof report.currentRoundTripTime === "number") {
        rttMs = Math.round(report.currentRoundTripTime * 1000);
      }
    }
    if (report.type === "inbound-rtp" && report.kind === "video") {
      if (typeof report.jitter === "number") {
        jitterMs = Math.max(jitterMs ?? 0, Math.round(report.jitter * 1000));
      }
      if (
        typeof report.packetsLost === "number" &&
        typeof report.packetsReceived === "number"
      ) {
        const total = report.packetsLost + report.packetsReceived;
        if (total > 0) {
          packetLoss = report.packetsLost / total;
        }
      }
      if (typeof report.bytesReceived === "number") {
        bitrateKbps = Math.round((report.bytesReceived * 8) / 1000);
      }
    }
  }

  return {
    rttMs,
    packetLoss,
    jitterMs,
    bitrateKbps,
  };
}

export function QosReporter({ roomId }: { roomId: string }) {
  const room = useRoomContext();

  useEffect(() => {
    let cancelled = false;

    async function sendSample() {
      if (cancelled) {
        return;
      }
      try {
        const engine = room.engine as {
          client?: { getStats?: () => Promise<StatsReport[]> };
        };
        const stats = await engine.client?.getStats?.();
        if (!stats || stats.length === 0) {
          return;
        }
        const sample = extractQosFromStats(stats);
        await fetch("/api/v1/client/qos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            ...sample,
          }),
        });
      } catch {
        // QoS reporting must not disrupt the meeting.
      }
    }

    const timer = window.setInterval(() => {
      void sendSample();
    }, QOS_REPORT_INTERVAL_MS);
    void sendSample();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [room, roomId]);

  return null;
}
