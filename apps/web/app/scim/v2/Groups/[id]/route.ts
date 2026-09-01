import { readJsonBody } from "@/lib/api";
import { requireScimBearer } from "@/lib/scim-auth";
import { patchScimGroup } from "@/lib/scim-groups";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireScimBearer(request);
  if (!auth.ok) {
    return auth.response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    const { scimError } = await import("@/lib/scim");
    return scimError(400, "Request body must be valid JSON");
  }
  const { id } = await context.params;
  return patchScimGroup({ request, id, body: json.body });
}
