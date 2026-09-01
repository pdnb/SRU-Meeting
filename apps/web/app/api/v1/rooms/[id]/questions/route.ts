import { jsonError, readJsonBody } from "@/lib/api";
import { requireApiActor } from "@/lib/api-auth";
import {
  isModerationBody,
  listQuestions,
  moderateQuestion,
  submitQuestion,
} from "@/lib/questions";
import { logRequest } from "@/lib/request-log";

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
      path: `/api/v1/rooms/${id}/questions`,
      status: 401,
    });
    return response;
  }
  const result = await listQuestions({ roomId: id, userId: actor.id });
  if (!result.ok) {
    logRequest({
      method: "GET",
      path: `/api/v1/rooms/${id}/questions`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "GET",
    path: `/api/v1/rooms/${id}/questions`,
    status: 200,
  });
  return Response.json({ data: result.questions });
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
      path: `/api/v1/rooms/${id}/questions`,
      status: 401,
    });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const result = await submitQuestion({
    roomId: id,
    userId: actor.id,
    raw: json.body,
  });
  if (!result.ok) {
    logRequest({
      method: "POST",
      path: `/api/v1/rooms/${id}/questions`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "POST",
    path: `/api/v1/rooms/${id}/questions`,
    status: 201,
  });
  return Response.json(result.question, { status: 201 });
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
      path: `/api/v1/rooms/${id}/questions`,
      status: 401,
    });
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  if (!isModerationBody(json.body)) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid moderation payload");
  }
  const result = await moderateQuestion({
    roomId: id,
    actorId: actor.id,
    raw: json.body,
  });
  if (!result.ok) {
    logRequest({
      method: "PATCH",
      path: `/api/v1/rooms/${id}/questions`,
      status: result.status,
    });
    return jsonError(result.status, result.code, result.message);
  }
  logRequest({
    method: "PATCH",
    path: `/api/v1/rooms/${id}/questions`,
    status: 200,
  });
  return Response.json(result.question);
}
