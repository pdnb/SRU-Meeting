import { describe, expect, it } from "vitest";
import type { BreakoutSession } from "@sru/shared";
import {
  assignedChildRoomId,
  breakoutJoinPath,
  breakoutTimerLabel,
  childAssignmentCount,
  childRoomLabel,
  parseApiErrorMessage,
  parseBreakoutGet,
  parseBreakoutPacket,
  parseDurationMinutes,
} from "./breakout-ui";

const session: BreakoutSession = {
  id: "sess-1",
  parentRoomId: "room-parent",
  status: "open",
  assignmentMode: "auto",
  endsAt: null,
  createdAt: "2026-08-31T08:00:00.000Z",
  childRoomIds: ["child-a", "child-b"],
  assignments: [
    { userId: "user-1", childRoomId: "child-a" },
    { userId: "user-2", childRoomId: "child-b" },
  ],
};

describe("assignedChildRoomId", () => {
  it("returns the child room for the signed-in participant", () => {
    expect(assignedChildRoomId(session, "user-2")).toBe("child-b");
  });

  it("returns null when the participant is not assigned", () => {
    expect(assignedChildRoomId(session, "user-other")).toBeNull();
    expect(assignedChildRoomId(null, "user-1")).toBeNull();
  });
});

describe("childRoomLabel", () => {
  it("numbers rooms from the session child list", () => {
    expect(childRoomLabel(session, "child-b")).toBe("Room 2");
  });

  it("falls back when the child is not in the list", () => {
    expect(childRoomLabel(session, "missing")).toBe("your breakout room");
    expect(childRoomLabel(null, "child-a")).toBe("your breakout room");
  });
});

describe("childAssignmentCount", () => {
  it("counts people already in a child for self-pick occupancy", () => {
    expect(childAssignmentCount(session, "child-a")).toBe(1);
    expect(childAssignmentCount(session, "child-b")).toBe(1);
    expect(childAssignmentCount(session, "child-missing")).toBe(0);
    expect(childAssignmentCount(null, "child-a")).toBe(0);
  });
});

describe("breakoutJoinPath", () => {
  it("joins through the existing meeting route", () => {
    expect(breakoutJoinPath("child-a")).toBe("/app/rooms/child-a");
  });
});

describe("parseBreakoutGet", () => {
  it("reads an open session from GET /breakouts", () => {
    expect(parseBreakoutGet(200, { data: session })).toEqual({
      kind: "ok",
      session,
    });
  });

  it("treats a parent with no session as empty", () => {
    expect(parseBreakoutGet(200, { data: null })).toEqual({
      kind: "ok",
      session: null,
    });
  });

  it("marks child rooms as unable to host breakouts", () => {
    expect(
      parseBreakoutGet(403, {
        error: {
          code: "CHILD_CANNOT_HOST_BREAKOUTS",
          message: "Breakouts can only be listed on a parent room",
        },
      }),
    ).toEqual({ kind: "child" });
  });

  it("surfaces other API failures", () => {
    expect(
      parseBreakoutGet(500, {
        error: { code: "INTERNAL", message: "Broken" },
      }),
    ).toEqual({ kind: "error", message: "Broken" });
  });
});

describe("parseApiErrorMessage", () => {
  it("reads the API error message when present", () => {
    expect(
      parseApiErrorMessage({ error: { code: "SESSION_OPEN", message: "Already open" } }, "fail"),
    ).toBe("Already open");
  });

  it("uses the fallback when the body is not an API error", () => {
    expect(parseApiErrorMessage({}, "Could not open breakouts")).toBe(
      "Could not open breakouts",
    );
  });
});

describe("breakoutTimerLabel", () => {
  it("returns null when the session has no end time", () => {
    expect(breakoutTimerLabel(null, new Date("2026-08-31T09:00:00.000Z"))).toBeNull();
  });

  it("formats remaining time and flags expiry", () => {
    expect(
      breakoutTimerLabel(
        "2026-08-31T09:05:04.000Z",
        new Date("2026-08-31T09:00:00.000Z"),
      ),
    ).toBe("5:04 left");
    expect(
      breakoutTimerLabel(
        "2026-08-31T08:59:00.000Z",
        new Date("2026-08-31T09:00:00.000Z"),
      ),
    ).toBe("Time's up");
  });
});

describe("parseDurationMinutes", () => {
  it("treats a blank field as no timer", () => {
    expect(parseDurationMinutes("")).toEqual({ ok: true, durationSeconds: undefined });
    expect(parseDurationMinutes("  ")).toEqual({
      ok: true,
      durationSeconds: undefined,
    });
  });

  it("converts minutes within the API range", () => {
    expect(parseDurationMinutes("5")).toEqual({ ok: true, durationSeconds: 300 });
  });

  it("rejects values outside 1–240 minutes", () => {
    expect(parseDurationMinutes("0").ok).toBe(false);
    expect(parseDurationMinutes("241").ok).toBe(false);
    expect(parseDurationMinutes("nope").ok).toBe(false);
  });
});

describe("parseBreakoutPacket", () => {
  it("accepts a recall packet and ignores other payloads", () => {
    expect(
      parseBreakoutPacket({
        type: "breakout.recall",
        sessionId: "sess-1",
        parentRoomId: "room-parent",
      }),
    ).toEqual({
      type: "breakout.recall",
      sessionId: "sess-1",
      parentRoomId: "room-parent",
    });
    expect(parseBreakoutPacket({ type: "reaction" })).toBeNull();
  });
});
