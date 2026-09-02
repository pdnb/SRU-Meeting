import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeAuthTicket, issueAuthTicket } from "./auth-ticket";

describe("auth-ticket", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("issues and consumes a ticket once", () => {
    const ticket = issueAuthTicket("user-1");
    expect(consumeAuthTicket(ticket)).toBe("user-1");
    expect(consumeAuthTicket(ticket)).toBeNull();
  });

  it("expires tickets", () => {
    vi.useFakeTimers();
    const ticket = issueAuthTicket("user-2");
    vi.advanceTimersByTime(61_000);
    expect(consumeAuthTicket(ticket)).toBeNull();
  });
});
