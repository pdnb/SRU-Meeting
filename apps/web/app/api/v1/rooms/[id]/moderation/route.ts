import { jsonError, readJsonBody } from "@/lib/api";
import { applyModeration, ModerationRequestSchema } from "@/lib/moderation";
import { logRequest } from "@/lib/request-log";
import { requireSessionUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, response } = await requireSessionUser();
  if (!user) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/moderation`,
      status: 401,
    });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const parsed = ModerationRequestSchema.safeParse(json.body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid moderation request");
  }
  const result = await applyModeration({
    roomId: id,
    actorId: user.id,
    body: parsed.data,
  });
  if (!result.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/moderation`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/moderation`,
    status: 200,
  });
  return Response.json(result.result);
}
