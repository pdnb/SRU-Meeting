import { jsonError, readJsonBody } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import {
  applyBreakoutAction,
  closeBreakouts,
  createBreakouts,
  getOpenBreakout,
} from "@/lib/breakouts";
import { logRequest } from "@/lib/request-log";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({ method: "GET", path: `/api/v1/rooms/${id}/breakouts`, status: 401 });
    return response;
  }
  const result = await getOpenBreakout({ roomId: id, actorId: actor.id });
  if (!result.ok) {
    logRequest({
      method: "GET",
      path: `/api/v1/rooms/${id}/breakouts`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({ method: "GET", path: `/api/v1/rooms/${id}/breakouts`, status: 200 });
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
      path: `/api/v1/rooms/${id}/breakouts`,
      status: 401,
    });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const result = await createBreakouts({
    roomId: id,
    actorId: actor.id,
    raw: json.body,
  });
  if (!result.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/breakouts`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/breakouts`,
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
    return response;
  }
  const result = await closeBreakouts({ roomId: id, actorId: actor.id });
  if (!result.ok) {
    logRequest({
      method: "DELETE",
      path: `/api/v1/rooms/${id}/breakouts`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "DELETE",
    path: `/api/v1/rooms/${id}/breakouts`,
    status: 200,
  });
  return Response.json(result.session);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { actor, response } = await requireApiActor(request);
  if (!actor) {
    logRequest({
      method: "PATCH",
      path: `/api/v1/rooms/${id}/breakouts`,
      status: 401,
    });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const result = await applyBreakoutAction({
    roomId: id,
    actorId: actor.id,
    raw: json.body,
  });
  if (!result.ok) {
    logRequest({
      method: "PATCH",
      path: `/api/v1/rooms/${id}/breakouts`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "PATCH",
    path: `/api/v1/rooms/${id}/breakouts`,
    status: 200,
  });
  if (result.assignment) {
    return Response.json(result.assignment);
  }
  return Response.json(result.packet);
}
