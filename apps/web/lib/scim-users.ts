import "server-only";

import type { User } from "@prisma/client";
import { writeAudit } from "@/lib/audit";
import { deleteUserData } from "@/lib/deletion";
import { prisma } from "@/lib/db";
import { ensurePersonalRoom } from "@/lib/personal-room";
import { orgRoleForNewUser } from "@/lib/rbac";
import {
  orgRoleFromScimGroups,
  parseScimPatchOperations,
  parseScimUserNameFilter,
  scimError,
  scimJson,
  scimListResponse,
  toScimUser,
} from "@/lib/scim";

type ActiveUser = User & { deletedAt: null };

function isActiveUser(user: User | null): user is ActiveUser {
  return user !== null && user.deletedAt === null && !user.isGuest;
}

function baseUrlFromRequest(request: Request): string {
  return new URL(request.url).origin;
}

export async function listScimUsers(input: {
  request: Request;
  filter: string | null;
}): Promise<Response> {
  let userName: string | undefined;
  if (input.filter) {
    const parsed = parseScimUserNameFilter(input.filter);
    if (!parsed.ok) {
      return scimError(400, parsed.message, "invalidFilter");
    }
    userName = parsed.userName;
  }

  const users = await prisma.user.findMany({
    where: {
      isGuest: false,
      deletedAt: null,
      ...(userName ? { email: userName } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  const baseUrl = baseUrlFromRequest(input.request);
  return scimJson(scimListResponse(users.map((user) => toScimUser(user, baseUrl))));
}

export async function getScimUser(input: {
  request: Request;
  id: string;
}): Promise<Response> {
  const user = await prisma.user.findFirst({
    where: {
      id: input.id,
      isGuest: false,
      deletedAt: null,
    },
  });
  if (!isActiveUser(user)) {
    return scimError(404, "User not found");
  }
  const baseUrl = baseUrlFromRequest(input.request);
  return scimJson(toScimUser(user, baseUrl));
}

export async function createScimUser(input: {
  request: Request;
  body: unknown;
}): Promise<Response> {
  if (!input.body || typeof input.body !== "object") {
    return scimError(400, "Invalid SCIM user payload");
  }
  const payload = input.body as Record<string, unknown>;
  const userName =
    typeof payload.userName === "string"
      ? payload.userName.toLowerCase()
      : null;
  if (!userName) {
    return scimError(400, "userName is required");
  }

  const externalId =
    typeof payload.externalId === "string" ? payload.externalId : null;
  const formattedName =
    payload.name &&
    typeof payload.name === "object" &&
    typeof (payload.name as { formatted?: unknown }).formatted === "string"
      ? (payload.name as { formatted: string }).formatted
      : typeof payload.displayName === "string"
        ? payload.displayName
        : null;
  const active =
    typeof payload.active === "boolean" ? payload.active : true;
  if (!active) {
    return scimError(400, "Creating inactive users is not supported");
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: userName },
        ...(externalId ? [{ externalId }] : []),
      ],
    },
  });
  if (existing && existing.deletedAt === null && !existing.isGuest) {
    return scimError(409, "User already exists", "uniqueness");
  }

  const created = await prisma.user.create({
    data: {
      email: userName,
      name: formattedName,
      externalId,
      passwordHash: null,
      isGuest: false,
      orgRole: orgRoleForNewUser(userName),
      ssoProvider: "scim",
      ssoSubject: externalId ?? userName,
      scimGroups: [],
    },
  });

  await ensurePersonalRoom(created.id);

  await writeAudit({
    action: "scim.user.create",
    targetType: "user",
    targetId: created.id,
    metadata: { email: created.email, externalId },
  });

  const baseUrl = baseUrlFromRequest(input.request);
  return scimJson(toScimUser(created, baseUrl), 201);
}

export async function patchScimUser(input: {
  request: Request;
  id: string;
  body: unknown;
}): Promise<Response> {
  const user = await prisma.user.findFirst({
    where: { id: input.id, isGuest: false, deletedAt: null },
  });
  if (!isActiveUser(user)) {
    return scimError(404, "User not found");
  }

  const operations = parseScimPatchOperations(input.body);
  let email = user.email;
  let name = user.name;
  let externalId = user.externalId;
  let active = true;
  let scimGroups = [...user.scimGroups];

  for (const operation of operations) {
    const op = operation.op.toLowerCase();
    const path = operation.path?.toLowerCase();

    if (op === "replace" && path === "active") {
      active = Boolean(operation.value);
      continue;
    }
    if (op === "replace" && path === "username") {
      if (typeof operation.value !== "string") {
        return scimError(400, "userName must be a string");
      }
      email = operation.value.toLowerCase();
      continue;
    }
    if (op === "replace" && path === "externalid") {
      externalId =
        typeof operation.value === "string" ? operation.value : null;
      continue;
    }
    if (
      (op === "replace" && (path === "name.formatted" || path === "displayname")) ||
      (op === "replace" && !path && typeof operation.value === "object")
    ) {
      const value = operation.value;
      if (typeof value === "string") {
        name = value;
      } else if (value && typeof value === "object") {
        const formatted = (value as { formatted?: unknown }).formatted;
        if (typeof formatted === "string") {
          name = formatted;
        }
      }
      continue;
    }
    if (op === "replace" && !path && valueIsUserPatch(operation.value)) {
      const patch = operation.value;
      if (typeof patch.userName === "string") {
        email = patch.userName.toLowerCase();
      }
      if (typeof patch.externalId === "string") {
        externalId = patch.externalId;
      }
      if (typeof patch.active === "boolean") {
        active = patch.active;
      }
      if (patch.name && typeof patch.name.formatted === "string") {
        name = patch.name.formatted;
      }
      if (typeof patch.displayName === "string") {
        name = patch.displayName;
      }
      continue;
    }
    if (op === "add" && path === "groups") {
      scimGroups = mergeGroups(scimGroups, readGroupValues(operation.value));
      continue;
    }
    if (op === "remove" && path?.startsWith("groups")) {
      const removed = readGroupRef(path);
      if (removed) {
        scimGroups = scimGroups.filter((group) => group !== removed);
      }
      continue;
    }
  }

  if (!active) {
    return deleteScimUser({
      request: input.request,
      id: user.id,
      auditAction: "scim.user.update",
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      email,
      name,
      externalId,
      scimGroups,
      orgRole: scimGroups.length
        ? orgRoleFromScimGroups(scimGroups)
        : orgRoleForNewUser(email),
      ssoProvider: "scim",
      ssoSubject: externalId ?? email,
    },
  });

  await writeAudit({
    action: "scim.user.update",
    targetType: "user",
    targetId: updated.id,
    metadata: { email: updated.email, externalId: updated.externalId },
  });

  const baseUrl = baseUrlFromRequest(input.request);
  return scimJson(toScimUser(updated, baseUrl));
}

export async function deleteScimUser(input: {
  request: Request;
  id: string;
  auditAction?: "scim.user.delete" | "scim.user.update";
}): Promise<Response> {
  const user = await prisma.user.findFirst({
    where: { id: input.id, isGuest: false, deletedAt: null },
  });
  if (!isActiveUser(user)) {
    return new Response(null, { status: 404 });
  }

  await deleteUserData(user.id);
  await writeAudit({
    action: input.auditAction ?? "scim.user.delete",
    targetType: "user",
    targetId: user.id,
    metadata: { email: user.email },
  });

  return new Response(null, { status: 204 });
}

function valueIsUserPatch(value: unknown): value is {
  userName?: string;
  externalId?: string;
  active?: boolean;
  displayName?: string;
  name?: { formatted?: string };
} {
  return typeof value === "object" && value !== null;
}

function readGroupValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object") {
        const display = (item as { display?: unknown }).display;
        const val = (item as { value?: unknown }).value;
        if (typeof display === "string") {
          return display;
        }
        if (typeof val === "string") {
          return val;
        }
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function readGroupRef(path: string): string | null {
  const match = path.match(/groups\[value eq "(.+)"\]/i);
  return match?.[1] ?? null;
}

function mergeGroups(existing: string[], added: string[]): string[] {
  const set = new Set(existing);
  for (const group of added) {
    set.add(group);
  }
  return [...set];
}
