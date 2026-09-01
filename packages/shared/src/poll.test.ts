import { describe, expect, it } from "vitest";
import {
  CreatePollRequestSchema,
  PollPacketSchema,
  PollSchema,
  VotePollRequestSchema,
} from "./poll";

describe("CreatePollRequestSchema", () => {
  it("rejects an empty create-poll payload", () => {
    expect(CreatePollRequestSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a question with at least two options", () => {
    const result = CreatePollRequestSchema.safeParse({
      question: "Which day works best?",
      options: ["Monday", "Tuesday"],
    });
    expect(result.success).toBe(true);
  });
});

describe("VotePollRequestSchema", () => {
  it("requires an option id", () => {
    expect(VotePollRequestSchema.safeParse({}).success).toBe(false);
    expect(
      VotePollRequestSchema.safeParse({ optionId: "opt-1" }).success,
    ).toBe(true);
  });
});

describe("PollSchema", () => {
  it("accepts an open poll with vote counts", () => {
    const result = PollSchema.safeParse({
      id: "poll-1",
      roomId: "room-1",
      question: "Ready?",
      status: "open",
      createdById: "host-1",
      createdAt: "2026-09-01T00:00:00.000Z",
      closedAt: null,
      options: [
        { id: "a", label: "Yes", voteCount: 2 },
        { id: "b", label: "No", voteCount: 1 },
      ],
      myVoteOptionId: "a",
    });
    expect(result.success).toBe(true);
  });
});

describe("PollPacketSchema", () => {
  it("accepts vote and close packets", () => {
    expect(
      PollPacketSchema.safeParse({
        type: "poll.voted",
        pollId: "poll-1",
        optionId: "a",
        userId: "user-1",
        voteCounts: { a: 2, b: 1 },
      }).success,
    ).toBe(true);
    expect(
      PollPacketSchema.safeParse({
        type: "poll.closed",
        pollId: "poll-1",
        poll: {
          id: "poll-1",
          roomId: "room-1",
          question: "Ready?",
          status: "closed",
          createdById: "host-1",
          createdAt: "2026-09-01T00:00:00.000Z",
          closedAt: "2026-09-01T00:05:00.000Z",
          options: [
            { id: "a", label: "Yes", voteCount: 2 },
            { id: "b", label: "No", voteCount: 1 },
          ],
        },
      }).success,
    ).toBe(true);
  });
});
