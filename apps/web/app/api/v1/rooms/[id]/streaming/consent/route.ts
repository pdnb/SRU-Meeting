import { jsonError } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import { consentToStream } from "@/lib/streaming";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    return response;
  }
  const result = await consentToStream({ roomId: id, actorId: actor.id });
  if (!result.ok) {
    return jsonError(result.status, result.code, result.message);
  }
  return Response.json(result.stream);
}
