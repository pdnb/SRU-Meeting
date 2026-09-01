import { jsonError, readJsonBody } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import { logRequest } from "@/lib/request-log";
import {
  closeWhiteboard,
  getOpenWhiteboard,
  openWhiteboard,
} from "@/lib/whiteboards";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({
      method: "GET",
      path: `/api/v1/rooms/${id}/whiteboard`,
      status: 401,
    });
    return response;
  }
  const result = await getOpenWhiteboard({ roomId: id, userId: actor.id });
  if (!result.ok) {
    logRequest({
      method: "GET",
      path: `/api/v1/rooms/${id}/whiteboard`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "GET",
    path: `/api/v1/rooms/${id}/whiteboard`,
    status: 200,
  });
  return Response.json({ data: result.session });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/whiteboard`,
      status: 401,
    });
    return response;
  }
  const result = await openWhiteboard({ roomId: id, actorId: actor.id });
  if (!result.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/whiteboard`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/whiteboard`,
    status: 201,
  });
  return Response.json(result.session, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({
      method: "DELETE",
      path: `/api/v1/rooms/${id}/whiteboard`,
      status: 401,
    });
    return response;
  }
  const json = await readJsonBody(request);
  const snapshotPngBase64 =
    json.ok &&
    typeof json.body === "object" &&
    json.body !== null &&
    "snapshotPngBase64" in json.body &&
    typeof (json.body as { snapshotPngBase64?: unknown }).snapshotPngBase64 ===
      "string"
      ? (json.body as { snapshotPngBase64: string }).snapshotPngBase64
      : undefined;
  const result = await closeWhiteboard({
    roomId: id,
    actorId: actor.id,
    snapshotPngBase64,
  });
  if (!result.ok) {
    logRequest({
      method: "DELETE",
      path: `/api/v1/rooms/${id}/whiteboard`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "DELETE",
    path: `/api/v1/rooms/${id}/whiteboard`,
    status: 200,
  });
  return Response.json(result.session);
}
