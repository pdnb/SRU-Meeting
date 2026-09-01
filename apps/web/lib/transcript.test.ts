import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    transcript: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    meetingSummary: {
      upsert: vi.fn(),
    },
    recording: {
      findUnique: vi.fn(),
    },
    roomParticipant: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/transcription-queue", () => ({
  enqueueTranscriptionJob: vi.fn(async () => undefined),
}));

import { enqueueTranscriptionJob } from "@/lib/transcription-queue";
import {
  createPendingTranscriptForRecording,
  getTranscriptForUser,
  onRecordingFinished,
  toMeetingSummaryDto,
  toTranscriptDto,
} from "./transcript";

describe("toTranscriptDto", () => {
  it("maps segments in sort order", () => {
    const dto = toTranscriptDto({
      id: "tx-1",
      recordingId: "rec-1",
      status: "finished",
      language: "en",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-01T00:05:00.000Z"),
      finishedAt: new Date("2026-09-01T00:05:00.000Z"),
      segments: [
        {
          id: "seg-1",
          startMs: 0,
          endMs: 1200,
          speakerLabel: "Host",
          text: "Hello",
          sortOrder: 0,
        },
      ],
    });
    expect(dto.segments).toHaveLength(1);
    expect(dto.segments[0]?.speakerLabel).toBe("Host");
  });
});

describe("toMeetingSummaryDto", () => {
  it("returns not configured message for placeholder summaries", () => {
    const dto = toMeetingSummaryDto({
      id: "sum-1",
      transcriptId: "tx-1",
      status: "not_configured",
      bodyMarkdown: null,
      createdAt: new Date("2026-09-01T00:05:00.000Z"),
      updatedAt: new Date("2026-09-01T00:05:00.000Z"),
    });
    expect(dto.message).toBe("Summary not configured");
  });
});

describe("createPendingTranscriptForRecording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is idempotent when a transcript already exists", async () => {
    prisma.transcript.findUnique.mockResolvedValue({ id: "tx-existing" });
    const result = await createPendingTranscriptForRecording("rec-1");
    expect(result.id).toBe("tx-existing");
    expect(prisma.transcript.create).not.toHaveBeenCalled();
  });

  it("creates a pending transcript for a new recording", async () => {
    prisma.transcript.findUnique.mockResolvedValue(null);
    prisma.transcript.create.mockResolvedValue({ id: "tx-new" });
    const result = await createPendingTranscriptForRecording("rec-1");
    expect(result.id).toBe("tx-new");
    expect(prisma.transcript.create).toHaveBeenCalledWith({
      data: { recordingId: "rec-1", status: "pending" },
      select: { id: true },
    });
  });
});

describe("getTranscriptForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when no transcript exists", async () => {
    prisma.recording.findUnique.mockResolvedValue({
      id: "rec-1",
      roomId: "room-1",
      startedById: "host-1",
      room: { ownerId: "host-1" },
    });
    prisma.roomParticipant.findUnique.mockResolvedValue(null);
    prisma.transcript.findUnique.mockResolvedValue(null);

    const result = await getTranscriptForUser({
      recordingId: "rec-1",
      userId: "host-1",
      orgAdmin: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
  });

  it("returns 403 for a non-member", async () => {
    prisma.recording.findUnique.mockResolvedValue({
      id: "rec-1",
      roomId: "room-1",
      startedById: "host-1",
      room: { ownerId: "host-1" },
    });
    prisma.roomParticipant.findUnique.mockResolvedValue(null);

    const result = await getTranscriptForUser({
      recordingId: "rec-1",
      userId: "outsider",
      orgAdmin: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe("onRecordingFinished", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.transcript.findUnique.mockResolvedValue(null);
    prisma.transcript.create.mockResolvedValue({ id: "tx-1" });
  });

  it("creates a pending transcript and enqueues a job", async () => {
    await onRecordingFinished("rec-1");
    expect(prisma.transcript.create).toHaveBeenCalled();
    expect(enqueueTranscriptionJob).toHaveBeenCalledWith("rec-1");
  });
});
