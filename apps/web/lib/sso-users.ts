import "server-only";

import type { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { orgRoleForNewUser } from "@/lib/rbac";
import { mapGroupsToOrgRole } from "@/lib/sso";

export async function upsertFederatedUser(input: {
  email: string;
  name?: string | null;
  provider: string;
  subject: string;
  groups?: string[];
  ldapDn?: string | null;
}): Promise<{
  id: string;
  email: string;
  name: string | null;
  orgRole: OrgRole;
}> {
  const email = input.email.toLowerCase();
  const fromGroups = input.groups?.length
    ? mapGroupsToOrgRole(input.groups)
    : orgRoleForNewUser(email);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { ssoProvider: input.provider, ssoSubject: input.subject },
      ],
    },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name ?? existing.name,
        ssoProvider: input.provider,
        ssoSubject: input.subject,
        ldapDn: input.ldapDn ?? existing.ldapDn,
        orgRole: input.groups?.length ? fromGroups : existing.orgRole,
        deletedAt: null,
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      orgRole: updated.orgRole,
    };
  }

  const created = await prisma.user.create({
    data: {
      email,
      name: input.name ?? null,
      passwordHash: null,
      isGuest: false,
      orgRole: fromGroups,
      ssoProvider: input.provider,
      ssoSubject: input.subject,
      ldapDn: input.ldapDn ?? null,
    },
  });
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    orgRole: created.orgRole,
  };
}
