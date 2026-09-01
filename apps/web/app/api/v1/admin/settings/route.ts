import { jsonError, readJsonBody } from "@/lib/api";
import { requireOrgAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  getOrgAllowsE2eeRooms,
  setOrgAllowsE2eeRooms,
} from "@/lib/e2ee/org-settings";
import { z } from "zod";

export const runtime = "nodejs";

const SettingsSchema = z.object({
  recordingRetentionDays: z.number().int().min(1).max(3650).optional(),
  allowE2eeRooms: z.boolean().optional(),
});

export async function GET() {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const rows = await prisma.orgSetting.findMany();
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  if (settings.allowE2eeRooms === undefined) {
    settings.allowE2eeRooms = await getOrgAllowsE2eeRooms();
  }
  return Response.json({ data: settings });
}

export async function PUT(request: Request) {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const parsed = SettingsSchema.safeParse(json.body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid settings");
  }
  if (parsed.data.recordingRetentionDays !== undefined) {
    await prisma.orgSetting.upsert({
      where: { key: "recordingRetentionDays" },
      update: { value: parsed.data.recordingRetentionDays },
      create: {
        key: "recordingRetentionDays",
        value: parsed.data.recordingRetentionDays,
      },
    });
  }
  if (parsed.data.allowE2eeRooms !== undefined) {
    await setOrgAllowsE2eeRooms(parsed.data.allowE2eeRooms);
    await writeAudit({
      actorId: user.id,
      action: parsed.data.allowE2eeRooms
        ? "admin.e2ee_enabled"
        : "admin.e2ee_disabled",
      targetType: "org",
      targetId: "settings",
    });
  }
  await writeAudit({
    actorId: user.id,
    action: "admin.settings.update",
    targetType: "org",
    targetId: "settings",
    metadata: parsed.data,
  });
  return Response.json({ ok: true });
}
