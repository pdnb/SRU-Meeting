import type { BreakoutPacket, BreakoutSession } from "@sru/shared";
import { BreakoutPacketSchema } from "@sru/shared";

export const BREAKOUT_POLL_MS = 4000;
export const BREAKOUT_DATA_TOPIC = "breakout";
export const DEFAULT_BREAKOUT_COUNT = 2;
export const MIN_BREAKOUT_COUNT = 1;
export const MAX_BREAKOUT_COUNT = 20;
export const MIN_BREAKOUT_MINUTES = 1;
export const MAX_BREAKOUT_MINUTES = 240;

type BreakoutGetResult =
  | { kind: "ok"; session: BreakoutSession | null }
  | { kind: "child" }
  | { kind: "error"; message: string };

export function assignedChildRoomId(
  session: Pick<BreakoutSession, "assignments"> | null,
  userId: string,
): string | null {
  return (
    session?.assignments?.find((row) => row.userId === userId)?.childRoomId ??
    null
  );
}

export function childRoomLabel(
  session: Pick<BreakoutSession, "childRoomIds"> | null,
  childRoomId: string,
): string {
  const index = session?.childRoomIds?.indexOf(childRoomId) ?? -1;
  if (index < 0) {
    return "your breakout room";
  }
  return `Room ${index + 1}`;
}

export function childAssignmentCount(
  session: Pick<BreakoutSession, "assignments"> | null,
  childRoomId: string,
): number {
  return (
    session?.assignments?.filter((row) => row.childRoomId === childRoomId)
      .length ?? 0
  );
}

export function breakoutChildIsFull(
  session: Pick<BreakoutSession, "assignments"> | null,
  childRoomId: string,
  maxParticipants: number,
): boolean {
  return childAssignmentCount(session, childRoomId) >= maxParticipants;
}

export function breakoutJoinPath(childRoomId: string): string {
  return `/app/rooms/${childRoomId}`;
}

export function parseApiErrorMessage(json: unknown, fallback: string): string {
  if (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error?: { message?: unknown } }).error?.message ===
      "string"
  ) {
    return (json as { error: { message: string } }).error.message;
  }
  return fallback;
}

export function parseBreakoutGet(
  status: number,
  json: unknown,
): BreakoutGetResult {
  if (status === 200) {
    if (
      typeof json === "object" &&
      json !== null &&
      "data" in json &&
      (json.data === null || typeof json.data === "object")
    ) {
      return { kind: "ok", session: json.data as BreakoutSession | null };
    }
    return { kind: "error", message: "Could not load breakouts" };
  }
  const code =
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error?: { code?: unknown } }).error?.code === "string"
      ? (json as { error: { code: string } }).error.code
      : "";
  if (status === 403 && code === "CHILD_CANNOT_HOST_BREAKOUTS") {
    return { kind: "child" };
  }
  return {
    kind: "error",
    message: parseApiErrorMessage(json, "Could not load breakouts"),
  };
}

export function breakoutTimerLabel(
  endsAt: string | null,
  now: Date,
): string | null {
  if (!endsAt) {
    return null;
  }
  const remainingMs = Date.parse(endsAt) - now.getTime();
  if (remainingMs <= 0) {
    return "Time's up";
  }
  const totalSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} left`;
}

export function parseDurationMinutes(
  raw: string,
): { ok: true; durationSeconds: number | undefined } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, durationSeconds: undefined };
  }
  const minutes = Number.parseInt(trimmed, 10);
  if (
    !Number.isInteger(minutes) ||
    minutes < MIN_BREAKOUT_MINUTES ||
    minutes > MAX_BREAKOUT_MINUTES
  ) {
    return { ok: false };
  }
  return { ok: true, durationSeconds: minutes * 60 };
}

export function parseBreakoutPacket(value: unknown): BreakoutPacket | null {
  const parsed = BreakoutPacketSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
