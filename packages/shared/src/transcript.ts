import * as z from "zod";

export const TranscriptStatusSchema = z.enum([
  "pending",
  "processing",
  "finished",
  "failed",
]);

export const MeetingSummaryStatusSchema = z.enum([
  "not_configured",
  "pending",
  "finished",
  "failed",
]);

export const TranscriptSegmentSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  speakerLabel: z.string().min(1).max(128),
  text: z.string().min(1).max(10000),
  sortOrder: z.number().int().min(0),
});

export const TranscriptSchema = z.object({
  id: z.string().min(1),
  recordingId: z.string().min(1),
  status: TranscriptStatusSchema,
  language: z.string().min(2).max(16).nullable(),
  segments: z.array(TranscriptSegmentSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
});

export const MeetingSummarySchema = z.object({
  id: z.string().min(1),
  transcriptId: z.string().min(1),
  status: MeetingSummaryStatusSchema,
  bodyMarkdown: z.string().nullable(),
  message: z.string().nullable().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type TranscriptStatus = z.infer<typeof TranscriptStatusSchema>;
export type MeetingSummaryStatus = z.infer<typeof MeetingSummaryStatusSchema>;
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
export type Transcript = z.infer<typeof TranscriptSchema>;
export type MeetingSummary = z.infer<typeof MeetingSummarySchema>;

/** Worker contract: one STT segment before persistence. */
export const TranscriptionSegmentInputSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  speakerLabel: z.string().min(1).max(128),
  text: z.string().min(1).max(10000),
});

export type TranscriptionSegmentInput = z.infer<
  typeof TranscriptionSegmentInputSchema
>;
