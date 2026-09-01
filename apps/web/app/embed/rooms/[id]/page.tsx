import { notFound } from "next/navigation";
import { EmbedFrame } from "@/app/embed/rooms/[id]/EmbedFrame";
import { parseEmbedAllowedOrigins } from "@/lib/embed-origin";
import { getRoomRecord, toRoomDto } from "@/lib/rooms";

export default async function EmbedRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = await getRoomRecord(id);
  if (!room) {
    notFound();
  }

  const allowedOrigins = parseEmbedAllowedOrigins(
    process.env.EMBED_ALLOWED_ORIGINS,
  );

  return (
    <div className="sru-embed-root h-dvh w-full overflow-hidden bg-canvas text-ink">
      <EmbedFrame room={toRoomDto(room)} allowedOrigins={allowedOrigins} />
    </div>
  );
}
