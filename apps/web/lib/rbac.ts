import type { OrgRole } from "@prisma/client";

export function canCreateRoom(role: OrgRole | null | undefined): boolean {
  return role === "org_admin" || role === "host";
}

export function isOrgAdmin(role: OrgRole | null | undefined): boolean {
  return role === "org_admin";
}

export function parseOrgAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function orgRoleForNewUser(email: string, envEmails?: string): OrgRole {
  return parseOrgAdminEmails(envEmails ?? process.env.ORG_ADMIN_EMAILS).has(
    email.toLowerCase(),
  )
    ? "org_admin"
    : "host";
}
