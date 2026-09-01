import { jsonError } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import { isOrgAdmin } from "@/lib/rbac";
import { getTranscriptForUser } from "@/lib/transcript";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    return response;
  }
  const result = await getTranscriptForUser({
    recordingId: id,
    userId: actor.id,
    orgAdmin: isOrgAdmin(actor.orgRole),
  });
  if (!result.ok) {
    return jsonError(result.status, result.code, result.message);
  }
  return Response.json(result.transcript);
}
