import { jsonError, readJsonBody } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import {
  closePoll,
  createPoll,
  getOpenPoll,
  isCreatePollBody,
  votePoll,
} from "@/lib/polls";
import { logRequest } from "@/lib/request-log";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({ method: "GET", path: `/api/v1/rooms/${id}/polls`, status: 401 });
    return response;
  }
  const result = await getOpenPoll({ roomId: id, userId: actor.id });
  if (!result.ok) {
    logRequest({
      method: "GET",
      path: `/api/v1/rooms/${id}/polls`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({ method: "GET", path: `/api/v1/rooms/${id}/polls`, status: 200 });
  return Response.json({ data: result.poll });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({ method: "POST", path: `/api/v1/rooms/${id}/polls`, status: 401 });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const result = isCreatePollBody(json.body)
    ? await createPoll({ roomId: id, actorId: actor.id, raw: json.body })
    : await votePoll({ roomId: id, userId: actor.id, raw: json.body });
  if (!result.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/polls`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/polls`,
    status: 201,
  });
  return Response.json(result.poll, { status: 201 });
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
      path: `/api/v1/rooms/${id}/polls`,
      status: 401,
    });
    return response;
  }
  const result = await closePoll({ roomId: id, actorId: actor.id });
  if (!result.ok) {
    logRequest({
      method: "DELETE",
      path: `/api/v1/rooms/${id}/polls`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "DELETE",
    path: `/api/v1/rooms/${id}/polls`,
    status: 200,
  });
  return Response.json(result.poll);
}
