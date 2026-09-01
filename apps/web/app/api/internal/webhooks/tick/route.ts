import { requireInternalSecret } from "@/lib/internal-auth";
import { deliverDueWebhooks } from "@/lib/webhooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireInternalSecret(request);
  if (denied) {
    return denied;
  }
  const delivered = await deliverDueWebhooks();
  return Response.json({ delivered });
}
