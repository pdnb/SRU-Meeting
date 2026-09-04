import { describe, expect, it } from "vitest";
import { guestJoinPath } from "./guest-join";

describe("guestJoinPath", () => {
  it("returns /u/{slug} for personal rooms with a slug", () => {
    expect(
      guestJoinPath({ kind: "personal", id: "room-1", slug: "somchai.jai" }),
    ).toBe("/u/somchai.jai");
  });

  it("returns /join/{id} for adhoc rooms", () => {
    expect(
      guestJoinPath({ kind: "adhoc", id: "room-1", slug: null }),
    ).toBe("/join/room-1");
  });

  it("falls back to /join/{id} when personal room has no slug", () => {
    expect(
      guestJoinPath({ kind: "personal", id: "room-1", slug: null }),
    ).toBe("/join/room-1");
  });
});
