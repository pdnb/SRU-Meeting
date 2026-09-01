import { jsonError } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { isOrgAdmin } from "@/lib/rbac";
import { getStreamForUser } from "@/lib/streaming";
import { streamMediaObjectKey } from "@/lib/stream-ui";
import { getRecordingObject } from "@/lib/storage";

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
  const allowed = await getStreamForUser({
    streamId: id,
    userId: actor.id,
    orgAdmin: isOrgAdmin(actor.orgRole),
  });
  if (!allowed.ok) {
    return jsonError(allowed.status, allowed.code, allowed.message);
  }
  const stream = await prisma.stream.findUnique({ where: { id } });
  if (!stream?.hlsPrefix) {
    return jsonError(404, "NOT_FOUND", "HLS playlist is not available");
  }
  const relative = path.join("/");
  const keyed = streamMediaObjectKey(stream.hlsPrefix, relative);
  if (!keyed.ok) {
    return jsonError(400, "INVALID_PATH", "Invalid media path");
  }
  try {
    const object = await getRecordingObject(keyed.key);
    return new Response(Buffer.from(object.body), {
      headers: {
        "Content-Type": relative.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : object.contentType,
        "Cache-Control": "private, max-age=5",
      },
    });
  } catch {
    return jsonError(404, "NOT_FOUND", "Media object not found");
  }
}
