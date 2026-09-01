import { describe, expect, it } from "vitest";
import {
  BreakoutActionRequestSchema,
  BreakoutPacketSchema,
  BreakoutSessionSchema,
  CreateBreakoutsRequestSchema,
} from "./breakout";

describe("CreateBreakoutsRequestSchema", () => {
  it("rejects an empty create-breakouts payload", () => {
    const result = CreateBreakoutsRequestSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts an auto round with a room count", () => {
    const result = CreateBreakoutsRequestSchema.safeParse({
      mode: "auto",
      count: 4,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("auto");
      expect(result.data.count).toBe(4);
    }
  });

  it("accepts a manual round with assignments", () => {
    const result = CreateBreakoutsRequestSchema.safeParse({
      mode: "manual",
      assignments: [{ userId: "user-1", groupIndex: 0 }],
    });

    expect(result.success).toBe(true);
  });
});

describe("BreakoutSessionSchema", () => {
  it("requires a parent room id and assignment mode", () => {
    const result = BreakoutSessionSchema.safeParse({
      id: "bo_1",
      parentRoomId: "room-parent",
      status: "open",
      assignmentMode: "auto",
      endsAt: null,
      createdAt: "2026-08-31T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });
});

describe("BreakoutActionRequestSchema", () => {
  it("rejects a broadcast with no body", () => {
    expect(
      BreakoutActionRequestSchema.safeParse({ action: "broadcast" }).success,
    ).toBe(false);
  });

  it("accepts host broadcast, help, and recall", () => {
    expect(
      BreakoutActionRequestSchema.safeParse({
        action: "broadcast",
        body: "Two minutes left",
      }).success,
    ).toBe(true);
    expect(BreakoutActionRequestSchema.safeParse({ action: "help" }).success).toBe(
      true,
    );
    expect(
      BreakoutActionRequestSchema.safeParse({ action: "recall" }).success,
    ).toBe(true);
  });

  it("accepts a self-pick claim that names a child room", () => {
    expect(
      BreakoutActionRequestSchema.safeParse({
        action: "claim",
        childRoomId: "child-1",
      }).success,
    ).toBe(true);
    expect(
      BreakoutActionRequestSchema.safeParse({ action: "claim" }).success,
    ).toBe(false);
  });
});

describe("BreakoutPacketSchema", () => {
  it("accepts a recall packet that names the parent room", () => {
    const result = BreakoutPacketSchema.safeParse({
      type: "breakout.recall",
      sessionId: "bo_1",
      parentRoomId: "room-parent",
    });
    expect(result.success).toBe(true);
  });
});
