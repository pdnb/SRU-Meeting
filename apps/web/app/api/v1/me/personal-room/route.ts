import { jsonError } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import { ensurePersonalRoom } from "@/lib/personal-room";
import { logRequest } from "@/lib/request-log";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { actor: user, response } = await requireApiActor(request);
  if (!user) {
    logRequest({ method: "GET", path: "/api/v1/me/personal-room", status: 401 });
    return response;
  }

  try {
    const personal = await ensurePersonalRoom(user.id);
    logRequest({ method: "GET", path: "/api/v1/me/personal-room", status: 200 });
    return Response.json(personal);
  } catch {
    logRequest({ method: "GET", path: "/api/v1/me/personal-room", status: 403 });
    return jsonError(403, "FORBIDDEN", "Personal rooms are only for org members");
  }
}
