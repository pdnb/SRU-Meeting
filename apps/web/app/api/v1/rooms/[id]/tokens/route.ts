import { jsonError, readJsonBody } from "@/lib/api";
import { logRequest } from "@/lib/request-log";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getSessionUser } from "@/lib/session";
import { attachGuestCookie, mintRoomJoinToken } from "@/lib/tokens";
import { enqueueWebhook } from "@/lib/webhooks";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const json = await readJsonBody(request);
  if (!json.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/tokens`,
      status: 400,
    });
    return json.response;
  }

  let user = await getSessionUser();
  if (request.headers.get("x-api-key")) {
    const hmac = await authenticateApiRequest(request);
    if (!hmac.actor) {
      logRequest({
        method: "POST",
        path: `/api/v1/rooms/${id}/tokens`,
        status: 401,
      });
      return hmac.response;
    }
    user = hmac.actor;
  }
  const result = await mintRoomJoinToken({
    roomId: id,
    user,
    raw: json.body,
  });

  if (result.setGuestCookie) {
    await attachGuestCookie(result.setGuestCookie);
  }

  if (!result.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/tokens`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }

  await enqueueWebhook("participant_joined", {
    room: { id },
    participant: user ? { id: user.id, name: user.name } : undefined,
  });
  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/tokens`,
    status: 201,
  });
  return Response.json(result.body, { status: 201 });
}
