import { describe, expect, it } from "vitest";
import { findMentionedNames, messageVisibleTo } from "./chat-format";

describe("messageVisibleTo", () => {
  it("hides a DM from a third participant", () => {
    const dm = { senderId: "a", recipientId: "b" };
    expect(messageVisibleTo(dm, "a")).toBe(true);
    expect(messageVisibleTo(dm, "b")).toBe(true);
    expect(messageVisibleTo(dm, "c")).toBe(false);
  });

  it("shows public messages to everyone", () => {
    expect(messageVisibleTo({ senderId: "a", recipientId: null }, "c")).toBe(
      true,
    );
  });
});

describe("findMentionedNames", () => {
  it("highlights a present participant mentioned with @name", () => {
    expect(findMentionedNames("Hello @Mina, are you there?", ["Mina", "Bo"])).toEqual(
      ["Mina"],
    );
  });
});
