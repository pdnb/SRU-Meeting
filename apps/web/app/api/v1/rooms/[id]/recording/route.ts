import { jsonError, readJsonBody } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import { logRequest } from "@/lib/request-log";
import {
  currentRoomRecording,
  requestRecording,
  stopRecording,
} from "@/lib/recording";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    return response;
  }
  const recording = await currentRoomRecording(id);
  return Response.json({ data: recording });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({ method: "POST", path: `/api/v1/rooms/${id}/recording`, status: 401 });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const result = await requestRecording({
    roomId: id,
    actorId: actor.id,
    raw: json.body,
  });
  if (!result.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/recording`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({ method: "POST", path: `/api/v1/rooms/${id}/recording`, status: 201 });
  return Response.json(result.recording, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    return response;
  }
  const result = await stopRecording({ roomId: id, actorId: actor.id });
  if (!result.ok) {
    return jsonError(result.status, result.code, result.message);
  }
  return Response.json(result.recording);
}
