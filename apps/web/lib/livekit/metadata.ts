export type HandMetadata = {
  handRaisedAt: string | null;
};

export function parseHandMetadata(raw: string | undefined): HandMetadata {
  if (!raw) {
    return { handRaisedAt: null };
  }
  try {
    const parsed = JSON.parse(raw) as { handRaisedAt?: unknown };
    return {
      handRaisedAt:
        typeof parsed.handRaisedAt === "string" ? parsed.handRaisedAt : null,
    };
  } catch {
    return { handRaisedAt: null };
  }
}

export function serializeHandMetadata(meta: HandMetadata): string {
  return JSON.stringify({ handRaisedAt: meta.handRaisedAt });
}

export function sortHandQueue(
  entries: { identity: string; name: string; raisedAt: string }[],
): { identity: string; name: string; raisedAt: string }[] {
  return [...entries].sort((a, b) => a.raisedAt.localeCompare(b.raisedAt));
}
