import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { auth } from "@/lib/auth";
import { isOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { toRoomDto } from "@/lib/rooms";
import { toRecordingDto } from "@/lib/recording";
import { getRecordingRetentionDays } from "@/lib/retention";
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

  const [users, rooms, recordings, audit, retentionDays] = await Promise.all([
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
    />
  );
}
