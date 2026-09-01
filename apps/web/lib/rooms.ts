import "server-only";

import {
  CreateRoomRequestSchema,
  RoomSchema,
  UpdateRoomSettingsSchema,
  type Room,
  type UpdateRoomSettings,
} from "@sru/shared";
import type { LobbyStatus, Prisma, RoomRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import { assertE2eeCanBeEnabled } from "@/lib/e2ee/policy";
import {
  getOrgAllowsE2eeRooms,
  roomHasActiveE2eeBlockers,
} from "@/lib/e2ee/org-settings";

export const DEFAULT_MAX_PARTICIPANTS = 25;

export type RoomRecord = Prisma.RoomGetPayload<object>;
export type ParticipantRecord = Prisma.RoomParticipantGetPayload<object>;

export function toRoomDto(room: {
  id: string;
  name: string;
  createdAt: Date;
  ownerId: string;
  passwordHash?: string | null;
  lobbyEnabled?: boolean;
  locked?: boolean;
  finishedAt?: Date | null;
  allowGuests?: boolean;
  signedInOnly?: boolean;
  allowedEmailDomains?: string[];
  allowScreenShare?: boolean;
  allowChat?: boolean;
  e2eeEnabled?: boolean;
  maxParticipants?: number;
  parentRoomId?: string | null;
}): Room {
  return RoomSchema.parse({
    id: room.id,
    name: room.name,
    createdAt: room.createdAt.toISOString(),
    ownerId: room.ownerId,
    hasPassword: Boolean(room.passwordHash),
    lobbyEnabled: room.lobbyEnabled,
    locked: room.locked,
    finishedAt: room.finishedAt ? room.finishedAt.toISOString() : null,
    allowGuests: room.allowGuests,
    signedInOnly: room.signedInOnly,
    allowedEmailDomains: room.allowedEmailDomains,
    allowScreenShare: room.allowScreenShare,
    allowChat: room.allowChat,
    e2eeEnabled: room.e2eeEnabled ?? false,
    maxParticipants: room.maxParticipants ?? DEFAULT_MAX_PARTICIPANTS,
    parentRoomId: room.parentRoomId ?? null,
  });
}

export function userMaySeeRoom(
  userId: string,
  room: { ownerId: string },
  participation: { banned: boolean; lobbyStatus: LobbyStatus } | null,
): boolean {
  if (room.ownerId === userId) {
    return true;
  }
  return (
    participation !== null &&
    !participation.banned &&
    participation.lobbyStatus === "admitted"
  );
}

export function userMayCloseRoom(
  userId: string,
  room: { ownerId: string },
): boolean {
  return room.ownerId === userId;
}

export function isModeratorRole(role: RoomRole): boolean {
  return role === "host" || role === "cohost";
}

export function roomIsAtCapacity(
  admittedCount: number,
  maxParticipants = DEFAULT_MAX_PARTICIPANTS,
): boolean {
  return admittedCount >= maxParticipants;
}

export async function createRoomForUser(
  userId: string,
  raw: unknown,
): Promise<Room> {
  const parsed = CreateRoomRequestSchema.parse(raw);
  const room = await prisma.room.create({
    data: {
      name: parsed.name,
      ownerId: userId,
      maxParticipants: DEFAULT_MAX_PARTICIPANTS,
      participants: {
        create: {
          userId,
          role: "host",
          banned: false,
          lobbyStatus: "admitted",
        },
      },
    },
  });
  return toRoomDto(room);
}

export async function listRoomsForUser(userId: string): Promise<Room[]> {
  const rooms = await prisma.room.findMany({
    where: {
      parentRoomId: null,
      OR: [
        { ownerId: userId },
        {
          participants: {
            some: {
              userId,
              banned: false,
              lobbyStatus: "admitted",
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return rooms.map(toRoomDto);
}

export async function getRoomRecord(roomId: string): Promise<RoomRecord | null> {
  return prisma.room.findUnique({ where: { id: roomId } });
}

export async function getParticipation(
  roomId: string,
  userId: string,
): Promise<ParticipantRecord | null> {
  return prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
}

export async function countAdmitted(roomId: string): Promise<number> {
  return prisma.roomParticipant.count({
    where: { roomId, banned: false, lobbyStatus: "admitted" },
  });
}

export async function closeRoomForOwner(
  userId: string,
  roomId: string,
): Promise<{ ok: true } | { ok: false; status: 403 | 404; code: string; message: string }> {
  const room = await getRoomRecord(roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  if (!userMayCloseRoom(userId, room)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only the host can close this room",
    };
  }
  await prisma.room.update({
    where: { id: roomId },
    data: { finishedAt: new Date(), locked: true },
  });
  return { ok: true };
}

export async function updateRoomSettingsForHost(
  userId: string,
  roomId: string,
  raw: unknown,
): Promise<
  | { ok: true; room: Room }
  | { ok: false; status: 403 | 404 | 409 | 422; code: string; message: string }
> {
  const parsed = UpdateRoomSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid room settings",
    };
  }

  const room = await getRoomRecord(roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  const participation = await getParticipation(roomId, userId);
  const role = participation?.role ?? (room.ownerId === userId ? "host" : null);
  if (!role || !isModeratorRole(role)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only a host or cohost can change room settings",
    };
  }

  if (parsed.data.e2eeEnabled === true && !room.e2eeEnabled) {
    const [allowOrgE2ee, blockers] = await Promise.all([
      getOrgAllowsE2eeRooms(),
      roomHasActiveE2eeBlockers(roomId),
    ]);
    const gate = assertE2eeCanBeEnabled({
      allowOrgE2ee: allowOrgE2ee,
      ...blockers,
    });
    if (!gate.ok) {
      return gate;
    }
  }

  const data = await settingsToPrisma(parsed.data);
  const updated = await prisma.room.update({ where: { id: roomId }, data });
  if (parsed.data.e2eeEnabled === true && !room.e2eeEnabled) {
    await writeAudit({
      actorId: userId,
      action: "room.e2ee_enabled",
      targetType: "room",
      targetId: roomId,
    });
  }
  if (parsed.data.e2eeEnabled === false && room.e2eeEnabled) {
    await writeAudit({
      actorId: userId,
      action: "room.e2ee_disabled",
      targetType: "room",
      targetId: roomId,
    });
  }
  return { ok: true, room: toRoomDto(updated) };
}

async function settingsToPrisma(
  settings: UpdateRoomSettings,
): Promise<Prisma.RoomUpdateInput> {
  const data: Prisma.RoomUpdateInput = {};
  if (settings.lobbyEnabled !== undefined) data.lobbyEnabled = settings.lobbyEnabled;
  if (settings.allowGuests !== undefined) data.allowGuests = settings.allowGuests;
  if (settings.signedInOnly !== undefined) data.signedInOnly = settings.signedInOnly;
  if (settings.allowedEmailDomains !== undefined) {
    data.allowedEmailDomains = settings.allowedEmailDomains.map((d) =>
      d.toLowerCase(),
    );
  }
  if (settings.allowScreenShare !== undefined) {
    data.allowScreenShare = settings.allowScreenShare;
  }
  if (settings.allowChat !== undefined) data.allowChat = settings.allowChat;
  if (settings.e2eeEnabled !== undefined) {
    data.e2eeEnabled = settings.e2eeEnabled;
  }
  if (settings.maxParticipants !== undefined) {
    data.maxParticipants = settings.maxParticipants;
  }
  if (settings.password === null) {
    data.passwordHash = null;
  } else if (typeof settings.password === "string") {
    data.passwordHash = await hashPassword(settings.password);
  }
  return data;
}
