import { requireScimBearer } from "@/lib/scim-auth";
import { createScimUser, listScimUsers } from "@/lib/scim-users";
import { readJsonBody } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScimBearer(request);
  if (!auth.ok) {
    return auth.response;
  }
  const url = new URL(request.url);
  return listScimUsers({
    request,
    filter: url.searchParams.get("filter"),
  });
}

export async function POST(request: Request) {
  const auth = await requireScimBearer(request);
  if (!auth.ok) {
    return auth.response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    const { scimError } = await import("@/lib/scim");
    return scimError(400, "Request body must be valid JSON");
  }
  return createScimUser({ request, body: json.body });
}
