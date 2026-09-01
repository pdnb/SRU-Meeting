import * as z from "zod";

export const WebhookEventNameSchema = z.enum([
  "room_started",
  "room_finished",
  "participant_joined",
  "participant_left",
  "recording_started",
  "recording_finished",
  "streaming_started",
]);

export const CreateWebhookEndpointRequestSchema = z.object({
  url: z.url(),
  events: z.array(WebhookEventNameSchema).min(1).max(16),
});

export const WebhookEndpointSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  events: z.array(WebhookEventNameSchema),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const CreateWebhookEndpointResponseSchema = WebhookEndpointSchema.extend({
  secret: z.string().min(1),
});

export type WebhookEventName = z.infer<typeof WebhookEventNameSchema>;
export type CreateWebhookEndpointRequest = z.infer<
  typeof CreateWebhookEndpointRequestSchema
>;
export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>;
export type CreateWebhookEndpointResponse = z.infer<
  typeof CreateWebhookEndpointResponseSchema
>;
