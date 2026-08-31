import { jsonError, readJsonBody } from "@/lib/api";
import { decideLobby, listPendingLobby, upsertLobbyRequest } from "@/lib/lobby";
import { logRequest } from "@/lib/request-log";
import { getParticipation, getRoomRecord, isModeratorRole } from "@/lib/rooms";
import { requireSessionUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, response } = await requireSessionUser();
  if (!user) {
    return response;
  }
  const room = await getRoomRecord(id);
  if (!room) {
    return jsonError(404, "NOT_FOUND", "Room not found");
  }
  const participation = await getParticipation(id, user.id);
  const role =
    participation?.role ?? (room.ownerId === user.id ? "host" : null);
  if (isModeratorRole(role ?? "participant")) {
    const pending = await listPendingLobby(id);
    logRequest({
      method: "GET",
      path: `/api/v1/rooms/${id}/lobby`,
      status: 200,
    });
    return Response.json({
      data: pending.map((row) => ({
        userId: row.userId,
        name: row.user.name,
        email: row.user.email,
        lobbyStatus: row.lobbyStatus,
      })),
      self: participation?.lobbyStatus ?? null,
    });
  }
  return Response.json({
    data: [],
    self: participation?.lobbyStatus ?? null,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, response } = await requireSessionUser();
  if (!user) {
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const body = json.body as { userId?: unknown; decision?: unknown };

  if (body.decision === "admit" || body.decision === "deny") {
    if (typeof body.userId !== "string") {
      return jsonError(422, "VALIDATION_ERROR", "userId is required");
    }
    const result = await decideLobby({
      roomId: id,
      actorId: user.id,
      targetUserId: body.userId,
      decision: body.decision,
    });
    if (!result.ok) {
      logRequest({
        method: "POST",
        path: `/api/v1/rooms/${id}/lobby`,
        status: result.status,
      });
      return jsonError(result.status, result.code, result.message);
    }
    return Response.json({ lobbyStatus: result.lobbyStatus });
  }

  const knock = await upsertLobbyRequest({ roomId: id, userId: user.id });
  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/lobby`,
    status: 200,
  });
  return Response.json(knock);
}
