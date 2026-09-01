import { jsonError } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import { isOrgAdmin } from "@/lib/rbac";
import { getRecordingForUser } from "@/lib/recording";
import { getRecordingObject } from "@/lib/storage";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; path: string[] }> },
) {
  const { id, path } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    return response;
  }
  const allowed = await getRecordingForUser({
    recordingId: id,
    userId: actor.id,
    orgAdmin: isOrgAdmin(actor.orgRole),
  });
  if (!allowed.ok) {
    return jsonError(allowed.status, allowed.code, allowed.message);
  }
  const recording = await prisma.recording.findUnique({ where: { id } });
  if (!recording?.hlsPrefix) {
    return jsonError(404, "NOT_FOUND", "HLS playlist is not available");
  }
  const relative = path.join("/");
  if (relative.includes("..")) {
    return jsonError(400, "INVALID_PATH", "Invalid media path");
  }
  const key = `${recording.hlsPrefix}${relative}`;
  try {
    const object = await getRecordingObject(key);
    return new Response(Buffer.from(object.body), {
      headers: {
        "Content-Type":
          relative.endsWith(".m3u8")
            ? "application/vnd.apple.mpegurl"
            : object.contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return jsonError(404, "NOT_FOUND", "Media object not found");
  }
}
