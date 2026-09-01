export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export const API_KEY_RATE_LIMIT = 60;
export const API_KEY_RATE_WINDOW_MS = 60_000;

export function consumeRateLimit(
  key: string,
  now = Date.now(),
  limit = API_KEY_RATE_LIMIT,
  windowMs = API_KEY_RATE_WINDOW_MS,
): RateLimitResult {
  const bucket = buckets.get(key) ?? { timestamps: [] };
  const windowStart = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((stamp) => stamp > windowStart);
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    buckets.set(key, bucket);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}
