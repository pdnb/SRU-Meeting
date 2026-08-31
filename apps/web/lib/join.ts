import type { LobbyStatus, RoomRole } from "@prisma/client";
import { guestsAreAllowed, emailMatchesAllowList } from "@/lib/join-policy";
import { isModeratorRole, roomIsAtCapacity } from "@/lib/rooms";

export type JoinDecision =
  | { ok: true; role: RoomRole; lobbyStatus: "admitted" }
  | { ok: false; status: number; code: string; message: string };

export type JoinRoomState = {
  id: string;
  ownerId: string;
  passwordHash: string | null;
  lobbyEnabled: boolean;
  locked: boolean;
  finishedAt: Date | null;
  allowGuests: boolean;
  signedInOnly: boolean;
  allowedEmailDomains: string[];
  maxParticipants: number;
};

export type JoinParticipantState = {
  role: RoomRole;
  banned: boolean;
  lobbyStatus: LobbyStatus;
} | null;

export function evaluateJoinAccess(input: {
  room: JoinRoomState;
  user: { id: string; email: string } | null;
  participation: JoinParticipantState;
  passwordOk: boolean;
  admittedCount: number;
}): JoinDecision {
  const { room, user, participation, passwordOk, admittedCount } = input;

  if (room.finishedAt) {
    return {
      ok: false,
      status: 410,
      code: "ROOM_FINISHED",
      message: "This meeting has ended",
    };
  }

  if (!user) {
    if (!guestsAreAllowed(room)) {
      return {
        ok: false,
        status: 401,
        code: "GUESTS_DISABLED",
        message: "This room does not allow guest links",
      };
    }
  } else if (
    room.ownerId !== user.id &&
    !emailMatchesAllowList(user.email, room.allowedEmailDomains)
  ) {
    return {
      ok: false,
      status: 403,
      code: "DOMAIN_NOT_ALLOWED",
      message: "Your email domain is not allowed in this room",
    };
  }

  if (participation?.banned) {
    return {
      ok: false,
      status: 403,
      code: "BANNED",
      message: "You are banned from this room",
    };
  }

  const isOwner = user?.id === room.ownerId;
  const role: RoomRole =
    participation?.role ?? (isOwner ? "host" : "participant");
  const moderator = isOwner || isModeratorRole(role);

  if (room.passwordHash && !passwordOk && !moderator) {
    return {
      ok: false,
      status: 403,
      code: "WRONG_PASSWORD",
      message: "Room password is incorrect",
    };
  }

  const alreadyAdmitted = participation?.lobbyStatus === "admitted";
  if (room.locked && !alreadyAdmitted && !moderator) {
    return {
      ok: false,
      status: 403,
      code: "ROOM_LOCKED",
      message: "This room is locked",
    };
  }

  if (room.lobbyEnabled && !moderator) {
    if (participation?.lobbyStatus === "denied") {
      return {
        ok: false,
        status: 403,
        code: "LOBBY_DENIED",
        message:
          "The host denied this request. Send a new knock to wait again.",
      };
    }
    if (!alreadyAdmitted) {
      return {
        ok: false,
        status: 403,
        code: "LOBBY_PENDING",
        message: "Waiting for a host to admit you",
      };
    }
  }

  if (!alreadyAdmitted && !moderator && roomIsAtCapacity(admittedCount, room.maxParticipants)) {
    return {
      ok: false,
      status: 403,
      code: "ROOM_FULL",
      message: "This room is full",
    };
  }

  return { ok: true, role, lobbyStatus: "admitted" };
}
