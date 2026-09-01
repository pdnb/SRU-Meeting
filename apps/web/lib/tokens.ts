import "server-only";

import { TokenRequestSchema, TokenResponseSchema } from "@sru/shared";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import {
  encodeGuestCookie,
  GUEST_COOKIE,
  guestCookieSecret,
} from "@/lib/guest-proof";
import { guestsAreAllowed } from "@/lib/join-policy";
import { evaluateJoinAccess } from "@/lib/join";
import { assertBreakoutChildJoin } from "@/lib/breakouts";
import { ensureLiveKitRoom } from "@/lib/livekit/room-service";
import { buildVideoGrantForRole, mintAccessToken } from "@/lib/livekit/token";
import { upsertLobbyRequest } from "@/lib/lobby";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  countAdmitted,
  getParticipation,
  getRoomRecord,
} from "@/lib/rooms";
import type { SessionUser } from "@/lib/session";

export async function mintRoomJoinToken(input: {
  roomId: string;
  user: SessionUser | null;
  raw: unknown;
}): Promise<
  | { ok: true; body: { token: string; url: string }; setGuestCookie?: string }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      setGuestCookie?: string;
    }
> {
  const parsed = TokenRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid token request",
    };
  }

  const room = await getRoomRecord(input.roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }

  let user = input.user;
  let setGuestCookie: string | undefined;
  if (!user) {
    if (!guestsAreAllowed(room)) {
      return {
        ok: false,
        status: 401,
        code: "GUESTS_DISABLED",
        message: "This room does not allow guest links",
      };
    }
    const guest = await prisma.user.create({
      data: {
        email: `guest-${crypto.randomUUID()}@sru.invalid`,
        name: parsed.data.name ?? "Guest",
        passwordHash: await hashPassword(crypto.randomUUID()),
        isGuest: true,
        orgRole: "participant",
      },
    });
    user = {
      id: guest.id,
      email: guest.email,
      name: guest.name,
      orgRole: "participant",
    };
    setGuestCookie = encodeGuestCookie(guest.id, guestCookieSecret());
  }

  const participation = await getParticipation(input.roomId, user.id);
  let breakoutRole: "host" | "cohost" | "participant" | undefined;
  if (room.parentRoomId) {
    const gate = await assertBreakoutChildJoin({
      userId: user.id,
      child: room,
    });
    if (!gate.ok) {
      return gate;
    }
    breakoutRole = gate.role;
  }

  const passwordOk = room.passwordHash
    ? parsed.data.password
      ? await verifyPassword(room.passwordHash, parsed.data.password)
      : false
    : true;
  const admittedCount = await countAdmitted(input.roomId);
  const decision = evaluateJoinAccess({
    room,
    user,
    participation,
    passwordOk,
    admittedCount,
  });

  if (!decision.ok && decision.code === "LOBBY_PENDING") {
    await upsertLobbyRequest({ roomId: input.roomId, userId: user.id });
    return {
      ok: false,
      status: decision.status,
      code: decision.code,
      message: decision.message,
      setGuestCookie,
    };
  }

  if (!decision.ok) {
    return decision;
  }

  const role = breakoutRole ?? decision.role;

  await prisma.roomParticipant.upsert({
    where: { roomId_userId: { roomId: input.roomId, userId: user.id } },
    update: { lobbyStatus: "admitted", role },
    create: {
      roomId: input.roomId,
      userId: user.id,
      role,
      banned: false,
      lobbyStatus: "admitted",
    },
  });

  const env = getServerEnv();
  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.LIVEKIT_URL) {
    return {
      ok: false,
      status: 503,
      code: "MISCONFIGURED",
      message: "LiveKit is not configured",
    };
  }

  await ensureLiveKitRoom(input.roomId);

  const token = await mintAccessToken({
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
    identity: user.id,
    roomName: input.roomId,
    name: user.name ?? parsed.data.name ?? user.email,
    grant: buildVideoGrantForRole({
      roomName: input.roomId,
      role,
      allowScreenShare: room.allowScreenShare,
      allowChat: room.allowChat,
    }),
  });

  const body = TokenResponseSchema.parse({ token, url: env.LIVEKIT_URL });
  return { ok: true, body, setGuestCookie };
}

export async function attachGuestCookie(value: string): Promise<void> {
  const jar = await cookies();
  jar.set(GUEST_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
    secure: process.env.NODE_ENV === "production",
  });
}
