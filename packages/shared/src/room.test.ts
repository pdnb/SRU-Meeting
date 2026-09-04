import { describe, expect, it } from "vitest";
import {
  CreateRoomRequestSchema,
  PersonalRoomSchema,
  PersonalRoomSlugSchema,
} from "./room";

describe("CreateRoomRequestSchema", () => {
  it("rejects an invalid create-room payload", () => {
    const result = CreateRoomRequestSchema.safeParse({ name: "" });

    expect(result.success).toBe(false);
  });

  it("accepts a valid create-room payload", () => {
    const result = CreateRoomRequestSchema.safeParse({ name: "Weekly standup" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Weekly standup");
    }
  });
});

describe("PersonalRoomSlugSchema", () => {
  it("accepts vanity slugs", () => {
    expect(PersonalRoomSlugSchema.safeParse("somchai.jai").success).toBe(true);
    expect(PersonalRoomSlugSchema.safeParse("somchai.jai-2").success).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(PersonalRoomSlugSchema.safeParse("Somchai").success).toBe(false);
    expect(PersonalRoomSlugSchema.safeParse("-bad").success).toBe(false);
    expect(PersonalRoomSlugSchema.safeParse("a").success).toBe(false);
  });
});

describe("PersonalRoomSchema", () => {
  it("accepts a personal room DTO", () => {
    const result = PersonalRoomSchema.safeParse({
      id: "room-1",
      name: "Somchai's room",
      slug: "somchai.jai",
      joinPath: "/u/somchai.jai",
    });
    expect(result.success).toBe(true);
  });
});
