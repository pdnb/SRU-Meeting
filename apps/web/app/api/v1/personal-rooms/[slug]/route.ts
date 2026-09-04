import { PersonalRoomSlugSchema } from "@sru/shared";
import { jsonError } from "@/lib/api";
import {
  getPersonalRoomBySlug,
  toPersonalRoomDto,
} from "@/lib/personal-room";
import { logRequest } from "@/lib/request-log";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await context.params;
  const parsed = PersonalRoomSlugSchema.safeParse(raw);
  if (!parsed.success) {
    logRequest({
      method: "GET",
      path: `/api/v1/personal-rooms/${raw}`,
      status: 404,
    });
    return jsonError(404, "NOT_FOUND", "Personal room not found");
  }

  const room = await getPersonalRoomBySlug(parsed.data);
  if (!room?.slug) {
    logRequest({
      method: "GET",
      path: `/api/v1/personal-rooms/${parsed.data}`,
      status: 404,
    });
    return jsonError(404, "NOT_FOUND", "Personal room not found");
  }

  logRequest({
    method: "GET",
    path: `/api/v1/personal-rooms/${parsed.data}`,
    status: 200,
  });
  return Response.json(toPersonalRoomDto(room));
}
