import { requireScimBearer } from "@/lib/scim-auth";
import { deleteScimUser, getScimUser, patchScimUser } from "@/lib/scim-users";
import { readJsonBody } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireScimBearer(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;
  return getScimUser({ request, id });
}

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
  return patchScimUser({ request, id, body: json.body });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireScimBearer(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;
  return deleteScimUser({ request, id });
}
