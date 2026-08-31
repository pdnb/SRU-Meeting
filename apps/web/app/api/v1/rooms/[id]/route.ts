import { jsonError, readJsonBody } from "@/lib/api";
import { logRequest } from "@/lib/request-log";
import {
  closeRoomForOwner,
  getParticipation,
  getRoomRecord,
  toRoomDto,
  updateRoomSettingsForHost,
} from "@/lib/rooms";
import { requireSessionUser } from "@/lib/session";
import { getRoomService } from "@/lib/livekit/room-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, response } = await requireSessionUser();
  if (!user) {
    logRequest({ method: "GET", path: `/api/v1/rooms/${id}`, status: 401 });
    return response;
  }
  const room = await getRoomRecord(id);
  const participation = await getParticipation(id, user.id);
  if (!room) {
    logRequest({ method: "GET", path: `/api/v1/rooms/${id}`, status: 404 });
    return jsonError(404, "NOT_FOUND", "Room not found");
  }
  if (participation?.banned) {
    logRequest({ method: "GET", path: `/api/v1/rooms/${id}`, status: 403 });
    return jsonError(403, "BANNED", "You are banned from this room");
  }
  logRequest({ method: "GET", path: `/api/v1/rooms/${id}`, status: 200 });
  return Response.json(toRoomDto(room));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, response } = await requireSessionUser();
  if (!user) {
    logRequest({ method: "PATCH", path: `/api/v1/rooms/${id}`, status: 401 });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    logRequest({ method: "PATCH", path: `/api/v1/rooms/${id}`, status: 400 });
    return json.response;
  }
  const result = await updateRoomSettingsForHost(user.id, id, json.body);
  if (!result.ok) {
    logRequest({
      method: "PATCH",
      path: `/api/v1/rooms/${id}`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({ method: "PATCH", path: `/api/v1/rooms/${id}`, status: 200 });
  return Response.json(result.room);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, response } = await requireSessionUser();
  if (!user) {
    logRequest({ method: "DELETE", path: `/api/v1/rooms/${id}`, status: 401 });
    return response;
  }
  const result = await closeRoomForOwner(user.id, id);
  if (!result.ok) {
    logRequest({
      method: "DELETE",
      path: `/api/v1/rooms/${id}`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  const livekit = getRoomService();
  if (livekit) {
    try {
      await livekit.deleteRoom(id);
    } catch {
      // LiveKit room may already be gone.
    }
  }
  logRequest({ method: "DELETE", path: `/api/v1/rooms/${id}`, status: 204 });
  return new Response(null, { status: 204 });
}
