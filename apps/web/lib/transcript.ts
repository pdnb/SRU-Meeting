import "server-only";

import {
  MeetingSummarySchema,
  TranscriptSchema,
  type MeetingSummary,
  type Transcript,
} from "@sru/shared";
import { prisma } from "@/lib/db";
import { getParticipation } from "@/lib/rooms";

export function toTranscriptDto(row: {
  id: string;
  recordingId: string;
  status: "pending" | "processing" | "finished" | "failed";
  language: string | null;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
  segments: {
    id: string;
    startMs: number;
    endMs: number;
    speakerLabel: string;
    text: string;
    sortOrder: number;
  }[];
}): Transcript {
  return TranscriptSchema.parse({
    id: row.id,
    recordingId: row.recordingId,
    status: row.status,
    language: row.language,
    segments: row.segments.map((segment) => ({
      id: segment.id,
      startMs: segment.startMs,
      endMs: segment.endMs,
      speakerLabel: segment.speakerLabel,
      text: segment.text,
      sortOrder: segment.sortOrder,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
  });
}

export function toMeetingSummaryDto(row: {
  id: string;
  transcriptId: string;
  status: "not_configured" | "pending" | "finished" | "failed";
  bodyMarkdown: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MeetingSummary {
  const message =
    row.status === "not_configured" ? "Summary not configured" : null;
  return MeetingSummarySchema.parse({
    id: row.id,
    transcriptId: row.transcriptId,
    status: row.status,
    bodyMarkdown: row.bodyMarkdown,
    message,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

async function canViewRecordingContent(input: {
  recording: {
    roomId: string;
    startedById: string;
    room: { ownerId: string };
  };
  userId: string;
  orgAdmin: boolean;
}): Promise<boolean> {
  const participation = await getParticipation(
    input.recording.roomId,
    input.userId,
  );
  return (
    input.orgAdmin ||
    input.recording.room.ownerId === input.userId ||
    input.recording.startedById === input.userId ||
    (participation !== null &&
      !participation.banned &&
      participation.lobbyStatus === "admitted")
  );
}

export async function createPendingTranscriptForRecording(
  recordingId: string,
): Promise<{ id: string }> {
  const existing = await prisma.transcript.findUnique({
    where: { recordingId },
    select: { id: true },
  });
  if (existing) {
    return existing;
  }
  const created = await prisma.transcript.create({
    data: { recordingId, status: "pending" },
    select: { id: true },
  });
  return created;
}

export async function ensureSummaryPlaceholder(
  transcriptId: string,
): Promise<void> {
  await prisma.meetingSummary.upsert({
    where: { transcriptId },
    update: {},
    create: {
      transcriptId,
      status: "not_configured",
      bodyMarkdown: null,
    },
  });
}

export async function getTranscriptForUser(input: {
  recordingId: string;
  userId: string;
  orgAdmin: boolean;
}): Promise<
  | { ok: true; transcript: Transcript }
  | { ok: false; status: number; code: string; message: string }
> {
  const recording = await prisma.recording.findUnique({
    where: { id: input.recordingId },
    include: { room: true },
  });
  if (!recording) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "Recording not found",
    };
  }
  const allowed = await canViewRecordingContent({
    recording,
    userId: input.userId,
    orgAdmin: input.orgAdmin,
  });
  if (!allowed) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "Not allowed" };
  }

  const transcript = await prisma.transcript.findUnique({
    where: { recordingId: input.recordingId },
    include: {
      segments: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!transcript) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "Transcript not found",
    };
  }
  return { ok: true, transcript: toTranscriptDto(transcript) };
}

export async function getSummaryForUser(input: {
  recordingId: string;
  userId: string;
  orgAdmin: boolean;
}): Promise<
  | { ok: true; summary: MeetingSummary }
  | { ok: false; status: number; code: string; message: string }
> {
  const recording = await prisma.recording.findUnique({
    where: { id: input.recordingId },
    include: { room: true },
  });
  if (!recording) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "Recording not found",
    };
  }
  const allowed = await canViewRecordingContent({
    recording,
    userId: input.userId,
    orgAdmin: input.orgAdmin,
  });
  if (!allowed) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "Not allowed" };
  }

  const transcript = await prisma.transcript.findUnique({
    where: { recordingId: input.recordingId },
    include: { summary: true },
  });
  if (!transcript?.summary) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "Summary not found",
    };
  }
  return { ok: true, summary: toMeetingSummaryDto(transcript.summary) };
}

export async function onRecordingFinished(recordingId: string): Promise<void> {
  await createPendingTranscriptForRecording(recordingId);
  const { enqueueTranscriptionJob } = await import("@/lib/transcription-queue");
  await enqueueTranscriptionJob(recordingId);
}
