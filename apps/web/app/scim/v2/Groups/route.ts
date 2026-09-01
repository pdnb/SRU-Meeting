import { requireScimBearer } from "@/lib/scim-auth";
import { listScimGroups } from "@/lib/scim-groups";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScimBearer(request);
  if (!auth.ok) {
    return auth.response;
  }
  return listScimGroups(request);
}
