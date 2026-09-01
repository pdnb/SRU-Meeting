import type { OrgRole } from "@prisma/client";

export type SsoProviderId = "keycloak" | "microsoft-entra-id" | "google" | "okta";

export function configuredOidcProviders(
  env: Record<string, string | undefined> = process.env,
): {
  id: SsoProviderId;
  label: string;
}[] {
  const providers: { id: SsoProviderId; label: string }[] = [];
  if (env.AUTH_KEYCLOAK_ID && env.AUTH_KEYCLOAK_SECRET && env.AUTH_KEYCLOAK_ISSUER) {
    providers.push({ id: "keycloak", label: "Keycloak" });
  }
  if (env.AUTH_MICROSOFT_ENTRA_ID_ID && env.AUTH_MICROSOFT_ENTRA_ID_SECRET) {
    providers.push({ id: "microsoft-entra-id", label: "Microsoft Entra ID" });
  }
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
    providers.push({ id: "google", label: "Google Workspace" });
  }
  if (env.AUTH_OKTA_ID && env.AUTH_OKTA_SECRET && env.AUTH_OKTA_ISSUER) {
    providers.push({ id: "okta", label: "Okta" });
  }
  return providers;
}

export function samlIsConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.SAML_ENTRYPOINT && env.SAML_ISSUER && env.SAML_IDP_CERT);
}

export function ldapIsConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.LDAP_URL && env.LDAP_BASE_DN);
}

export function parseRoleMap(raw: string | undefined): Map<string, OrgRole> {
  const map = new Map<string, OrgRole>();
  for (const part of (raw ?? "").split(",")) {
    const [group, role] = part.split(":").map((value) => value.trim());
    if (!group || !role) continue;
    if (role === "org_admin" || role === "host" || role === "participant") {
      map.set(group.toLowerCase(), role);
    }
  }
  return map;
}

export function mapGroupsToOrgRole(
  groups: string[],
  roleMap = parseRoleMap(process.env.SSO_ROLE_MAP),
): OrgRole {
  const mapped = groups
    .map((group) => roleMap.get(group.toLowerCase()))
    .filter((role): role is OrgRole => role !== undefined);
  if (mapped.includes("org_admin")) {
    return "org_admin";
  }
  if (mapped.includes("host")) {
    return "host";
  }
  if (mapped.includes("participant")) {
    return "participant";
  }
  return "host";
}

export function groupsFromProfile(profile: Record<string, unknown>): string[] {
  const collected: string[] = [];
  const groups = profile.groups;
  if (Array.isArray(groups)) {
    collected.push(
      ...groups.filter((item): item is string => typeof item === "string"),
    );
  }
  const realm = profile.realm_access;
  if (realm && typeof realm === "object" && "roles" in realm) {
    const roles = (realm as { roles?: unknown }).roles;
    if (Array.isArray(roles)) {
      collected.push(
        ...roles.filter((item): item is string => typeof item === "string"),
      );
    }
  }
  return collected;
}
