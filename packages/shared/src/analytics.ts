import * as z from "zod";

export const DailyOrgMetricsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomsCreated: z.number().int().min(0),
  participantMinutes: z.number().int().min(0),
  recordingsFinished: z.number().int().min(0),
  uniqueUsers: z.number().int().min(0),
});

export const AnalyticsTotalsSchema = z.object({
  roomsCreated: z.number().int().min(0),
  participantMinutes: z.number().int().min(0),
  recordingsFinished: z.number().int().min(0),
  uniqueUsers: z.number().int().min(0),
});

export const AnalyticsOverviewSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daily: z.array(DailyOrgMetricsSchema),
  totals: AnalyticsTotalsSchema,
});

export const SubmitQosReportRequestSchema = z.object({
  roomId: z.string().min(1),
  rttMs: z.number().int().min(0).nullable().optional(),
  packetLoss: z.number().min(0).max(1).nullable().optional(),
  jitterMs: z.number().int().min(0).nullable().optional(),
  bitrateKbps: z.number().int().min(0).nullable().optional(),
});

export const QosReportSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  userId: z.string().min(1),
  rttMs: z.number().int().min(0).nullable(),
  packetLoss: z.number().min(0).max(1).nullable(),
  jitterMs: z.number().int().min(0).nullable(),
  bitrateKbps: z.number().int().min(0).nullable(),
  createdAt: z.iso.datetime(),
});

export const RoomQosSummarySchema = z.object({
  roomId: z.string().min(1),
  roomName: z.string().min(1),
  latest: QosReportSchema.nullable(),
  reportCount: z.number().int().min(0),
});

export type DailyOrgMetrics = z.infer<typeof DailyOrgMetricsSchema>;
export type AnalyticsTotals = z.infer<typeof AnalyticsTotalsSchema>;
export type AnalyticsOverview = z.infer<typeof AnalyticsOverviewSchema>;
export type SubmitQosReportRequest = z.infer<typeof SubmitQosReportRequestSchema>;
export type QosReport = z.infer<typeof QosReportSchema>;
export type RoomQosSummary = z.infer<typeof RoomQosSummarySchema>;
