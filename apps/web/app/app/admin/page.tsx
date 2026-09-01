import { headers } from "next/headers";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { auth } from "@/lib/auth";
import { isOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { toRoomDto } from "@/lib/rooms";
import { toRecordingDto } from "@/lib/recording";
import { getRecordingRetentionDays } from "@/lib/retention";
import { getOrgAllowsE2eeRooms } from "@/lib/e2ee/org-settings";
import { listBackgroundPresets } from "@/lib/backgrounds/list";
import { getScimTokenMeta } from "@/lib/scim";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";
import { AuditLogSchema, UserSchema } from "@sru/shared";

export default async function AdminPage() {
  const session = await auth();
  const actor = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  if (!actor || !isOrgAdmin(actor.orgRole)) {
    return (
      <MeetingErrorState
        title="Admin only"
        message="Organization administrators can open this page."
      />
    );
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const [users, rooms, recordings, audit, retentionDays, allowE2eeRooms, scimMeta, backgrounds] = await Promise.all([
    prisma.user.findMany({
      where: { isGuest: false },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.room.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.recording.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { consents: true },
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    getRecordingRetentionDays(),
    getOrgAllowsE2eeRooms(),
    getScimTokenMeta(),
    listBackgroundPresets(origin),
  ]);

  return (
    <AdminDashboard
      users={users.map((row) =>
        UserSchema.parse({
          id: row.id,
          email: row.email,
          name: row.name,
          orgRole: row.orgRole,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }),
      )}
      rooms={rooms.map(toRoomDto)}
      recordings={recordings.map((row) => toRecordingDto(row))}
      audit={audit.map((row) =>
        AuditLogSchema.parse({
          id: row.id,
          actorId: row.actorId,
          action: row.action,
          targetType: row.targetType,
          targetId: row.targetId,
          metadata: row.metadata,
          createdAt: row.createdAt.toISOString(),
        }),
      )}
      retentionDays={retentionDays}
      allowE2eeRooms={allowE2eeRooms}
      scimMeta={scimMeta}
      showBuiltinBackgrounds={backgrounds.showBuiltinBackgrounds}
      orgBackgroundPresets={backgrounds.org}
    />
  );
}
