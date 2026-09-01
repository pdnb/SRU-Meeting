import { describe, expect, it } from "vitest";
import {
  MeetingSummarySchema,
  TranscriptSchema,
  TranscriptSegmentSchema,
  TranscriptionSegmentInputSchema,
} from "./transcript";

describe("TranscriptSegmentSchema", () => {
  it("accepts a timed segment with speaker label", () => {
    const result = TranscriptSegmentSchema.safeParse({
      id: "seg-1",
      startMs: 0,
      endMs: 4200,
      speakerLabel: "Speaker 1",
      text: "Welcome to the meeting.",
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe("TranscriptSchema", () => {
  it("accepts a pending transcript without segments", () => {
    const result = TranscriptSchema.safeParse({
      id: "tx-1",
      recordingId: "rec-1",
      status: "pending",
      language: null,
      segments: [],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      finishedAt: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a finished transcript with ordered segments", () => {
    const result = TranscriptSchema.safeParse({
      id: "tx-1",
      recordingId: "rec-1",
      status: "finished",
      language: "en",
      segments: [
        {
          id: "seg-1",
          startMs: 0,
          endMs: 1200,
          speakerLabel: "Host",
          text: "Hello everyone.",
          sortOrder: 0,
        },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:05:00.000Z",
      finishedAt: "2026-09-01T00:05:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("MeetingSummarySchema", () => {
  it("accepts a not_configured placeholder summary", () => {
    const result = MeetingSummarySchema.safeParse({
      id: "sum-1",
      transcriptId: "tx-1",
      status: "not_configured",
      bodyMarkdown: null,
      message: "Summary not configured",
      createdAt: "2026-09-01T00:05:00.000Z",
      updatedAt: "2026-09-01T00:05:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("TranscriptionSegmentInputSchema", () => {
  it("accepts worker segment input without ids", () => {
    const result = TranscriptionSegmentInputSchema.safeParse({
      startMs: 1000,
      endMs: 2500,
      speakerLabel: "Speaker 2",
      text: "Thanks for joining.",
    });
    expect(result.success).toBe(true);
  });
});
