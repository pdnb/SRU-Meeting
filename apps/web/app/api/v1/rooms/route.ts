import { jsonError, readJsonBody } from "@/lib/api";
import { logRequest } from "@/lib/request-log";
import { createRoomForUser, listRoomsForUser } from "@/lib/rooms";
import { requireSessionUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireSessionUser();
  if (!user) {
    logRequest({ method: "GET", path: "/api/v1/rooms", status: 401 });
    return response;
  }
  const data = await listRoomsForUser(user.id);
  logRequest({ method: "GET", path: "/api/v1/rooms", status: 200 });
  return Response.json({ data });
}

export async function POST(request: Request) {
  const { user, response } = await requireSessionUser();
  if (!user) {
    logRequest({ method: "POST", path: "/api/v1/rooms", status: 401 });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    logRequest({ method: "POST", path: "/api/v1/rooms", status: 400 });
    return json.response;
  }
  try {
    const room = await createRoomForUser(user.id, json.body);
    logRequest({ method: "POST", path: "/api/v1/rooms", status: 201 });
    return Response.json(room, { status: 201 });
  } catch {
    logRequest({ method: "POST", path: "/api/v1/rooms", status: 422 });
    return jsonError(422, "VALIDATION_ERROR", "Invalid create-room payload");
  }
}
