import { jsonError, readJsonBody } from "@/lib/api";
import { createMessageForUser, listMessagesForUser } from "@/lib/chat";
import { logRequest } from "@/lib/request-log";
import { getRoomRecord } from "@/lib/rooms";
import { requireSessionUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, response } = await requireSessionUser();
  if (!user) {
    logRequest({
      method: "GET",
      path: `/api/v1/rooms/${id}/messages`,
      status: 401,
    });
    return response;
  }
  const data = await listMessagesForUser(id, user.id);
  logRequest({
    method: "GET",
    path: `/api/v1/rooms/${id}/messages`,
    status: 200,
  });
  return Response.json({ data });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, response } = await requireSessionUser();
  if (!user) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/messages`,
      status: 401,
    });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/messages`,
      status: 400,
    });
    return json.response;
  }
  const room = await getRoomRecord(id);
  if (!room) {
    return jsonError(404, "NOT_FOUND", "Room not found");
  }
  const result = await createMessageForUser({
    roomId: id,
    userId: user.id,
    raw: json.body,
    allowChat: room.allowChat,
  });
  if (!result.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/messages`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/messages`,
    status: 201,
  });
  return Response.json(result.message, { status: 201 });
}
