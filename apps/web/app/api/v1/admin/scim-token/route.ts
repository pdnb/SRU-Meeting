import { readJsonBody } from "@/lib/api";
import { requireOrgAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import {
  generateScimBearerToken,
  getScimTokenMeta,
  revokeScimBearerToken,
  storeScimBearerToken,
} from "@/lib/scim";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const meta = await getScimTokenMeta();
  return Response.json({ data: meta });
}

export async function POST(request: Request) {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const rotate =
    typeof json.body === "object" &&
    json.body !== null &&
    (json.body as { rotate?: unknown }).rotate === true;
  const prior = await getScimTokenMeta();
  const token = generateScimBearerToken();
  await storeScimBearerToken(token, rotate && prior.configured);
  await writeAudit({
    actorId: user.id,
    action: prior.configured ? "scim.token.rotate" : "scim.token.rotate",
    targetType: "org",
    targetId: "scim-token",
    metadata: { rotate: prior.configured },
  });
  return Response.json({
    data: {
      token,
      configured: true,
      displayOnce: true,
    },
  });
}

export async function DELETE() {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  await revokeScimBearerToken();
  await writeAudit({
    actorId: user.id,
    action: "scim.token.rotate",
    targetType: "org",
    targetId: "scim-token",
    metadata: { revoked: true },
  });
  return Response.json({ ok: true });
}
