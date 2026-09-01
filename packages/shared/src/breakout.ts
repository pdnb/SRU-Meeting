import * as z from "zod";

// Zod 4 object / enum APIs: https://zod.dev/api

export const BreakoutAssignmentModeSchema = z.enum([
  "auto",
  "manual",
  "self_pick",
]);

export const BreakoutSessionStatusSchema = z.enum(["open", "closed"]);

export const CreateBreakoutsRequestSchema = z.object({
  mode: BreakoutAssignmentModeSchema,
  count: z.number().int().min(1).max(20).optional(),
  assignments: z
    .array(
      z.object({
        userId: z.string().trim().min(1).max(128),
        groupIndex: z.number().int().min(0).max(19),
      }),
    )
    .max(200)
    .optional(),
  durationSeconds: z.number().int().min(60).max(14_400).optional(),
});

export const BreakoutAssignmentSchema = z.object({
  userId: z.string().min(1),
  childRoomId: z.string().min(1),
});

export const BreakoutSessionSchema = z.object({
  id: z.string().min(1),
  parentRoomId: z.string().min(1),
  status: BreakoutSessionStatusSchema,
  assignmentMode: BreakoutAssignmentModeSchema,
  endsAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  childRoomIds: z.array(z.string().min(1)).optional(),
  assignments: z.array(BreakoutAssignmentSchema).optional(),
});

export type BreakoutAssignmentMode = z.infer<
  typeof BreakoutAssignmentModeSchema
>;
export type BreakoutSessionStatus = z.infer<typeof BreakoutSessionStatusSchema>;
export type CreateBreakoutsRequest = z.infer<
  typeof CreateBreakoutsRequestSchema
>;
export type BreakoutAssignment = z.infer<typeof BreakoutAssignmentSchema>;
export type BreakoutSession = z.infer<typeof BreakoutSessionSchema>;

export const BreakoutActionRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("broadcast"),
    body: z.string().trim().min(1).max(500),
  }),
  z.object({
    action: z.literal("help"),
  }),
  z.object({
    action: z.literal("recall"),
  }),
  z.object({
    action: z.literal("claim"),
    childRoomId: z.string().trim().min(1).max(128),
  }),
]);

export const BreakoutPacketSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("breakout.broadcast"),
    sessionId: z.string().min(1),
    body: z.string().min(1).max(500),
    senderId: z.string().min(1),
  }),
  z.object({
    type: z.literal("breakout.help"),
    sessionId: z.string().min(1),
    childRoomId: z.string().min(1),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal("breakout.recall"),
    sessionId: z.string().min(1),
    parentRoomId: z.string().min(1),
  }),
]);

export type BreakoutActionRequest = z.infer<typeof BreakoutActionRequestSchema>;
export type BreakoutPacket = z.infer<typeof BreakoutPacketSchema>;
