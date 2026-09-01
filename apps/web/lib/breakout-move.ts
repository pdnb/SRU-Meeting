"use client";

import { TokenResponseSchema } from "@sru/shared";
import { Room } from "livekit-client";
import { breakoutJoinPath, parseApiErrorMessage } from "@/lib/breakout-ui";
import {
  readBrowserNetworkHints,
  roomOptionsForNetwork,
} from "@/lib/livekit/connect-options";

export const BREAKOUT_MOVE_KEY = "sru-breakout-move";

export type BreakoutMovePayload = {
  roomId: string;
  token: string;
  url: string;
  audio: boolean;
  video: boolean;
};

type MoveStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type BreakoutMoveDeps = {
  fetchImpl?: typeof fetch;
  prepare?: (url: string, token: string) => Promise<void>;
  navigate?: (path: string) => void;
};

function moveStore(): MoveStore | null {
  try {
    if (typeof sessionStorage === "undefined") {
      return null;
    }
    return sessionStorage;
  } catch {
    return null;
  }
}

function parseMove(raw: string | null): BreakoutMovePayload | null {
  if (!raw) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      !("roomId" in value) ||
      !("token" in value) ||
      !("url" in value) ||
      !("audio" in value) ||
      !("video" in value)
    ) {
      return null;
    }
    const payload = value as BreakoutMovePayload;
    if (
      typeof payload.roomId !== "string" ||
      typeof payload.token !== "string" ||
      typeof payload.url !== "string" ||
      typeof payload.audio !== "boolean" ||
      typeof payload.video !== "boolean"
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function stashBreakoutMove(payload: BreakoutMovePayload): void {
  moveStore()?.setItem(BREAKOUT_MOVE_KEY, JSON.stringify(payload));
}

export function peekBreakoutMove(roomId: string): BreakoutMovePayload | null {
  const parsed = parseMove(moveStore()?.getItem(BREAKOUT_MOVE_KEY) ?? null);
  if (!parsed || parsed.roomId !== roomId) {
    return null;
  }
  return parsed;
}

export function takeBreakoutMove(roomId: string): BreakoutMovePayload | null {
  const parsed = peekBreakoutMove(roomId);
  if (!parsed) {
    return null;
  }
  moveStore()?.removeItem(BREAKOUT_MOVE_KEY);
  return parsed;
}

/** LiveKit Room.prepareConnection: DNS + TLS warmup on a disconnected Room. */
export async function prepareBreakoutConnection(
  url: string,
  token: string,
): Promise<void> {
  const room = new Room(roomOptionsForNetwork(readBrowserNetworkHints()));
  await room.prepareConnection(url, token);
}

export async function moveToPreparedMeeting(
  input: {
    destinationRoomId: string;
    identity: string;
    name?: string;
    audio: boolean;
    video: boolean;
  },
  deps: BreakoutMoveDeps = {},
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const prepare = deps.prepare ?? prepareBreakoutConnection;
  const navigate =
    deps.navigate ?? ((path: string) => globalThis.location.assign(path));

  const res = await fetchImpl(
    `/api/v1/rooms/${input.destinationRoomId}/tokens`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName: input.destinationRoomId,
        identity: input.identity,
        name: input.name,
      }),
    },
  );
  const json: unknown = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      message: parseApiErrorMessage(json, "Could not join that room."),
    };
  }
  const parsed = TokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: "Could not join that room." };
  }
  try {
    await prepare(parsed.data.url, parsed.data.token);
  } catch {
    // Pre-warm is best-effort; the minted token still lets us join.
  }
  stashBreakoutMove({
    roomId: input.destinationRoomId,
    token: parsed.data.token,
    url: parsed.data.url,
    audio: input.audio,
    video: input.video,
  });
  navigate(breakoutJoinPath(input.destinationRoomId));
  return { ok: true };
}
