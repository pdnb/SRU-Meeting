import { requireOrgAdmin } from "@/lib/admin";
import { listLatestQosByRoom } from "@/lib/analytics/qos";
import { QosReportSchema, RoomQosSummarySchema } from "@sru/shared";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }

  const rows = await listLatestQosByRoom();
  return Response.json({
    data: rows.map((row) =>
      RoomQosSummarySchema.parse({
        roomId: row.roomId,
        roomName: row.roomName,
        reportCount: row.reportCount,
        latest: row.latest
          ? QosReportSchema.parse({
              id: row.latest.id,
              roomId: row.latest.roomId,
              userId: row.latest.userId,
              rttMs: row.latest.rttMs,
              packetLoss: row.latest.packetLoss,
              jitterMs: row.latest.jitterMs,
              bitrateKbps: row.latest.bitrateKbps,
              createdAt: row.latest.createdAt.toISOString(),
            })
          : null,
      }),
    ),
  });
}
