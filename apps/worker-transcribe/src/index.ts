import { PrismaClient } from "@prisma/client";
import { createTranscriptionProvider } from "./provider.js";

const prisma = new PrismaClient();
const provider = createTranscriptionProvider();
const POLL_MS = Number.parseInt(process.env.TRANSCRIBE_POLL_MS ?? "5000", 10);

export async function processTranscriptJob(transcriptId: string): Promise<boolean> {
  const row = await prisma.transcript.findUnique({
    where: { id: transcriptId },
    include: { recording: { select: { objectKey: true, status: true } } },
  });
  if (!row || row.status !== "pending" || row.recording.status !== "finished") {
    return false;
  }

  const claimed = await prisma.transcript.updateMany({
    where: { id: transcriptId, status: "pending" },
    data: { status: "processing" },
  });
  if (claimed.count === 0) {
    return false;
  }

  try {
    const segments = await provider.transcribe(row.recording.objectKey);
    await prisma.$transaction(async (tx) => {
      if (segments.length > 0) {
        await tx.transcriptSegment.createMany({
          data: segments.map((segment, index) => ({
            transcriptId,
            startMs: segment.startMs,
            endMs: segment.endMs,
            speakerLabel: segment.speakerLabel,
            text: segment.text,
            sortOrder: index,
          })),
        });
      }
      await tx.transcript.update({
        where: { id: transcriptId },
        data: {
          status: "finished",
          finishedAt: new Date(),
          language: segments.length > 0 ? "und" : null,
        },
      });
      await tx.meetingSummary.upsert({
        where: { transcriptId },
        update: {},
        create: {
          transcriptId,
          status: "not_configured",
          bodyMarkdown: null,
        },
      });
    });
    return true;
  } catch (error) {
    await prisma.transcript.update({
      where: { id: transcriptId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Transcription failed",
      },
    });
    return false;
  }
}

async function pollOnce(): Promise<number> {
  const pending = await prisma.transcript.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: { id: true },
  });
  let processed = 0;
  for (const job of pending) {
    if (await processTranscriptJob(job.id)) {
      processed += 1;
    }
  }
  return processed;
}

async function main(): Promise<void> {
  console.log("[worker-transcribe] stub provider started");
  for (;;) {
    try {
      const count = await pollOnce();
      if (count > 0) {
        console.log(`[worker-transcribe] processed ${count} job(s)`);
      }
    } catch (error) {
      console.error(
        "[worker-transcribe] poll error",
        error instanceof Error ? error.message : error,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

void main();
