import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getParticipation, getRoomRecord, isModeratorRole } from "@/lib/rooms";
import { writeAudit } from "@/lib/audit";
import { liveKitIdentity, getRoomService } from "@/lib/livekit/room-service";
import { enqueueWebhook } from "@/lib/webhooks";

export const ModerationRequestSchema = z.object({
  action: z.enum([
    "mute",
    "mute_all",
    "disable_camera",
    "spotlight",
    "kick",
    "ban",
    "promote",
    "demote",
    "lock",
    "unlock",
    "end",
    "set_allow_share",
    "set_allow_chat",
  ]),
  targetUserId: z.string().min(1).optional(),
  trackSid: z.string().min(1).optional(),
  value: z.boolean().optional(),
});

export type ModerationRequest = z.infer<typeof ModerationRequestSchema>;

export function assertCanModerate(role: string | null): boolean {
  return role === "host" || role === "cohost";
}

export async function applyModeration(input: {
  roomId: string;
  actorId: string;
  body: ModerationRequest;
}): Promise<
  | { ok: true; result: Record<string, unknown> }
  | { ok: false; status: number; code: string; message: string }
> {
  const result = await runModeration(input);
  if (result.ok) {
    return finishModeration(input, result);
  }
  return result;
}

async function runModeration(input: {
  roomId: string;
  actorId: string;
  body: ModerationRequest;
}): Promise<
  | { ok: true; result: Record<string, unknown> }
  | { ok: false; status: number; code: string; message: string }
> {
  const room = await getRoomRecord(input.roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }

  const actor = await getParticipation(input.roomId, input.actorId);
  const actorRole = actor?.role ?? (room.ownerId === input.actorId ? "host" : null);
  if (!assertCanModerate(actorRole)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only a host or cohost can moderate",
    };
  }

  const livekit = getRoomService();
  const roomName = input.roomId;

  switch (input.body.action) {
    case "mute":
    case "disable_camera": {
      if (!input.body.targetUserId || !input.body.trackSid) {
        return {
          ok: false,
          status: 422,
          code: "VALIDATION_ERROR",
          message: "targetUserId and trackSid are required",
        };
      }
      if (livekit) {
        await livekit.mutePublishedTrack(
          roomName,
          liveKitIdentity(input.body.targetUserId),
          input.body.trackSid,
          true,
        );
      }
      return { ok: true, result: { action: input.body.action } };
    }
    case "mute_all": {
      if (livekit) {
        const participants = await livekit.listParticipants(roomName);
        const actorIdentity = liveKitIdentity(input.actorId);
        for (const participant of participants) {
          if (participant.identity === actorIdentity) {
            continue;
          }
          for (const track of participant.tracks) {
            if (track.muted) continue;
            await livekit.mutePublishedTrack(
              roomName,
              participant.identity,
              track.sid,
              true,
            );
          }
        }
      }
      return { ok: true, result: { action: "mute_all", except: input.actorId } };
    }
    case "spotlight": {
      if (!input.body.targetUserId) {
        return {
          ok: false,
          status: 422,
          code: "VALIDATION_ERROR",
          message: "targetUserId is required",
        };
      }
      if (livekit) {
        await livekit.updateRoomMetadata(
          roomName,
          JSON.stringify({ spotlightIdentity: input.body.targetUserId }),
        );
      }
      return {
        ok: true,
        result: { action: "spotlight", targetUserId: input.body.targetUserId },
      };
    }
    case "kick":
    case "ban": {
      if (!input.body.targetUserId) {
        return {
          ok: false,
          status: 422,
          code: "VALIDATION_ERROR",
          message: "targetUserId is required",
        };
      }
      if (input.body.action === "ban") {
        await prisma.roomParticipant.upsert({
          where: {
            roomId_userId: {
              roomId: input.roomId,
              userId: input.body.targetUserId,
            },
          },
          update: { banned: true, lobbyStatus: "denied" },
          create: {
            roomId: input.roomId,
            userId: input.body.targetUserId,
            role: "participant",
            banned: true,
            lobbyStatus: "denied",
          },
        });
      }
      if (livekit) {
        try {
          await livekit.removeParticipant(
            roomName,
            liveKitIdentity(input.body.targetUserId),
          );
        } catch {
          // Participant may already have left.
        }
      }
      return { ok: true, result: { action: input.body.action } };
    }
    case "promote":
    case "demote": {
      if (!input.body.targetUserId) {
        return {
          ok: false,
          status: 422,
          code: "VALIDATION_ERROR",
          message: "targetUserId is required",
        };
      }
      const role = input.body.action === "promote" ? "cohost" : "participant";
      await prisma.roomParticipant.update({
        where: {
          roomId_userId: {
            roomId: input.roomId,
            userId: input.body.targetUserId,
          },
        },
        data: { role },
      });
      return { ok: true, result: { action: input.body.action, role } };
    }
    case "lock":
    case "unlock": {
      await prisma.room.update({
        where: { id: input.roomId },
        data: { locked: input.body.action === "lock" },
      });
      return { ok: true, result: { locked: input.body.action === "lock" } };
    }
    case "end": {
      await prisma.room.update({
        where: { id: input.roomId },
        data: { finishedAt: new Date(), locked: true },
      });
      if (livekit) {
        try {
          await livekit.deleteRoom(roomName);
        } catch {
          // Room may already be empty.
        }
      }
      return { ok: true, result: { finished: true } };
    }
    case "set_allow_share":
    case "set_allow_chat": {
      if (typeof input.body.value !== "boolean") {
        return {
          ok: false,
          status: 422,
          code: "VALIDATION_ERROR",
          message: "value is required",
        };
      }
      const data =
        input.body.action === "set_allow_share"
          ? { allowScreenShare: input.body.value }
          : { allowChat: input.body.value };
      await prisma.room.update({ where: { id: input.roomId }, data });
      return { ok: true, result: data };
    }
    default:
      return {
        ok: false,
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Unknown action",
      };
  }
}

async function finishModeration(
  input: {
    roomId: string;
    actorId: string;
    body: ModerationRequest;
  },
  result: { ok: true; result: Record<string, unknown> },
): Promise<{ ok: true; result: Record<string, unknown> }> {
  await writeAudit({
    actorId: input.actorId,
    action: `moderation.${input.body.action}`,
    targetType: "room",
    targetId: input.roomId,
    metadata: {
      targetUserId: input.body.targetUserId,
    },
  });
  if (input.body.action === "end") {
    await enqueueWebhook("room_finished", { room: { id: input.roomId } });
  }
  if (input.body.action === "kick" || input.body.action === "ban") {
    await enqueueWebhook("participant_left", {
      room: { id: input.roomId },
      participant: { id: input.body.targetUserId },
    });
  }
  return result;
}

export { isModeratorRole };
