import { jsonError } from "@/lib/api";
import { requireOrgAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { deleteOrgBackground } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }

  const { id } = await context.params;
  const preset = await prisma.orgBackgroundPreset.findUnique({ where: { id } });
  if (!preset) {
    return jsonError(404, "NOT_FOUND", "Background preset not found");
  }

  await deleteOrgBackground(preset.storageKey).catch(() => undefined);
  await prisma.orgBackgroundPreset.delete({ where: { id } });

  await writeAudit({
    actorId: user.id,
    action: "admin.background.delete",
    targetType: "org_background",
    targetId: id,
    metadata: { label: preset.label },
  });

  return Response.json({ ok: true });
}
