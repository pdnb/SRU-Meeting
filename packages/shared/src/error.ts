import * as z from "zod";

// Consistent API error body. Status mapping is the Route Handler's job.
// https://zod.dev/api

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
