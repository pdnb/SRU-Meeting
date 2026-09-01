export type EmbedConnectPayload = {
  type: "sru-embed.connect";
  roomId: string;
  token: string;
  url: string;
  identity?: string;
  name?: string;
  role?: "host" | "cohost" | "participant";
  audio?: boolean;
  video?: boolean;
};

export type EmbedConnectResult =
  | { ok: true; payload: EmbedConnectPayload }
  | { ok: false; reason: "origin" | "room" | "shape" | "secret" };

const FORBIDDEN_KEYS = new Set([
  "apiSecret",
  "apiKey",
  "secret",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_API_KEY",
]);

export function parseEmbedAllowedOrigins(
  raw: string | undefined,
): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function isEmbedOriginAllowed(
  origin: string,
  allowlist: string[],
): boolean {
  if (allowlist.length === 0) {
    return false;
  }
  return allowlist.includes(origin);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function acceptEmbedConnect(input: {
  origin: string;
  allowlist: string[];
  roomId: string;
  data: unknown;
}): EmbedConnectResult {
  if (!isEmbedOriginAllowed(input.origin, input.allowlist)) {
    return { ok: false, reason: "origin" };
  }
  if (!isRecord(input.data)) {
    return { ok: false, reason: "shape" };
  }
  for (const key of Object.keys(input.data)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return { ok: false, reason: "secret" };
    }
  }
  if (input.data.type !== "sru-embed.connect") {
    return { ok: false, reason: "shape" };
  }
  if (typeof input.data.roomId !== "string" || input.data.roomId !== input.roomId) {
    return { ok: false, reason: "room" };
  }
  if (typeof input.data.token !== "string" || input.data.token.length < 1) {
    return { ok: false, reason: "shape" };
  }
  if (typeof input.data.url !== "string" || input.data.url.length < 1) {
    return { ok: false, reason: "shape" };
  }
  const role = input.data.role;
  if (
    role !== undefined &&
    role !== "host" &&
    role !== "cohost" &&
    role !== "participant"
  ) {
    return { ok: false, reason: "shape" };
  }
  return {
    ok: true,
    payload: {
      type: "sru-embed.connect",
      roomId: input.data.roomId,
      token: input.data.token,
      url: input.data.url,
      identity:
        typeof input.data.identity === "string" ? input.data.identity : undefined,
      name: typeof input.data.name === "string" ? input.data.name : undefined,
      role,
      audio: typeof input.data.audio === "boolean" ? input.data.audio : undefined,
      video: typeof input.data.video === "boolean" ? input.data.video : undefined,
    },
  };
}
