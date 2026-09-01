import { jsonError, readJsonBody } from "@/lib/api";
import { requireOrgAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { OrgRoleSchema, UserSchema } from "@sru/shared";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateUserRoleSchema = z.object({
  userId: z.string().min(1),
  orgRole: OrgRoleSchema,
});

export async function GET() {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const rows = await prisma.user.findMany({
    where: { isGuest: false },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return Response.json({
    data: rows.map((row) =>
      UserSchema.parse({
        id: row.id,
        email: row.email,
        name: row.name,
        orgRole: row.orgRole,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }),
    ),
  });
}

export async function PATCH(request: Request) {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const parsed = UpdateUserRoleSchema.safeParse(json.body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid role update");
  }
  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { orgRole: parsed.data.orgRole },
  });
  await writeAudit({
    actorId: user.id,
    action: "admin.user.role",
    targetType: "user",
    targetId: updated.id,
    metadata: { orgRole: updated.orgRole },
  });
  return Response.json({ id: updated.id, orgRole: updated.orgRole });
}
