import { RoomsManager } from "@/components/rooms/RoomsManager";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensurePersonalRoom } from "@/lib/personal-room";
import { canCreateRoom } from "@/lib/rbac";
import { listRoomsForUser } from "@/lib/rooms";

export default async function AppHomePage() {
  const session = await auth();
  const rooms = session?.user?.id ? await listRoomsForUser(session.user.id) : [];
  const actor = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  let personal = null;
  if (session?.user?.id && actor && !actor.isGuest) {
    try {
      personal = await ensurePersonalRoom(session.user.id);
    } catch {
      personal = null;
    }
  }
  return (
    <RoomsManager
      initialRooms={rooms}
      canCreate={canCreateRoom(actor?.orgRole)}
      personalRoom={personal}
    />
  );
}
