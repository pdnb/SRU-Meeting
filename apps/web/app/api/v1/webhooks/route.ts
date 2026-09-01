import { jsonError, readJsonBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requireSessionUser } from "@/lib/session";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
} from "@/lib/webhooks";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireSessionUser();
  if (!user) {
    return response;
  }
  return Response.json({ data: await listWebhookEndpoints(user.id) });
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
  const result = await createWebhookEndpoint({ userId: user.id, raw: json.body });
  if (!result.ok) {
    return jsonError(result.status, result.code, result.message);
  }
  await writeAudit({
    actorId: user.id,
    action: "webhook.create",
    targetType: "webhook",
    targetId: result.endpoint.id,
  });
  return Response.json(
    { ...result.endpoint, secret: result.secret },
    { status: 201 },
  );
}
