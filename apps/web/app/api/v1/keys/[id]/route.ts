import { jsonError } from "@/lib/api";
import { revokeApiKey } from "@/lib/api-keys";
import { writeAudit } from "@/lib/audit";
import { requireSessionUser } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { user, response } = await requireSessionUser();
  if (!user) {
    return response;
  }
  const result = await revokeApiKey({ userId: user.id, id });
  if (!result.ok) {
    return jsonError(result.status, result.code, result.message);
  }
  await writeAudit({
    actorId: user.id,
    action: "apikey.revoke",
    targetType: "api_key",
    targetId: id,
  });
  return new Response(null, { status: 204 });
}
