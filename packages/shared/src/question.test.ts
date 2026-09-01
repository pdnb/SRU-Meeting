import { describe, expect, it } from "vitest";
import {
  ModerateQuestionRequestSchema,
  QuestionSchema,
  SubmitQuestionRequestSchema,
} from "./question";

describe("SubmitQuestionRequestSchema", () => {
  it("rejects an empty question", () => {
    expect(SubmitQuestionRequestSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a trimmed question body", () => {
    expect(
      SubmitQuestionRequestSchema.safeParse({ body: "How do we deploy?" })
        .success,
    ).toBe(true);
  });
});

describe("ModerateQuestionRequestSchema", () => {
  it("accepts pin, answer, dismiss, and upvote actions", () => {
    expect(
      ModerateQuestionRequestSchema.safeParse({
        action: "pin",
        questionId: "q1",
        value: true,
      }).success,
    ).toBe(true);
    expect(
      ModerateQuestionRequestSchema.safeParse({
        action: "answer",
        questionId: "q1",
        answer: "Next week",
      }).success,
    ).toBe(true);
    expect(
      ModerateQuestionRequestSchema.safeParse({
        action: "dismiss",
        questionId: "q1",
      }).success,
    ).toBe(true);
    expect(
      ModerateQuestionRequestSchema.safeParse({
        action: "upvote",
        questionId: "q1",
      }).success,
    ).toBe(true);
  });
});

describe("QuestionSchema", () => {
  it("accepts a pending question with upvote count", () => {
    const result = QuestionSchema.safeParse({
      id: "q1",
      roomId: "room-1",
      userId: "user-1",
      body: "When is the release?",
      status: "pending",
      isPinned: false,
      answer: null,
      upvoteCount: 3,
      createdAt: "2026-09-01T00:00:00.000Z",
      answeredAt: null,
      hasUpvoted: true,
    });
    expect(result.success).toBe(true);
  });
});
