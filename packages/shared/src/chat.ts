import * as z from "zod";

// Zod 4 object / ISO datetime APIs:
// https://zod.dev/api

export const ChatMessageSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  senderId: z.string().min(1),
  body: z.string().min(1).max(4000),
  createdAt: z.iso.datetime(),
  recipientId: z.string().min(1).nullable().optional(),
  attachmentKey: z.string().min(1).nullable().optional(),
  attachmentUrl: z.string().min(1).nullable().optional(),
});

export const CreateChatMessageRequestSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  recipientId: z.string().min(1).optional(),
  attachmentKey: z.string().min(1).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type CreateChatMessageRequest = z.infer<
  typeof CreateChatMessageRequestSchema
>;
