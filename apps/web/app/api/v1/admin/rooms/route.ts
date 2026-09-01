import { requireOrgAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { toRoomDto } from "@/lib/rooms";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }
  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return Response.json({ data: rooms.map(toRoomDto) });
}
