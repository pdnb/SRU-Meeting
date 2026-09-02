import "server-only";

import { randomBytes } from "node:crypto";

const TICKET_TTL_MS = 60_000;

const tickets = new Map<string, { userId: string; exp: number }>();

/** Single-use auth ticket (SAML ACS, desktop SSO bridge). Expires in 60 seconds. */
export function issueAuthTicket(userId: string): string {
  const id = randomBytes(16).toString("hex");
  tickets.set(id, { userId, exp: Date.now() + TICKET_TTL_MS });
  return id;
}

export function consumeAuthTicket(id: string): string | null {
  const row = tickets.get(id);
  tickets.delete(id);
  if (!row || row.exp < Date.now()) {
    return null;
  }
  return row.userId;
}

export function peekAuthTicket(id: string): string | null {
  const row = tickets.get(id);
  if (!row || row.exp < Date.now()) {
    return null;
  }
  return row.userId;
}
