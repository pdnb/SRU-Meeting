import { jsonError, readJsonBody } from "@/lib/api";
import { submitQosReport } from "@/lib/analytics/qos";
import { requireSessionUser } from "@/lib/session";
import { SubmitQosReportRequestSchema } from "@sru/shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireSessionUser();
  if (!user) {
    return response;
  }

  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }

  const parsed = SubmitQosReportRequestSchema.safeParse(json.body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION_ERROR", "Invalid QoS report payload");
  }

  const result = await submitQosReport(user.id, parsed.data);
  if (!result.ok) {
    return jsonError(result.status, result.code, result.message);
  }

  return new Response(null, { status: 204 });
}
