import { jsonError } from "@/lib/api";
import { logRequest } from "@/lib/request-log";
import { getParticipation, getRoomRecord } from "@/lib/rooms";
import { requireSessionUser } from "@/lib/session";
import {
  assertAttachmentAllowed,
  uploadAttachment,
} from "@/lib/storage";

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
      path: `/api/v1/rooms/${id}/attachments`,
      status: 401,
    });
    return response;
  }

  const room = await getRoomRecord(id);
  const participation = await getParticipation(id, user.id);
  if (
    !room ||
    !participation ||
    participation.banned ||
    participation.lobbyStatus !== "admitted"
  ) {
    return jsonError(403, "NOT_IN_ROOM", "You must be in the room to attach files");
  }
  if (!room.allowChat) {
    return jsonError(403, "CHAT_DISABLED", "Chat is disabled in this room");
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(422, "VALIDATION_ERROR", "file is required");
  }

  const allowed = assertAttachmentAllowed({
    size: file.size,
    type: file.type,
  });
  if (!allowed.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/attachments`,
      status: 422,
    });
    return jsonError(422, allowed.code, allowed.message);
  }

  const key = await uploadAttachment({
    roomId: id,
    userId: user.id,
    filename: file.name,
    contentType: file.type,
    body: new Uint8Array(await file.arrayBuffer()),
  });

  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/attachments`,
    status: 201,
  });
  return Response.json({ key }, { status: 201 });
}
