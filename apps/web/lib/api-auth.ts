import "server-only";

import type { OrgRole } from "@prisma/client";
import { jsonError } from "@/lib/api";
import { resolveApiKeySecret, touchApiKey } from "@/lib/api-keys";
import { prisma } from "@/lib/db";
import { verifyApiHmac } from "@/lib/hmac";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getSessionUser, type SessionUser } from "@/lib/session";

export type ApiActor = SessionUser & { via: "session" | "api_key" };

function requestPath(request: Request): string {
  return new URL(request.url).pathname;
}

export async function authenticateApiRequest(
  request: Request,
): Promise<
  | { actor: ApiActor; response: null }
  | { actor: null; response: Response }
> {
  const keyId = request.headers.get("x-api-key");
  const timestamp = request.headers.get("x-api-timestamp");
  const signature = request.headers.get("x-api-signature");

  if (keyId || timestamp || signature) {
    if (!keyId || !timestamp || !signature) {
      return {
        actor: null,
        response: jsonError(401, "UNAUTHORIZED", "HMAC headers are incomplete"),
      };
    }
    const resolved = await resolveApiKeySecret(keyId);
    if (!resolved) {
      return {
        actor: null,
        response: jsonError(401, "UNAUTHORIZED", "Unknown API key"),
      };
    }
    const body = request.bodyUsed ? "" : await request.clone().text();
    const ok = verifyApiHmac({
      secret: resolved.secret,
      method: request.method,
      path: requestPath(request),
      timestamp,
      body,
      signature,
    });
    if (!ok) {
      return {
        actor: null,
        response: jsonError(401, "UNAUTHORIZED", "Invalid HMAC signature"),
      };
    }
    const limited = consumeRateLimit(keyId);
    if (!limited.ok) {
      return {
        actor: null,
        response: new Response(
          JSON.stringify({
            error: {
              code: "RATE_LIMITED",
              message: "API key rate limit exceeded",
            },
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(limited.retryAfterSeconds),
            },
          },
        ),
      };
    }
    const user = await prisma.user.findUnique({ where: { id: resolved.userId } });
    if (!user || user.deletedAt) {
      return {
        actor: null,
        response: jsonError(401, "UNAUTHORIZED", "API key owner is inactive"),
      };
    }
    await touchApiKey(resolved.keyRowId);
    return {
      actor: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgRole: user.orgRole,
        via: "api_key",
      },
      response: null,
    };
  }

  const session = await getSessionUser();
  if (!session) {
    return {
      actor: null,
      response: jsonError(401, "UNAUTHORIZED", "Sign in required"),
    };
  }
  return { actor: { ...session, via: "session" }, response: null };
}

export async function requireApiActor(request: Request): Promise<
  { actor: ApiActor; response: null } | { actor: null; response: Response }
> {
  return authenticateApiRequest(request);
}

export function actorOrgRole(actor: { orgRole?: OrgRole | null }): OrgRole {
  return actor.orgRole ?? "host";
}
