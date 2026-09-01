import * as z from "zod";

/** HTTP 409 when a feature conflicts with room E2EE policy. */
export const E2EE_INCOMPATIBLE_CODE = "E2EE_INCOMPATIBLE" as const;

export const E2eeFeatureSchema = z.enum([
  "recording",
  "streaming",
  "breakouts",
  "embed",
  "mobile",
  "safari",
  "screen_share_encrypted",
]);

export const E2eeDegradedFeatureSchema = z.object({
  feature: E2eeFeatureSchema,
  available: z.boolean(),
  note: z.string(),
});

export const E2eePolicyMatrixSchema = z.object({
  e2eeEnabled: z.boolean(),
  features: z.array(E2eeDegradedFeatureSchema),
});

export const E2EE_KEY_DATA_TOPIC = "sru-e2ee-keys" as const;

export const E2eeKeyPacketSchema = z.object({
  type: z.literal("sru-e2ee-key"),
  identity: z.string().min(1),
  /** Base64-encoded 32-byte key material (HKDF input). */
  keyMaterial: z.string().min(1),
});

export type E2eeFeature = z.infer<typeof E2eeFeatureSchema>;
export type E2eeDegradedFeature = z.infer<typeof E2eeDegradedFeatureSchema>;
export type E2eePolicyMatrix = z.infer<typeof E2eePolicyMatrixSchema>;
export type E2eeKeyPacket = z.infer<typeof E2eeKeyPacketSchema>;

/** Product stance for v1 when a room has E2EE enabled. */
export function buildE2eePolicyMatrix(e2eeEnabled: boolean): E2eePolicyMatrix {
  if (!e2eeEnabled) {
    return {
      e2eeEnabled: false,
      features: [],
    };
  }
  return E2eePolicyMatrixSchema.parse({
    e2eeEnabled: true,
    features: [
      {
        feature: "recording",
        available: false,
        note: "Server-side egress cannot decrypt Insertable Streams media.",
      },
      {
        feature: "streaming",
        available: false,
        note: "RTMP/HLS egress requires decrypted composite video.",
      },
      {
        feature: "breakouts",
        available: false,
        note: "Child room tokens and reassignment are disabled while E2EE is on.",
      },
      {
        feature: "embed",
        available: true,
        note: "Iframe embed is allowed with an explicit degraded-capability warning.",
      },
      {
        feature: "mobile",
        available: false,
        note: "Native Expo app does not implement E2EE in v1; use desktop Chrome or Edge.",
      },
      {
        feature: "safari",
        available: false,
        note: "Safari lacks reliable Insertable Streams / RTCRtpScriptTransform support.",
      },
      {
        feature: "screen_share_encrypted",
        available: false,
        note: "Screen share stays plaintext with an in-meeting banner (camera/mic are encrypted).",
      },
    ],
  });
}

export function e2eeIncompatibleMessage(feature: E2eeFeature): string {
  const labels: Record<E2eeFeature, string> = {
    recording: "Recording",
    streaming: "Live streaming",
    breakouts: "Breakout rooms",
    embed: "Embed",
    mobile: "Mobile clients",
    safari: "Safari",
    screen_share_encrypted: "Encrypted screen share",
  };
  return `${labels[feature]} is not available in end-to-end encrypted rooms.`;
}
