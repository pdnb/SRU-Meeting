import { buildE2eePolicyMatrix } from "@sru/shared";

export const EMBED_E2EE_WARNING_TYPE = "sru-embed.e2ee-warning" as const;

export type EmbedE2eeWarning = {
  type: typeof EMBED_E2EE_WARNING_TYPE;
  roomId: string;
  message: string;
  matrix: ReturnType<typeof buildE2eePolicyMatrix>;
};

export function createE2eeWarning(roomId: string): EmbedE2eeWarning {
  return {
    type: EMBED_E2EE_WARNING_TYPE,
    roomId,
    message:
      "This room uses end-to-end encryption. Recording, streaming, breakouts, and mobile clients are unavailable in the iframe embed.",
    matrix: buildE2eePolicyMatrix(true),
  };
}

export function isEmbedE2eeWarning(value: unknown): value is EmbedE2eeWarning {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<EmbedE2eeWarning>;
  return (
    candidate.type === EMBED_E2EE_WARNING_TYPE &&
    typeof candidate.roomId === "string" &&
    typeof candidate.message === "string" &&
    candidate.matrix !== undefined
  );
}
