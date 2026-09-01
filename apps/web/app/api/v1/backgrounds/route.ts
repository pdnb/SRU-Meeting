import { listBackgroundPresets } from "@/lib/backgrounds/list";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const data = await listBackgroundPresets(origin);
  return Response.json({ data });
}
