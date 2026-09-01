import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set(["metadata.google.internal", "metadata.google.com"]);

function isBlockedAddress(address: string): boolean {
  if (address === "169.254.169.254" || address === "::1") {
    return true;
  }
  if (address.startsWith("169.254.")) {
    return true;
  }
  if (address.startsWith("127.")) {
    return true;
  }
  const parts = address.split(".").map(Number);
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part))) {
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  }
  return false;
}

export async function assertSafeWebhookUrl(
  raw: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ ok: true; url: URL } | { ok: false; message: string }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, message: "Webhook URL is invalid" };
  }

  const allowHttpLocal = env.NODE_ENV !== "production";
  if (url.protocol !== "https:") {
    if (
      !(
        allowHttpLocal &&
        url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      )
    ) {
      return { ok: false, message: "Webhook URL must use HTTPS" };
    }
  }

  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) {
    return { ok: false, message: "Webhook host is not allowed" };
  }

  if (env.NODE_ENV === "production") {
    const addresses = isIP(url.hostname)
      ? [url.hostname]
      : (await lookup(url.hostname, { all: true })).map((row) => row.address);
    if (addresses.some(isBlockedAddress)) {
      return { ok: false, message: "Webhook host is not allowed" };
    }
  }

  return { ok: true, url };
}
