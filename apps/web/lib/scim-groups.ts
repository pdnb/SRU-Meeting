import "server-only";

import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { orgRoleForNewUser } from "@/lib/rbac";
import {
  configuredScimGroups,
  orgRoleFromScimGroups,
  parseScimPatchOperations,
  scimError,
  scimJson,
  scimListResponse,
  toScimGroup,
} from "@/lib/scim";

function baseUrlFromRequest(request: Request): string {
  return new URL(request.url).origin;
}

function readMemberIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object" && typeof (item as { value?: unknown }).value === "string") {
        return (item as { value: string }).value;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

async function membersForGroup(groupId: string) {
  const users = await prisma.user.findMany({
    where: {
      isGuest: false,
      deletedAt: null,
      scimGroups: { has: groupId },
    },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });
  return users;
}

export async function listScimGroups(request: Request): Promise<Response> {
  const baseUrl = baseUrlFromRequest(request);
  const groups = configuredScimGroups();
  const resources = await Promise.all(
    groups.map(async (groupId) =>
      toScimGroup(groupId, await membersForGroup(groupId), baseUrl),
    ),
  );
  return scimJson(scimListResponse(resources));
}

export async function patchScimGroup(input: {
  request: Request;
  id: string;
  body: unknown;
}): Promise<Response> {
  const groupId = decodeURIComponent(input.id);
  const knownGroups = configuredScimGroups();
  if (!knownGroups.some((group) => group.toLowerCase() === groupId.toLowerCase())) {
    return scimError(404, "Group not found");
  }
  const canonicalId =
    knownGroups.find((group) => group.toLowerCase() === groupId.toLowerCase()) ??
    groupId;

  const operations = parseScimPatchOperations(input.body);
  for (const operation of operations) {
    const op = operation.op.toLowerCase();
    const path = operation.path?.toLowerCase();
    if (op === "add" && path === "members") {
      await addMembers(canonicalId, readMemberIds(operation.value));
      continue;
    }
    if (op === "remove" && path?.startsWith("members")) {
      const memberId = readMemberRef(path);
      if (memberId) {
        await removeMember(canonicalId, memberId);
      }
      continue;
    }
    if (op === "replace" && path === "members") {
      await replaceMembers(canonicalId, readMemberIds(operation.value));
    }
  }

  const baseUrl = baseUrlFromRequest(input.request);
  return scimJson(
    toScimGroup(canonicalId, await membersForGroup(canonicalId), baseUrl),
  );
}

async function addMembers(groupId: string, memberIds: string[]): Promise<void> {
  for (const memberId of memberIds) {
    const user = await prisma.user.findFirst({
      where: { id: memberId, isGuest: false, deletedAt: null },
    });
    if (!user) {
      continue;
    }
    const scimGroups = user.scimGroups.includes(groupId)
      ? user.scimGroups
      : [...user.scimGroups, groupId];
    await prisma.user.update({
      where: { id: user.id },
      data: {
        scimGroups,
        orgRole: orgRoleFromScimGroups(scimGroups),
        ssoProvider: "scim",
      },
    });
    await writeAudit({
      action: "scim.user.update",
      targetType: "user",
      targetId: user.id,
      metadata: { groupId, membership: "add" },
    });
  }
}

async function removeMember(groupId: string, memberId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: memberId, isGuest: false, deletedAt: null },
  });
  if (!user) {
    return;
  }
  const scimGroups = user.scimGroups.filter((group) => group !== groupId);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      scimGroups,
      orgRole: scimGroups.length
        ? orgRoleFromScimGroups(scimGroups)
        : orgRoleForNewUser(user.email),
      ssoProvider: "scim",
    },
  });
  await writeAudit({
    action: "scim.user.update",
    targetType: "user",
    targetId: user.id,
    metadata: { groupId, membership: "remove" },
  });
}

async function replaceMembers(groupId: string, memberIds: string[]): Promise<void> {
  const current = await prisma.user.findMany({
    where: {
      isGuest: false,
      deletedAt: null,
      scimGroups: { has: groupId },
    },
    select: { id: true },
  });
  const next = new Set(memberIds);
  for (const user of current) {
    if (!next.has(user.id)) {
      await removeMember(groupId, user.id);
    }
  }
  await addMembers(groupId, memberIds);
}

function readMemberRef(path: string): string | null {
  const match = path.match(/members\[value eq "(.+)"\]/i);
  return match?.[1] ?? null;
}
