import { ApiErrorSchema } from "@sru/shared";

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body = ApiErrorSchema.parse({
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
  return Response.json(body, { status });
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: jsonError(400, "INVALID_JSON", "Request body must be valid JSON"),
    };
  }
}
