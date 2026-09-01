import { describe, expect, it } from "vitest";
import { shouldRedactChatBody } from "./deletion";

describe("PDPA deletion", () => {
  it("redacts public chat but does not rewrite other users' DMs", () => {
    expect(
      shouldRedactChatBody(
        { senderId: "u1", recipientId: null },
        "u1",
      ),
    ).toBe(true);
    expect(
      shouldRedactChatBody(
        { senderId: "u1", recipientId: "u2" },
        "u1",
      ),
    ).toBe(false);
    expect(
      shouldRedactChatBody(
        { senderId: "u2", recipientId: "u1" },
        "u1",
      ),
    ).toBe(false);
  });
});
