import * as z from "zod";

export const RecordingModeSchema = z.enum(["composite", "tracks"]);
export const RecordingStatusSchema = z.enum([
  "pending_consent",
  "starting",
  "active",
  "finishing",
  "finished",
  "failed",
]);

export const StartRecordingRequestSchema = z.object({
  mode: RecordingModeSchema.default("composite"),
  trackIds: z.array(z.string().trim().min(1).max(128)).max(32).optional(),
});

export const RecordingSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  startedById: z.string().min(1),
  mode: RecordingModeSchema,
  status: RecordingStatusSchema,
  objectKey: z.string().nullable(),
  hlsPrefix: z.string().nullable(),
  downloadUrl: z.string().nullable().optional(),
  hlsUrl: z.string().nullable().optional(),
  consentedUserIds: z.array(z.string()).optional(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export type RecordingMode = z.infer<typeof RecordingModeSchema>;
export type RecordingStatus = z.infer<typeof RecordingStatusSchema>;
export type StartRecordingRequest = z.infer<typeof StartRecordingRequestSchema>;
export type Recording = z.infer<typeof RecordingSchema>;
