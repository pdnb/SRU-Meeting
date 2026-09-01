import { z } from "zod";

/** Server push invite — room id only; mint tokens after the user answers. */
export const PushRoomInviteSchema = z.object({
  type: z.literal("room_invite"),
  roomId: z.string().trim().min(1).max(128),
  roomName: z.string().trim().min(1).max(128).optional(),
  inviterName: z.string().trim().min(1).max(128).optional(),
});

export type PushRoomInvite = z.infer<typeof PushRoomInviteSchema>;

const FORBIDDEN_PAYLOAD_KEYS = [
  "token",
  "livekitToken",
  "apiSecret",
  "livekitApiSecret",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_API_KEY",
  "secret",
] as const;

export type PushInviteOk = { ok: true; invite: PushRoomInvite };
export type PushInviteErr = { ok: false; message: string };
export type PushInviteResult = PushInviteOk | PushInviteErr;

function hasForbiddenSecretFields(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  for (const key of FORBIDDEN_PAYLOAD_KEYS) {
    if (key in value) {
      return `Push payload must not include ${key}`;
    }
  }
  for (const nested of Object.values(value)) {
    const nestedError = hasForbiddenSecretFields(nested);
    if (nestedError) {
      return nestedError;
    }
  }
  return null;
}

export function parsePushInvitePayload(raw: unknown): PushInviteResult {
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      return { ok: false, message: "Push payload must be valid JSON" };
    }
  }

  const forbidden = hasForbiddenSecretFields(data);
  if (forbidden) {
    return { ok: false, message: forbidden };
  }

  const parsed = PushRoomInviteSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: "Invalid room invite push payload" };
  }

  return { ok: true, invite: parsed.data };
}

/** Shape sent from the web API / FCM — documented for operators. */
export function buildPushRoomInvitePayload(input: {
  roomId: string;
  roomName?: string;
  inviterName?: string;
}): PushRoomInvite {
  return PushRoomInviteSchema.parse({
    type: "room_invite",
    roomId: input.roomId,
    roomName: input.roomName,
    inviterName: input.inviterName,
  });
}
