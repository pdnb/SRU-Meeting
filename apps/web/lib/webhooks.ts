import "server-only";

import {
  CreateWebhookEndpointRequestSchema,
  WebhookEndpointSchema,
  WebhookEventNameSchema,
  type WebhookEventName,
  type WebhookEndpoint,
} from "@sru/shared";
import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { decryptSecret, encryptSecret } from "@/lib/crypto-secret";
import { prisma } from "@/lib/db";
import { webhookSignatureHeader } from "@/lib/hmac";
import { assertSafeWebhookUrl } from "@/lib/webhook-url";

const MAX_ATTEMPTS = 8;

export function toWebhookDto(row: {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: Date;
}): WebhookEndpoint {
  return WebhookEndpointSchema.parse({
    id: row.id,
    url: row.url,
    events: row.events,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  });
}

export function nextRetryAt(attempts: number, now = Date.now()): Date {
  const seconds = Math.min(60 * 30, 2 ** attempts);
  return new Date(now + seconds * 1000);
}

export async function createWebhookEndpoint(input: {
  userId: string;
  raw: unknown;
}): Promise<
  | { ok: true; endpoint: WebhookEndpoint; secret: string }
  | { ok: false; status: number; code: string; message: string }
> {
  const parsed = CreateWebhookEndpointRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return { ok: false, status: 422, code: "VALIDATION_ERROR", message: "Invalid webhook" };
  }
  const safe = await assertSafeWebhookUrl(parsed.data.url);
  if (!safe.ok) {
    return { ok: false, status: 422, code: "UNSAFE_URL", message: safe.message };
  }
  const secret = randomBytes(32).toString("hex");
  const row = await prisma.webhookEndpoint.create({
    data: {
      userId: input.userId,
      url: parsed.data.url,
      secretEnc: encryptSecret(secret),
      events: parsed.data.events,
    },
  });
  return { ok: true, endpoint: toWebhookDto(row), secret };
}

export async function listWebhookEndpoints(userId: string): Promise<WebhookEndpoint[]> {
  const rows = await prisma.webhookEndpoint.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toWebhookDto);
}

export async function deleteWebhookEndpoint(input: {
  userId: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; status: number; code: string; message: string }> {
  const row = await prisma.webhookEndpoint.findUnique({ where: { id: input.id } });
  if (!row || row.userId !== input.userId) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Webhook not found" };
  }
  await prisma.webhookEndpoint.delete({ where: { id: input.id } });
  return { ok: true };
}

export async function enqueueWebhook(
  event: WebhookEventName,
  data: Record<string, unknown>,
): Promise<void> {
  const parsed = WebhookEventNameSchema.safeParse(event);
  if (!parsed.success) {
    return;
  }
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { active: true, events: { has: event } },
  });
  if (endpoints.length === 0) {
    return;
  }
  const payload = {
    event,
    timestamp: Math.floor(Date.now() / 1000),
    ...data,
  };
  await prisma.webhookDelivery.createMany({
    data: endpoints.map((endpoint) => ({
      endpointId: endpoint.id,
      event,
      payload,
    })),
  });
  try {
    after(() => {
      void deliverDueWebhooks();
    });
  } catch {
    void deliverDueWebhooks();
  }
}

export async function deliverDueWebhooks(limit = 20): Promise<number> {
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      nextRetryAt: { lte: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    include: { endpoint: true },
    take: limit,
    orderBy: { nextRetryAt: "asc" },
  });

  let delivered = 0;
  for (const item of due) {
    if (!item.endpoint.active) {
      await prisma.webhookDelivery.update({
        where: { id: item.id },
        data: { status: "failed", lastError: "Endpoint disabled" },
      });
      continue;
    }
    const body = JSON.stringify(item.payload);
    const secret = decryptSecret(item.endpoint.secretEnc);
    try {
      const response = await fetch(item.endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SRU-Signature": webhookSignatureHeader(secret, body),
          "X-SRU-Event": item.event,
        },
        body,
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      await prisma.webhookDelivery.update({
        where: { id: item.id },
        data: { status: "delivered", attempts: item.attempts + 1, lastError: null },
      });
      delivered += 1;
    } catch (error) {
      const attempts = item.attempts + 1;
      await prisma.webhookDelivery.update({
        where: { id: item.id },
        data: {
          status: attempts >= MAX_ATTEMPTS ? "failed" : "failed",
          attempts,
          nextRetryAt: nextRetryAt(attempts),
          lastError: error instanceof Error ? error.message : "Delivery failed",
        },
      });
    }
  }
  return delivered;
}
