import { notFound } from "next/navigation";
import { PersonalRoomSlugSchema } from "@sru/shared";
import { MeetingSession } from "@/components/meeting/MeetingSession";
import { getPersonalRoomBySlug } from "@/lib/personal-room";
import { toRoomDto } from "@/lib/rooms";

export default async function PersonalRoomJoinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: raw } = await params;
  const parsed = PersonalRoomSlugSchema.safeParse(raw);
  if (!parsed.success) {
    notFound();
  }

  const room = await getPersonalRoomBySlug(parsed.data);
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
