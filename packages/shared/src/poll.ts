import * as z from "zod";

export const PollStatusSchema = z.enum(["open", "closed"]);

export const PollOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
  voteCount: z.number().int().min(0),
});

export const PollSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  question: z.string().min(1).max(500),
  status: PollStatusSchema,
  createdById: z.string().min(1),
  createdAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
  options: z.array(PollOptionSchema).min(2).max(10),
  myVoteOptionId: z.string().min(1).nullable().optional(),
});

export const CreatePollRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  options: z
    .array(z.string().trim().min(1).max(200))
    .min(2)
    .max(10),
});

export const VotePollRequestSchema = z.object({
  optionId: z.string().trim().min(1).max(128),
});

export const PollPacketSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("poll.created"),
    poll: PollSchema,
  }),
  z.object({
    type: z.literal("poll.voted"),
    pollId: z.string().min(1),
    optionId: z.string().min(1),
    userId: z.string().min(1),
    voteCounts: z.record(z.string(), z.number().int().min(0)),
  }),
  z.object({
    type: z.literal("poll.closed"),
    pollId: z.string().min(1),
    poll: PollSchema,
  }),
]);

export type PollStatus = z.infer<typeof PollStatusSchema>;
export type PollOption = z.infer<typeof PollOptionSchema>;
export type Poll = z.infer<typeof PollSchema>;
export type CreatePollRequest = z.infer<typeof CreatePollRequestSchema>;
export type VotePollRequest = z.infer<typeof VotePollRequestSchema>;
export type PollPacket = z.infer<typeof PollPacketSchema>;

export const POLL_DATA_TOPIC = "poll" as const;
