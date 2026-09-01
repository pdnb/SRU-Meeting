import "server-only";

import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export function shouldRedactChatBody(message: {
  senderId: string;
  recipientId: string | null;
}, userId: string): boolean {
  return message.senderId === userId && message.recipientId === null;
}

export async function deleteUserData(userId: string): Promise<void> {
  const tombstone = `deleted-${userId}@deleted.invalid`;
  await prisma.$transaction([
    prisma.apiKey.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.webhookEndpoint.updateMany({
      where: { userId },
      data: { active: false },
    }),
    prisma.chatMessage.updateMany({
      where: { senderId: userId, recipientId: null },
      data: { body: "[deleted]" },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: tombstone,
        name: "Deleted user",
        passwordHash: null,
        ssoProvider: null,
        ssoSubject: null,
        ldapDn: null,
        deletedAt: new Date(),
      },
    }),
  ]);
  await writeAudit({
    actorId: userId,
    action: "user.delete",
    targetType: "user",
    targetId: userId,
  });
}
