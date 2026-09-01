import { jsonError, readJsonBody } from "@/lib/api";
import { requireSessionUser } from "@/lib/session";
import { createApiKey, listApiKeys } from "@/lib/api-keys";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireSessionUser();
  if (!user) {
    return response;
  }
  return Response.json({ data: await listApiKeys(user.id) });
}

export async function POST(request: Request) {
  const { user, response } = await requireSessionUser();
  if (!user) {
    return response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const result = await createApiKey({ userId: user.id, raw: json.body });
  if (!result.ok) {
    return jsonError(result.status, result.code, result.message);
  }
  await writeAudit({
    actorId: user.id,
    action: "apikey.create",
    targetType: "api_key",
    targetId: result.key.id,
  });
  return Response.json({ ...result.key, secret: result.secret }, { status: 201 });
}
