import { TokenRequestSchema, TokenResponseSchema } from "@sru/shared";

export type JoinOk = { ok: true; token: string; url: string };
export type JoinErr = { ok: false; message: string };
export type JoinResult = JoinOk | JoinErr;

/** Rejects blank JWTs before LiveKit connect. */
export function usableJoinToken(token: string): { ok: true } | JoinErr {
  if (typeof token !== "string" || token.trim().length === 0) {
    return { ok: false, message: "Token is required" };
  }
  return { ok: true };
}

/** Parse web API mint JSON into connect credentials. */
export function joinCredentialsFromResponse(json: unknown): JoinResult {
  const parsed = TokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: "Token response was not valid" };
  }
  const tokenCheck = usableJoinToken(parsed.data.token);
  if (!tokenCheck.ok) {
    return tokenCheck;
  }
  if (parsed.data.url.trim().length === 0) {
    return { ok: false, message: "LiveKit URL is required" };
  }
  return { ok: true, token: parsed.data.token, url: parsed.data.url };
}

type FetchLike = typeof fetch;

/**
 * Mint a join token via the web app (dev or room tokens).
 * Never sends or stores LIVEKIT_API_SECRET — the web API holds secrets.
 */
export async function fetchMintedJoin(input: {
  apiBaseUrl: string;
  roomName: string;
  identity: string;
  name?: string;
  /** Optional room join password when using authenticated room mint later. */
  password?: string;
  fetchImpl?: FetchLike;
}): Promise<JoinResult> {
  const request = TokenRequestSchema.safeParse({
    roomName: input.roomName,
    identity: input.identity,
    name: input.name,
    password: input.password,
  });
  if (!request.success) {
    return { ok: false, message: "Room name and identity are required" };
  }

  const base = input.apiBaseUrl.replace(/\/+$/, "");
  if (!base) {
    return { ok: false, message: "Web API base URL is required" };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${base}/api/v1/dev/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.data),
    });
  } catch {
    return {
      ok: false,
      message: "Could not reach the web API to mint a token",
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, message: `Token request failed (${res.status})` };
  }

  if (!res.ok) {
    const message =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: { message?: unknown } }).error?.message ===
        "string"
        ? (json as { error: { message: string } }).error.message
        : `Token request failed (${res.status})`;
    return { ok: false, message };
  }

  return joinCredentialsFromResponse(json);
}
