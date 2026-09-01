import { jsonError } from "@/lib/api";
import { getSaml } from "@/lib/saml";

export const runtime = "nodejs";

export async function GET() {
  const saml = getSaml();
  if (!saml) {
    return jsonError(404, "NOT_FOUND", "SAML is not configured");
  }
  const url = await saml.getAuthorizeUrlAsync("", "", {});
  return Response.redirect(url);
}
