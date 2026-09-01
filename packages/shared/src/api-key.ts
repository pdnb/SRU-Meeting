import * as z from "zod";

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const ApiKeyPublicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  keyId: z.string().min(1),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
});

export const CreateApiKeyResponseSchema = ApiKeyPublicSchema.extend({
  secret: z.string().min(1),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
export type ApiKeyPublic = z.infer<typeof ApiKeyPublicSchema>;
export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>;
