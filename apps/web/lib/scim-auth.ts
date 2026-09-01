import "server-only";

import { scimError, verifyScimBearerToken } from "@/lib/scim";

export async function requireScimBearer(
  request: Request,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;
  const valid = await verifyScimBearerToken(bearer);
  if (!valid) {
    return {
      ok: false,
      response: scimError(401, "Invalid or missing bearer token"),
    };
  }
  return { ok: true };
}
