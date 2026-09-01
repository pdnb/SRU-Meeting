import * as z from "zod";

export const WhiteboardSessionStatusSchema = z.enum(["open", "closed"]);

export const WhiteboardSessionSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  status: WhiteboardSessionStatusSchema,
  openedById: z.string().min(1),
  snapshotKey: z.string().nullable(),
  createdAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
});

export const OpenWhiteboardRequestSchema = z.object({}).optional();

export const CloseWhiteboardRequestSchema = z
  .object({
    snapshotPngBase64: z.string().min(1).optional(),
  })
  .optional();

export const WhiteboardPacketSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("whiteboard.opened"),
    session: WhiteboardSessionSchema,
  }),
  z.object({
    type: z.literal("whiteboard.closed"),
    sessionId: z.string().min(1),
  }),
  z.object({
    type: z.literal("whiteboard.sync"),
    sessionId: z.string().min(1),
    records: z.record(z.string(), z.unknown()),
    senderId: z.string().min(1),
  }),
]);

export type WhiteboardSessionStatus = z.infer<
  typeof WhiteboardSessionStatusSchema
>;
export type WhiteboardSession = z.infer<typeof WhiteboardSessionSchema>;
export type OpenWhiteboardRequest = z.infer<typeof OpenWhiteboardRequestSchema>;
export type CloseWhiteboardRequest = z.infer<typeof CloseWhiteboardRequestSchema>;
export type WhiteboardPacket = z.infer<typeof WhiteboardPacketSchema>;

export const WHITEBOARD_DATA_TOPIC = "whiteboard" as const;
