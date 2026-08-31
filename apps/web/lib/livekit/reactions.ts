export const REACTION_EMOJIS = ["👍", "❤️", "😂", "👏"] as const;
export const REACTION_TTL_MS = 5000;
export const REACTION_TOPIC = "reaction";

export type ReactionPayload = {
  type: "reaction";
  emoji: (typeof REACTION_EMOJIS)[number];
  senderId: string;
};

export function isReactionPayload(value: unknown): value is ReactionPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as { type?: unknown; emoji?: unknown; senderId?: unknown };
  return (
    record.type === "reaction" &&
    typeof record.senderId === "string" &&
    REACTION_EMOJIS.includes(record.emoji as (typeof REACTION_EMOJIS)[number])
  );
}
