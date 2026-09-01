import "server-only";

import type { OrgRole, User } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { mapGroupsToOrgRole, parseRoleMap } from "@/lib/sso";

export const SCIM_BEARER_SETTING_KEY = "scimBearerToken";

export const SCIM_CONTENT_TYPE = "application/scim+json";

export const SCIM_LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
export const SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
export const SCIM_GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
export const SCIM_PATCH_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:PatchOp";
export const SCIM_ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

export type ScimTokenMeta = {
  configured: boolean;
  createdAt: string | null;
  lastRotatedAt: string | null;
};

export type ScimUserResource = {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: { formatted?: string };
  displayName?: string;
  active: boolean;
  emails?: { value: string; primary?: boolean }[];
  groups?: { value: string; display: string }[];
  meta: {
    resourceType: "User";
    created: string;
    lastModified: string;
    location: string;
  };
};

export type ScimGroupResource = {
  schemas: string[];
  id: string;
  displayName: string;
  members: { value: string; display?: string }[];
  meta: {
    resourceType: "Group";
    location: string;
  };
};

type StoredScimToken = {
  hash: string;
  createdAt: string;
  lastRotatedAt: string | null;
};

function storedToken(value: unknown): StoredScimToken | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.hash !== "string" || typeof row.createdAt !== "string") {
    return null;
  }
  return {
    hash: row.hash,
    createdAt: row.createdAt,
    lastRotatedAt:
      typeof row.lastRotatedAt === "string" ? row.lastRotatedAt : null,
  };
}

export function scimGroupRoleMap(
  env: Record<string, string | undefined> = process.env,
): Map<string, OrgRole> {
  return parseRoleMap(env.SCIM_GROUP_ROLE_MAP ?? env.SSO_ROLE_MAP);
}

export function configuredScimGroups(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const groups: string[] = [];
  for (const part of (env.SCIM_GROUP_ROLE_MAP ?? env.SSO_ROLE_MAP ?? "").split(",")) {
    const [group] = part.split(":").map((value) => value.trim());
    if (group) {
      groups.push(group);
    }
  }
  return groups;
}

export function orgRoleFromScimGroups(
  groups: string[],
  env: Record<string, string | undefined> = process.env,
): OrgRole {
  return mapGroupsToOrgRole(groups, scimGroupRoleMap(env));
}

export function generateScimBearerToken(): string {
  return `sru_scim_${randomBytes(32).toString("hex")}`;
}

export async function getScimTokenMeta(): Promise<ScimTokenMeta> {
  const row = await prisma.orgSetting.findUnique({
    where: { key: SCIM_BEARER_SETTING_KEY },
  });
  const token = storedToken(row?.value);
  if (!token) {
    return { configured: false, createdAt: null, lastRotatedAt: null };
  }
  return {
    configured: true,
    createdAt: token.createdAt,
    lastRotatedAt: token.lastRotatedAt,
  };
}

export async function storeScimBearerToken(
  plaintext: string,
  rotate: boolean,
): Promise<void> {
  const existing = await prisma.orgSetting.findUnique({
    where: { key: SCIM_BEARER_SETTING_KEY },
  });
  const prior = storedToken(existing?.value);
  const now = new Date().toISOString();
  const hash = await hashPassword(plaintext);
  await prisma.orgSetting.upsert({
    where: { key: SCIM_BEARER_SETTING_KEY },
    update: {
      value: {
        hash,
        createdAt: prior?.createdAt ?? now,
        lastRotatedAt: rotate ? now : prior?.lastRotatedAt ?? null,
      },
    },
    create: {
      key: SCIM_BEARER_SETTING_KEY,
      value: {
        hash,
        createdAt: now,
        lastRotatedAt: null,
      },
    },
  });
}

export async function revokeScimBearerToken(): Promise<void> {
  await prisma.orgSetting.deleteMany({
    where: { key: SCIM_BEARER_SETTING_KEY },
  });
}

export async function verifyScimBearerToken(
  bearer: string | null | undefined,
): Promise<boolean> {
  if (!bearer?.trim()) {
    return false;
  }
  const row = await prisma.orgSetting.findUnique({
    where: { key: SCIM_BEARER_SETTING_KEY },
  });
  const token = storedToken(row?.value);
  if (!token) {
    return false;
  }
  return verifyPassword(token.hash, bearer.trim());
}

export function parseScimUserNameFilter(
  filter: string | null,
): { ok: true; userName: string } | { ok: false; message: string } {
  if (!filter?.trim()) {
    return { ok: false, message: "filter is required" };
  }
  const match = filter.trim().match(/^userName\s+eq\s+"([^"]+)"$/i);
  if (!match?.[1]) {
    return {
      ok: false,
      message: 'Only filter=userName eq "email@example.com" is supported',
    };
  }
  return { ok: true, userName: match[1].toLowerCase() };
}

export function scimJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Content-Type": SCIM_CONTENT_TYPE },
  });
}

export function scimError(
  status: number,
  detail: string,
  scimType?: string,
): Response {
  return scimJson(
    {
      schemas: [SCIM_ERROR_SCHEMA],
      status: String(status),
      detail,
      ...(scimType ? { scimType } : {}),
    },
    status,
  );
}

export function toScimUser(
  user: Pick<
    User,
    | "id"
    | "email"
    | "name"
    | "externalId"
    | "deletedAt"
    | "createdAt"
    | "updatedAt"
    | "scimGroups"
  >,
  baseUrl: string,
): ScimUserResource {
  const active = user.deletedAt === null;
  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.id,
    ...(user.externalId ? { externalId: user.externalId } : {}),
    userName: user.email,
    ...(user.name
      ? {
          name: { formatted: user.name },
          displayName: user.name,
        }
      : {}),
    active,
    emails: [{ value: user.email, primary: true }],
    groups: user.scimGroups.map((group) => ({
      value: group,
      display: group,
    })),
    meta: {
      resourceType: "User",
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `${baseUrl}/scim/v2/Users/${user.id}`,
    },
  };
}

export function toScimGroup(
  groupId: string,
  members: { id: string; email: string }[],
  baseUrl: string,
): ScimGroupResource {
  return {
    schemas: [SCIM_GROUP_SCHEMA],
    id: groupId,
    displayName: groupId,
    members: members.map((member) => ({
      value: member.id,
      display: member.email,
    })),
    meta: {
      resourceType: "Group",
      location: `${baseUrl}/scim/v2/Groups/${encodeURIComponent(groupId)}`,
    },
  };
}

export function scimListResponse<T>(resources: T[]): {
  schemas: string[];
  totalResults: number;
  itemsPerPage: number;
  startIndex: number;
  Resources: T[];
} {
  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: resources.length,
    itemsPerPage: resources.length,
    startIndex: 1,
    Resources: resources,
  };
}

export type ScimPatchOperation = {
  op: string;
  path?: string;
  value?: unknown;
};

export function parseScimPatchOperations(body: unknown): ScimPatchOperation[] {
  if (!body || typeof body !== "object") {
    return [];
  }
  const operations = (body as { Operations?: unknown }).Operations;
  if (!Array.isArray(operations)) {
    return [];
  }
  return operations.filter(
    (item): item is ScimPatchOperation =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as ScimPatchOperation).op === "string",
  );
}
