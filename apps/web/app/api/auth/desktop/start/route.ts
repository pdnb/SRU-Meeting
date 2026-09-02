import { jsonError } from "@/lib/api";
import { configuredOidcProviders, type SsoProviderId } from "@/lib/sso";

export const runtime = "nodejs";

const SSO_PROVIDER_IDS = new Set<SsoProviderId>([
  "keycloak",
  "microsoft-entra-id",
  "google",
  "okta",
]);

function isSsoProviderId(value: string): value is SsoProviderId {
  return SSO_PROVIDER_IDS.has(value as SsoProviderId);
}

/** Starts OIDC SSO in the system browser; completes at /api/auth/desktop/complete. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  if (!provider || !isSsoProviderId(provider)) {
    return jsonError(400, "VALIDATION_ERROR", "provider query parameter is required");
  }

  const allowed = new Set(configuredOidcProviders().map((item) => item.id));
  if (!allowed.has(provider)) {
    return jsonError(404, "NOT_FOUND", "Provider is not configured");
  }

  const callbackUrl = new URL("/api/auth/desktop/complete", request.url).toString();
  const signInUrl = new URL(`/api/auth/signin/${provider}`, request.url);
  signInUrl.searchParams.set("callbackUrl", callbackUrl);
  return Response.redirect(signInUrl);
}
