export function messageVisibleTo(
  message: { senderId: string; recipientId?: string | null },
  viewerId: string,
): boolean {
  if (!message.recipientId) {
    return true;
  }
  return message.senderId === viewerId || message.recipientId === viewerId;
}

export function findMentionedNames(body: string, names: string[]): string[] {
  const mentioned: string[] = [];
  for (const name of names) {
    if (!name) continue;
    const pattern = new RegExp(`@${escapeRegExp(name)}\\b`, "i");
    if (pattern.test(body)) {
      mentioned.push(name);
    }
  }
  return mentioned;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
