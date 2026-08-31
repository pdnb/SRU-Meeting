import "server-only";

import { cookies } from "next/headers";
import { jsonError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  decodeGuestCookie,
  GUEST_COOKIE,
  guestCookieSecret,
} from "@/lib/guest-proof";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? null,
    };
  }

  const jar = await cookies();
  const guestId = decodeGuestCookie(jar.get(GUEST_COOKIE)?.value, guestCookieSecret());
  if (!guestId) {
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: guestId } });
  if (!user) {
    return null;
  }
  return { id: user.id, email: user.email, name: user.name };
}

export async function requireSessionUser(): Promise<
  { user: SessionUser; response: null } | { user: null; response: Response }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: jsonError(401, "UNAUTHORIZED", "Sign in required"),
    };
  }
  return { user, response: null };
}
