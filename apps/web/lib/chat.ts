import "server-only";

import {
  ChatMessageSchema,
  CreateChatMessageRequestSchema,
  type ChatMessage,
} from "@sru/shared";
import { findMentionedNames, messageVisibleTo } from "@/lib/chat-format";
import { prisma } from "@/lib/db";
import { getParticipation } from "@/lib/rooms";
import { signDownloadUrl } from "@/lib/storage";

export { findMentionedNames, messageVisibleTo };

export async function toChatDto(row: {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  recipientId: string | null;
  attachmentKey: string | null;
  createdAt: Date;
}): Promise<ChatMessage> {
  const attachmentUrl = row.attachmentKey
    ? await signDownloadUrl(row.attachmentKey)
    : null;
  return ChatMessageSchema.parse({
    id: row.id,
    roomId: row.roomId,
    senderId: row.senderId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    recipientId: row.recipientId,
    attachmentKey: row.attachmentKey,
    attachmentUrl,
  });
}

export async function listMessagesForUser(
  roomId: string,
  userId: string,
): Promise<ChatMessage[]> {
  const rows = await prisma.chatMessage.findMany({
    where: {
      roomId,
      OR: [
        { recipientId: null },
        { senderId: userId },
        { recipientId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return Promise.all(rows.map(toChatDto));
}

export async function createMessageForUser(input: {
  roomId: string;
  userId: string;
  raw: unknown;
  allowChat: boolean;
}): Promise<
  | { ok: true; message: ChatMessage }
  | { ok: false; status: number; code: string; message: string }
> {
  if (!input.allowChat) {
    return {
      ok: false,
      status: 403,
      code: "CHAT_DISABLED",
      message: "Chat is disabled in this room",
    };
  }

  const parsed = CreateChatMessageRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid chat message",
    };
  }

  const sender = await getParticipation(input.roomId, input.userId);
  if (!sender || sender.banned || sender.lobbyStatus !== "admitted") {
    return {
      ok: false,
      status: 403,
      code: "NOT_IN_ROOM",
      message: "You must be in the room to send chat",
    };
  }

  if (parsed.data.recipientId) {
    const recipient = await getParticipation(
      input.roomId,
      parsed.data.recipientId,
    );
    if (!recipient || recipient.lobbyStatus !== "admitted") {
      return {
        ok: false,
        status: 404,
        code: "RECIPIENT_NOT_FOUND",
        message: "That participant is not in the room",
      };
    }
  }

  const row = await prisma.chatMessage.create({
    data: {
      roomId: input.roomId,
      senderId: input.userId,
      body: parsed.data.body,
      recipientId: parsed.data.recipientId ?? null,
      attachmentKey: parsed.data.attachmentKey ?? null,
    },
  });
  return { ok: true, message: await toChatDto(row) };
}
