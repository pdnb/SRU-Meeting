import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    recording: {
      findUnique: vi.fn(),
    },
    transcript: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));

import {
  enqueueTranscriptionJob,
  listPendingTranscriptionJobs,
} from "./transcription-queue";

describe("enqueueTranscriptionJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.transcript.findUnique.mockResolvedValue(null);
    prisma.transcript.create.mockResolvedValue({ id: "tx-1" });
  });

  it("does nothing when the recording is not finished", async () => {
    prisma.recording.findUnique.mockResolvedValue({
      id: "rec-1",
      status: "active",
      objectKey: null,
    });
    await enqueueTranscriptionJob("rec-1");
    expect(prisma.transcript.create).not.toHaveBeenCalled();
  });

  it("creates a pending transcript for a finished recording", async () => {
    prisma.recording.findUnique.mockResolvedValue({
      id: "rec-1",
      status: "finished",
      objectKey: "recordings/room-1/rec-1.mp4",
    });
    await enqueueTranscriptionJob("rec-1");
    expect(prisma.transcript.create).toHaveBeenCalled();
  });
});

describe("listPendingTranscriptionJobs", () => {
  it("returns pending jobs with audio object keys", async () => {
    prisma.transcript.findMany.mockResolvedValue([
      {
        id: "tx-1",
        recordingId: "rec-1",
        recording: {
          id: "rec-1",
          objectKey: "recordings/room-1/rec-1.mp4",
          status: "finished",
        },
      },
    ]);
    const jobs = await listPendingTranscriptionJobs();
    expect(jobs).toEqual([
      {
        transcriptId: "tx-1",
        recordingId: "rec-1",
        audioObjectKey: "recordings/room-1/rec-1.mp4",
      },
    ]);
  });
});
