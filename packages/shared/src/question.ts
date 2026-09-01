import * as z from "zod";

export const QuestionStatusSchema = z.enum(["pending", "answered", "dismissed"]);

export const QuestionSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  userId: z.string().min(1),
  body: z.string().min(1).max(1000),
  status: QuestionStatusSchema,
  isPinned: z.boolean(),
  answer: z.string().max(2000).nullable(),
  upvoteCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  answeredAt: z.iso.datetime().nullable(),
  hasUpvoted: z.boolean().optional(),
});

export const SubmitQuestionRequestSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

export const ModerateQuestionRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("pin"),
    questionId: z.string().trim().min(1).max(128),
    value: z.boolean(),
  }),
  z.object({
    action: z.literal("answer"),
    questionId: z.string().trim().min(1).max(128),
    answer: z.string().trim().min(1).max(2000),
  }),
  z.object({
    action: z.literal("dismiss"),
    questionId: z.string().trim().min(1).max(128),
  }),
  z.object({
    action: z.literal("upvote"),
    questionId: z.string().trim().min(1).max(128),
  }),
]);

export const QaPacketSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("qa.submitted"),
    question: QuestionSchema,
  }),
  z.object({
    type: z.literal("qa.updated"),
    question: QuestionSchema,
  }),
]);

export type QuestionStatus = z.infer<typeof QuestionStatusSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type SubmitQuestionRequest = z.infer<typeof SubmitQuestionRequestSchema>;
export type ModerateQuestionRequest = z.infer<typeof ModerateQuestionRequestSchema>;
export type QaPacket = z.infer<typeof QaPacketSchema>;

export const QA_DATA_TOPIC = "qa" as const;
