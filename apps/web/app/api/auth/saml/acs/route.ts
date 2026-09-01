import { jsonError } from "@/lib/api";
import { getSaml, issueSamlTicket, parseSamlProfile, rejectInvalidSamlResponse } from "@/lib/saml";
import { upsertFederatedUser } from "@/lib/sso-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const saml = getSaml();
  if (!saml) {
    return jsonError(404, "NOT_FOUND", "SAML is not configured");
  }
  const form = await request.formData();
  const response = String(form.get("SAMLResponse") ?? "");
  try {
    const { profile } = await saml.validatePostResponseAsync({
      SAMLResponse: response,
    });
    const parsed = parseSamlProfile((profile ?? {}) as Record<string, unknown>);
    if (!parsed) {
      const denied = rejectInvalidSamlResponse();
      return jsonError(denied.status, denied.code, denied.message);
    }
    const user = await upsertFederatedUser({
      email: parsed.email,
      name: parsed.name,
      provider: "saml",
      subject: parsed.subject,
      groups: parsed.groups,
    });
    const ticket = issueSamlTicket(user.id);
    return Response.redirect(
      new URL(`/login?samlTicket=${ticket}`, request.url),
    );
  } catch {
    const denied = rejectInvalidSamlResponse();
    return jsonError(denied.status, denied.code, denied.message);
  }
}
