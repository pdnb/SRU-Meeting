import { describe, expect, it } from "vitest";
import { CreateRoomRequestSchema } from "./room";

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
