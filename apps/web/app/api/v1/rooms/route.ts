import { jsonError, readJsonBody } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import { logRequest } from "@/lib/request-log";
import { canCreateRoom } from "@/lib/rbac";
import { createRoomForUser, listRoomsForUser } from "@/lib/rooms";
import { writeAudit } from "@/lib/audit";
import { enqueueWebhook } from "@/lib/webhooks";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({ method: "GET", path: "/api/v1/rooms", status: 401 });
    return response;
  }
  const data = await listRoomsForUser(actor.id);
  logRequest({ method: "GET", path: "/api/v1/rooms", status: 200 });
  return Response.json({ data });
}

export async function POST(request: Request) {
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({ method: "POST", path: "/api/v1/rooms", status: 401 });
    return response;
  }
  if (!canCreateRoom(actor.orgRole)) {
    logRequest({ method: "POST", path: "/api/v1/rooms", status: 403 });
    return jsonError(403, "FORBIDDEN", "Your organization role cannot create rooms");
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    logRequest({ method: "POST", path: "/api/v1/rooms", status: 400 });
    return json.response;
  }
  try {
    const room = await createRoomForUser(actor.id, json.body);
    await writeAudit({
      actorId: actor.id,
      action: "room.create",
      targetType: "room",
      targetId: room.id,
    });
    await enqueueWebhook("room_started", {
      room: { id: room.id, name: room.name },
    });
    logRequest({ method: "POST", path: "/api/v1/rooms", status: 201 });
    return Response.json(room, { status: 201 });
  } catch {
    logRequest({ method: "POST", path: "/api/v1/rooms", status: 422 });
    return jsonError(422, "VALIDATION_ERROR", "Invalid create-room payload");
  }
}
