import { configuredOidcProviders, ldapIsConfigured, samlIsConfigured } from "@/lib/sso";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    oidc: configuredOidcProviders(),
    saml: samlIsConfigured(),
    ldap: ldapIsConfigured(),
  });
}
