import { describe, expect, it } from "vitest";
import { WhiteboardSessionSchema } from "./whiteboard";

describe("WhiteboardSessionSchema", () => {
  it("accepts an open session without a snapshot", () => {
    const result = WhiteboardSessionSchema.safeParse({
      id: "wb-1",
      roomId: "room-1",
      status: "open",
      openedById: "host-1",
      snapshotKey: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      closedAt: null,
    });
    expect(result.success).toBe(true);
  });
});
