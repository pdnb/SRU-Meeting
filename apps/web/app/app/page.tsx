import { RoomsManager } from "@/components/rooms/RoomsManager";
import { auth } from "@/lib/auth";
import { listRoomsForUser } from "@/lib/rooms";

export default async function AppHomePage() {
  const session = await auth();
  const rooms = session?.user?.id ? await listRoomsForUser(session.user.id) : [];
  return <RoomsManager initialRooms={rooms} />;
}
