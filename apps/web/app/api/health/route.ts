import { buildHealthPayload, pingLiveKit } from "@/lib/health";
import { logRequest } from "@/lib/request-log";

export const runtime = "nodejs";

export async function GET() {
  const payload = buildHealthPayload(await pingLiveKit());
  logRequest({ method: "GET", path: "/api/health", status: 200 });
  return Response.json(payload);
}
