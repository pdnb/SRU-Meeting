import { TokenRequestSchema, TokenResponseSchema } from "@sru/shared";
import { getServerEnv } from "@/lib/env";
import { mintAccessToken } from "@/lib/livekit/token";

// Next.js 15 Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
// Token response is our camelCase contract; minting follows LiveKit AccessToken.

export const runtime = "nodejs";

function errorBody(code: string, message: string, details?: unknown) {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json(errorBody("NOT_FOUND", "Not found"), { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      errorBody("INVALID_JSON", "Request body must be valid JSON"),
      { status: 400 },
    );
  }

  const parsed = TokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      errorBody(
        "VALIDATION_ERROR",
        "Invalid token request",
        parsed.error.flatten(),
      ),
      { status: 422 },
    );
  }

  const env = getServerEnv();
  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.LIVEKIT_URL) {
    return Response.json(
      errorBody("MISCONFIGURED", "LiveKit is not configured"),
      { status: 503 },
    );
  }

  const token = await mintAccessToken({
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
    identity: parsed.data.identity,
    roomName: parsed.data.roomName,
    name: parsed.data.name,
  });

  const response = TokenResponseSchema.parse({
    token,
    url: env.LIVEKIT_URL,
  });

  return Response.json(response, { status: 201 });
}
