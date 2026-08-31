export function emailDomainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) {
    return null;
  }
  return email.slice(at + 1).toLowerCase();
}

export function emailMatchesAllowList(
  email: string,
  allowedEmailDomains: string[],
): boolean {
  if (allowedEmailDomains.length === 0) {
    return true;
  }
  const domain = emailDomainOf(email);
  if (!domain) {
    return false;
  }
  return allowedEmailDomains.some((item) => item.toLowerCase() === domain);
}

export function guestsAreAllowed(room: {
  allowGuests: boolean;
  signedInOnly: boolean;
}): boolean {
  return room.allowGuests && !room.signedInOnly;
}
