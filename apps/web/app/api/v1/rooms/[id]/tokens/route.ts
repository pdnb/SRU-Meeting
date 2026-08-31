import { jsonError, readJsonBody } from "@/lib/api";
import { logRequest } from "@/lib/request-log";
import { getSessionUser } from "@/lib/session";
import { attachGuestCookie, mintRoomJoinToken } from "@/lib/tokens";

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

  const user = await getSessionUser();
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

  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/tokens`,
    status: 201,
  });
  return Response.json(result.body, { status: 201 });
}
