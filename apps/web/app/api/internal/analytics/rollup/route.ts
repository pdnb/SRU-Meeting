import { requireInternalSecret } from "@/lib/internal-auth";
import { runAnalyticsRollup } from "@/lib/analytics/rollup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireInternalSecret(request);
  if (denied) {
    return denied;
  }
  const result = await runAnalyticsRollup();
  return Response.json(result);
}
