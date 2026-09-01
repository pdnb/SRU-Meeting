import { requireOrgAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { toRecordingDto } from "@/lib/recording";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const rows = await prisma.recording.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { consents: true },
  });
  return Response.json({ data: rows.map((row) => toRecordingDto(row)) });
}
