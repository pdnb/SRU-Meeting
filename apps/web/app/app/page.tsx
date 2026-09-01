import { RoomsManager } from "@/components/rooms/RoomsManager";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateRoom } from "@/lib/rbac";
import { listRoomsForUser } from "@/lib/rooms";

export default async function AppHomePage() {
  const session = await auth();
  const rooms = session?.user?.id ? await listRoomsForUser(session.user.id) : [];
  const actor = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  return (
    <RoomsManager
      initialRooms={rooms}
      canCreate={canCreateRoom(actor?.orgRole)}
    />
  );
}
