import { notFound } from "next/navigation";
import { MeetingSession } from "@/components/meeting/MeetingSession";
import { getRoomRecord, toRoomDto } from "@/lib/rooms";

export default async function GuestJoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = await getRoomRecord(id);
  if (!room) {
    notFound();
  }

  return (
    <MeetingSession
      room={toRoomDto(room)}
      guest
      defaultName="Guest"
    />
  );
}
