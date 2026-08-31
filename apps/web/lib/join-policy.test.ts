import { describe, expect, it } from "vitest";
import {
  emailMatchesAllowList,
  guestsAreAllowed,
} from "./join-policy";

describe("emailMatchesAllowList", () => {
  it("rejects user@other.com when the allow-list does not include that domain", () => {
    expect(
      emailMatchesAllowList("user@other.com", ["sru.ac.th"]),
    ).toBe(false);
    expect(
      emailMatchesAllowList("dean@sru.ac.th", ["sru.ac.th"]),
    ).toBe(true);
  });

  it("allows any domain when the list is empty", () => {
    expect(emailMatchesAllowList("user@other.com", [])).toBe(true);
  });
});

describe("guestsAreAllowed", () => {
  it("allows a guest link only when guests are on and signed-in-only is off", () => {
    expect(guestsAreAllowed({ allowGuests: true, signedInOnly: false })).toBe(
      true,
    );
    expect(guestsAreAllowed({ allowGuests: true, signedInOnly: true })).toBe(
      false,
    );
    expect(guestsAreAllowed({ allowGuests: false, signedInOnly: false })).toBe(
      false,
    );
  });
});
