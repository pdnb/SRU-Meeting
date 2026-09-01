import "server-only";

import {
  ApiKeyPublicSchema,
  CreateApiKeyRequestSchema,
  type ApiKeyPublic,
} from "@sru/shared";
import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/crypto-secret";
import { prisma } from "@/lib/db";

export function toApiKeyDto(row: {
  id: string;
  name: string;
  keyId: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}): ApiKeyPublic {
  return ApiKeyPublicSchema.parse({
    id: row.id,
    name: row.name,
    keyId: row.keyId,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  });
}

export async function createApiKey(input: {
  userId: string;
  raw: unknown;
}): Promise<
  | { ok: true; key: ApiKeyPublic; secret: string }
  | { ok: false; status: number; code: string; message: string }
> {
  const parsed = CreateApiKeyRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return { ok: false, status: 422, code: "VALIDATION_ERROR", message: "Invalid API key name" };
  }
  const keyId = `sru_ak_${randomBytes(8).toString("hex")}`;
  const secret = randomBytes(32).toString("hex");
  const row = await prisma.apiKey.create({
    data: {
      userId: input.userId,
      name: parsed.data.name,
      keyId,
      secretEnc: encryptSecret(secret),
    },
  });
  return { ok: true, key: toApiKeyDto(row), secret };
}

export async function listApiKeys(userId: string): Promise<ApiKeyPublic[]> {
  const rows = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toApiKeyDto);
}

export async function revokeApiKey(input: {
  userId: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; status: number; code: string; message: string }> {
  const row = await prisma.apiKey.findUnique({ where: { id: input.id } });
  if (!row || row.userId !== input.userId) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "API key not found" };
  }
  await prisma.apiKey.update({
    where: { id: input.id },
    data: { revokedAt: new Date() },
  });
  return { ok: true };
}

export async function resolveApiKeySecret(keyId: string): Promise<{
  userId: string;
  secret: string;
  keyRowId: string;
} | null> {
  const row = await prisma.apiKey.findUnique({ where: { keyId } });
  if (!row || row.revokedAt) {
    return null;
  }
  return {
    userId: row.userId,
    secret: decryptSecret(row.secretEnc),
    keyRowId: row.id,
  };
}

export async function touchApiKey(id: string): Promise<void> {
  await prisma.apiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}
