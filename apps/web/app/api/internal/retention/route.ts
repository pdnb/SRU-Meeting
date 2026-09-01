import { requireInternalSecret } from "@/lib/internal-auth";
import { runRetentionJobs } from "@/lib/retention";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireInternalSecret(request);
  if (denied) {
    return denied;
  }
  const result = await runRetentionJobs();
  return Response.json(result);
}
