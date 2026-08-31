import { getServerEnv } from "@/lib/env";
import { livekitHttpUrl } from "@/lib/livekit/room-service";

export type HealthPayload = {
  status: "ok";
  checks: {
    app: "ok";
    livekit: "ok" | "down" | "skipped";
  };
};

const SECRET_KEYS = [
  "LIVEKIT_API_SECRET",
  "AUTH_SECRET",
  "S3_SECRET_KEY",
  "DATABASE_URL",
] as const;

export function buildHealthPayload(
  livekit: HealthPayload["checks"]["livekit"],
): HealthPayload {
  return {
    status: "ok",
    checks: {
      app: "ok",
      livekit,
    },
  };
}

export function healthContainsSecrets(
  payload: unknown,
  env: Record<string, string | undefined> = getServerEnv(),
): boolean {
  const serialized = JSON.stringify(payload);
  return SECRET_KEYS.some((key) => {
    const value = env[key];
    return Boolean(value && value.length > 0 && serialized.includes(value));
  });
}

export async function pingLiveKit(): Promise<HealthPayload["checks"]["livekit"]> {
  const env = getServerEnv();
  if (!env.LIVEKIT_URL) {
    return "skipped";
  }
  try {
    const response = await fetch(livekitHttpUrl(env.LIVEKIT_URL), {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok ? "ok" : "down";
  } catch {
    return "down";
  }
}
