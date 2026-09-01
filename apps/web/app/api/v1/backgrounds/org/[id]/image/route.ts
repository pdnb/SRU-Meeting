import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getOrgBackgroundObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const preset = await prisma.orgBackgroundPreset.findUnique({
    where: { id },
  });
  if (!preset) {
    return jsonError(404, "NOT_FOUND", "Background preset not found");
  }
  try {
    const object = await getOrgBackgroundObject(preset.storageKey);
    return new Response(Buffer.from(object.body), {
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return jsonError(404, "NOT_FOUND", "Background image not found");
  }
}
