import { requireOrgAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { AuditLogSchema } from "@sru/shared";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return Response.json({
    data: rows.map((row) =>
      AuditLogSchema.parse({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
      }),
    ),
  });
}
