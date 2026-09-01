import type { PushInviteResult, PushRoomInvite } from "./push-logic";
import {
  buildPushRoomInvitePayload,
  parsePushInvitePayload,
} from "./push-logic";

export type PushInviteHandler = (invite: PushRoomInvite) => void | Promise<void>;

let handler: PushInviteHandler | null = null;

/** Register handler for validated room-invite pushes (room id only). */
export function onPushRoomInvite(next: PushInviteHandler): void {
  handler = next;
}

/**
 * Handle a raw push payload from APNs/FCM.
 * Returns parsed invite when valid; never exposes LiveKit secrets.
 */
export async function handlePushPayload(
  raw: unknown,
): Promise<PushInviteResult> {
  const result = parsePushInvitePayload(raw);
  if (result.ok && handler) {
    await handler(result.invite);
  }
  return result;
}

export {
  PushRoomInviteSchema,
  buildPushRoomInvitePayload,
  parsePushInvitePayload,
  type PushInviteResult,
  type PushRoomInvite,
} from "./push-logic";
