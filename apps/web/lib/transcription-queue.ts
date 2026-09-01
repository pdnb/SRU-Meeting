import "server-only";

import { prisma } from "@/lib/db";
import { createPendingTranscriptForRecording } from "@/lib/transcript";

/**
 * Enqueue a transcription job for a finished recording.
 * The worker-transcribe process polls Transcript rows in `pending` status.
 */
export async function enqueueTranscriptionJob(recordingId: string): Promise<void> {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    select: { id: true, status: true, objectKey: true },
  });
  if (!recording || recording.status !== "finished") {
    return;
  }
  await createPendingTranscriptForRecording(recordingId);
}

export async function listPendingTranscriptionJobs(limit = 10): Promise<
  {
    transcriptId: string;
    recordingId: string;
    audioObjectKey: string | null;
  }[]
> {
  const rows = await prisma.transcript.findMany({
    where: { status: "pending" },
    include: {
      recording: { select: { id: true, objectKey: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return rows
    .filter((row) => row.recording.status === "finished")
    .map((row) => ({
      transcriptId: row.id,
      recordingId: row.recordingId,
      audioObjectKey: row.recording.objectKey,
    }));
}
