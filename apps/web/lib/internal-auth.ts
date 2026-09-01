import { jsonError } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import { timingSafeEqual } from "node:crypto";

export function requireInternalSecret(request: Request): Response | null {
  const expected = getServerEnv().INTERNAL_CRON_SECRET;
  if (!expected) {
    return jsonError(503, "MISCONFIGURED", "INTERNAL_CRON_SECRET is not set");
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length || !timingSafeEqual(left, right)) {
    return jsonError(401, "UNAUTHORIZED", "Invalid internal secret");
  }
  return null;
}
