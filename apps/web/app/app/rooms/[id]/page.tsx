import { notFound, redirect } from "next/navigation";
import { MeetingSession } from "@/components/meeting/MeetingSession";
import { auth } from "@/lib/auth";
import { getParticipation, getRoomRecord, toRoomDto } from "@/lib/rooms";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const { id } = await params;
  const room = await getRoomRecord(id);
  if (!room) {
    notFound();
  }
  const participation = await getParticipation(id, session.user.id);
  const role =
    participation?.role ?? (room.ownerId === session.user.id ? "host" : "participant");

  return (
    <MeetingSession
      room={toRoomDto(room)}
      userId={session.user.id}
      roleHint={role}
      defaultName={session.user.name ?? session.user.email ?? undefined}
    />
  );
}
