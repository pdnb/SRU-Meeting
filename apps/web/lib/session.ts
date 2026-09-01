import "server-only";

import { cookies } from "next/headers";
import type { OrgRole } from "@prisma/client";
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
  orgRole: OrgRole;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (session?.user?.id) {
    const row = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      orgRole: row.orgRole,
    };
  }

  const jar = await cookies();
  const guestId = decodeGuestCookie(jar.get(GUEST_COOKIE)?.value, guestCookieSecret());
  if (!guestId) {
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: guestId } });
  if (!user || user.deletedAt) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    orgRole: user.orgRole,
  };
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
