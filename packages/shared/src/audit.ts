import * as z from "zod";

export const AuditLogSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().nullable(),
  action: z.string().min(1),
  targetType: z.string().min(1),
  targetId: z.string().nullable(),
  metadata: z.unknown().optional(),
  createdAt: z.iso.datetime(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
