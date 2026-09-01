import * as z from "zod";
import { RecordingStatusSchema } from "./recording";

function hasStreamDestination(data: {
  rtmpUrl?: string;
  rtmpUrls?: string[];
  hls?: boolean;
}): boolean {
  return (
    data.hls === true ||
    Boolean(data.rtmpUrl) ||
    Boolean(data.rtmpUrls && data.rtmpUrls.length > 0)
  );
}

export const StartStreamRequestSchema = z
  .object({
    rtmpUrl: z.string().trim().min(1).max(2048).optional(),
    rtmpUrls: z.array(z.string().trim().min(1).max(2048)).max(8).optional(),
    hls: z.boolean().optional(),
  })
  .refine(hasStreamDestination, {
    message: "Provide an RTMP URL or set hls to true",
  });

export const UpdateStreamRequestSchema = z.object({
  action: z.enum(["add", "remove"]),
  rtmpUrl: z.string().trim().min(1).max(2048),
});

export const StreamSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  startedById: z.string().min(1),
  status: RecordingStatusSchema,
  destinations: z.array(z.string().min(1)).optional(),
  hlsPrefix: z.string().nullable().optional(),
  hlsUrl: z.string().nullable().optional(),
  consentedUserIds: z.array(z.string()).optional(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export type StartStreamRequest = z.infer<typeof StartStreamRequestSchema>;
export type UpdateStreamRequest = z.infer<typeof UpdateStreamRequestSchema>;
export type Stream = z.infer<typeof StreamSchema>;
