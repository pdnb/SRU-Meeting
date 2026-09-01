import { jsonError } from "@/lib/api";
import { requireOrgAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { MAX_ORG_BACKGROUND_PRESETS } from "@/lib/backgrounds/constants";
import { listBackgroundPresets } from "@/lib/backgrounds/list";
import { prisma } from "@/lib/db";
import {
  assertBackgroundImageAllowed,
  uploadOrgBackground,
} from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const origin = new URL(request.url).origin;
  const data = await listBackgroundPresets(origin);
  return Response.json({ data });
}

export async function POST(request: Request) {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }

  const count = await prisma.orgBackgroundPreset.count();
  if (count >= MAX_ORG_BACKGROUND_PRESETS) {
    return jsonError(
      422,
      "LIMIT_REACHED",
      `Organization backgrounds are limited to ${MAX_ORG_BACKGROUND_PRESETS}`,
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const labelRaw = form.get("label");
  if (!(file instanceof File)) {
    return jsonError(422, "VALIDATION_ERROR", "file is required");
  }
  const label =
    typeof labelRaw === "string" && labelRaw.trim().length > 0
      ? labelRaw.trim().slice(0, 80)
      : file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Background";

  const allowed = assertBackgroundImageAllowed({
    size: file.size,
    type: file.type,
  });
  if (!allowed.ok) {
    return jsonError(422, allowed.code, allowed.message);
  }

  const storageKey = await uploadOrgBackground({
    filename: file.name,
    contentType: file.type,
    body: new Uint8Array(await file.arrayBuffer()),
  });

  const preset = await prisma.orgBackgroundPreset.create({
    data: {
      label,
      storageKey,
      sortOrder: count,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "admin.background.create",
    targetType: "org_background",
    targetId: preset.id,
    metadata: { label: preset.label },
  });

  const origin = new URL(request.url).origin;
  return Response.json(
    {
      data: {
        id: preset.id,
        label: preset.label,
        imageUrl: new URL(
          `/api/v1/backgrounds/org/${encodeURIComponent(preset.id)}/image`,
          origin,
        ).href,
      },
    },
    { status: 201 },
  );
}
