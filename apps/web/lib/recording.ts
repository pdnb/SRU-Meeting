import "server-only";

import {
  RecordingSchema,
  StartRecordingRequestSchema,
  type Recording,
} from "@sru/shared";
import { prisma } from "@/lib/db";
import {
  startCompositeEgress,
  startTrackFileEgress,
  stopEgressById,
} from "@/lib/egress";
import { getRoomService } from "@/lib/livekit/room-service";
import { writeAudit } from "@/lib/audit";
import { getParticipation, getRoomRecord, isModeratorRole } from "@/lib/rooms";
import { signRecordingDownloadUrl } from "@/lib/storage";
import { enqueueWebhook } from "@/lib/webhooks";
import { assertE2eeCompatible } from "@/lib/e2ee/policy";

export function allAdmittedHaveConsented(
  admittedUserIds: string[],
  consentedUserIds: string[],
): boolean {
  if (admittedUserIds.length === 0) {
    return false;
  }
  const consented = new Set(consentedUserIds);
  return admittedUserIds.every((id) => consented.has(id));
}

export function toRecordingDto(
  row: {
    id: string;
    roomId: string;
    startedById: string;
    mode: "composite" | "tracks";
    status:
      | "pending_consent"
      | "starting"
      | "active"
      | "finishing"
      | "finished"
      | "failed";
    objectKey: string | null;
    hlsPrefix: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    createdAt: Date;
    consents?: { userId: string }[];
  },
  extras?: { downloadUrl?: string | null; hlsUrl?: string | null },
): Recording {
  return RecordingSchema.parse({
    id: row.id,
    roomId: row.roomId,
    startedById: row.startedById,
    mode: row.mode,
    status: row.status,
    objectKey: row.objectKey,
    hlsPrefix: row.hlsPrefix,
    downloadUrl: extras?.downloadUrl ?? null,
    hlsUrl: extras?.hlsUrl ?? null,
    consentedUserIds: row.consents?.map((row) => row.userId) ?? [],
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  });
}

async function publishRecordingMetadata(
  roomId: string,
  recording: { id: string; status: string } | null,
): Promise<void> {
  const livekit = getRoomService();
  if (!livekit) {
    return;
  }
  let spotlightIdentity: string | undefined;
  let streaming: { id: string; status: string } | null | undefined;
  try {
    const room = await livekit.listRooms([roomId]);
    const raw = room[0]?.metadata;
    if (raw) {
      const parsed = JSON.parse(raw) as {
        spotlightIdentity?: string;
        streaming?: { id: string; status: string } | null;
      };
      spotlightIdentity = parsed.spotlightIdentity;
      streaming = parsed.streaming;
    }
  } catch {
    // Keep going with recording-only metadata.
  }
  await livekit.updateRoomMetadata(
    roomId,
    JSON.stringify({
      ...(spotlightIdentity ? { spotlightIdentity } : {}),
      recording,
      ...(streaming !== undefined ? { streaming } : {}),
    }),
  );
}

async function startEgressForRecording(recording: {
  id: string;
  roomId: string;
  mode: "composite" | "tracks";
  trackIds?: string[];
}): Promise<void> {
  await prisma.recording.update({
    where: { id: recording.id },
    data: { status: "starting" },
  });
  try {
    if (recording.mode === "tracks") {
      const trackIds = recording.trackIds ?? [];
      if (trackIds.length === 0) {
        throw new Error("trackIds are required for track egress");
      }
      const started = await Promise.all(
        trackIds.map((trackId) =>
          startTrackFileEgress({
            roomId: recording.roomId,
            recordingId: recording.id,
            trackId,
          }),
        ),
      );
      await prisma.recording.update({
        where: { id: recording.id },
        data: {
          status: "active",
          startedAt: new Date(),
          egressIds: started.map((item) => item.egressId),
          objectKey: started[0]?.objectKey ?? null,
        },
      });
    } else {
      const started = await startCompositeEgress({
        roomId: recording.roomId,
        recordingId: recording.id,
      });
      await prisma.recording.update({
        where: { id: recording.id },
        data: {
          status: "active",
          startedAt: new Date(),
          egressIds: [started.egressId],
          objectKey: started.objectKey,
          hlsPrefix: started.hlsPrefix,
        },
      });
    }
    await publishRecordingMetadata(recording.roomId, {
      id: recording.id,
      status: "active",
    });
    await enqueueWebhook("recording_started", {
      recording: { id: recording.id, roomId: recording.roomId },
    });
  } catch (error) {
    await prisma.recording.update({
      where: { id: recording.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Egress failed",
      },
    });
    await publishRecordingMetadata(recording.roomId, {
      id: recording.id,
      status: "failed",
    });
    throw error;
  }
}

export async function requestRecording(input: {
  roomId: string;
  actorId: string;
  raw: unknown;
}): Promise<
  | { ok: true; recording: Recording }
  | { ok: false; status: number; code: string; message: string }
> {
  const parsed = StartRecordingRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return { ok: false, status: 422, code: "VALIDATION_ERROR", message: "Invalid recording request" };
  }
  const room = await getRoomRecord(input.roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  const actor = await getParticipation(input.roomId, input.actorId);
  const role = actor?.role ?? (room.ownerId === input.actorId ? "host" : null);
  if (!role || !isModeratorRole(role)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only a host or cohost can start recording",
    };
  }

  const e2eeGate = assertE2eeCompatible(room, "recording");
  if (!e2eeGate.ok) {
    return e2eeGate;
  }

  const active = await prisma.recording.findFirst({
    where: {
      roomId: input.roomId,
      status: { in: ["pending_consent", "starting", "active"] },
    },
  });
  if (active) {
    return {
      ok: false,
      status: 409,
      code: "RECORDING_ACTIVE",
      message: "A recording is already in progress",
    };
  }

  const recording = await prisma.recording.create({
    data: {
      roomId: input.roomId,
      startedById: input.actorId,
      mode: parsed.data.mode,
      status: "pending_consent",
      consents: {
        create: { userId: input.actorId },
      },
    },
    include: { consents: true },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "recording.request",
    targetType: "recording",
    targetId: recording.id,
    metadata: { roomId: input.roomId, mode: parsed.data.mode },
  });

  const admitted = await prisma.roomParticipant.findMany({
    where: { roomId: input.roomId, banned: false, lobbyStatus: "admitted" },
    select: { userId: true },
  });
  const admittedIds = admitted.map((row) => row.userId);
  if (admittedIds.length === 0) {
    admittedIds.push(input.actorId);
  }

  await publishRecordingMetadata(input.roomId, {
    id: recording.id,
    status: "pending_consent",
  });

  if (
    allAdmittedHaveConsented(
      admittedIds,
      recording.consents.map((row) => row.userId),
    )
  ) {
    await startEgressForRecording({
      id: recording.id,
      roomId: input.roomId,
      mode: parsed.data.mode,
      trackIds: parsed.data.trackIds,
    });
  }

  const fresh = await prisma.recording.findUniqueOrThrow({
    where: { id: recording.id },
    include: { consents: true },
  });
  return { ok: true, recording: toRecordingDto(fresh) };
}

export async function consentToRecording(input: {
  roomId: string;
  actorId: string;
}): Promise<
  | { ok: true; recording: Recording }
  | { ok: false; status: number; code: string; message: string }
> {
  const recording = await prisma.recording.findFirst({
    where: { roomId: input.roomId, status: "pending_consent" },
    include: { consents: true },
    orderBy: { createdAt: "desc" },
  });
  if (!recording) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "No recording is waiting for consent",
    };
  }

  await prisma.recordingConsent.upsert({
    where: {
      recordingId_userId: {
        recordingId: recording.id,
        userId: input.actorId,
      },
    },
    update: {},
    create: { recordingId: recording.id, userId: input.actorId },
  });

  const admitted = await prisma.roomParticipant.findMany({
    where: { roomId: input.roomId, banned: false, lobbyStatus: "admitted" },
    select: { userId: true },
  });
  const consents = await prisma.recordingConsent.findMany({
    where: { recordingId: recording.id },
  });
  if (
    allAdmittedHaveConsented(
      admitted.map((row) => row.userId),
      consents.map((row) => row.userId),
    )
  ) {
    const stored = await prisma.recording.findUniqueOrThrow({
      where: { id: recording.id },
    });
    await startEgressForRecording({
      id: stored.id,
      roomId: stored.roomId,
      mode: stored.mode,
    });
  }

  const fresh = await prisma.recording.findUniqueOrThrow({
    where: { id: recording.id },
    include: { consents: true },
  });
  return { ok: true, recording: toRecordingDto(fresh) };
}

export async function stopRecording(input: {
  roomId: string;
  actorId: string;
}): Promise<
  | { ok: true; recording: Recording }
  | { ok: false; status: number; code: string; message: string }
> {
  const room = await getRoomRecord(input.roomId);
  if (!room) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Room not found" };
  }
  const actor = await getParticipation(input.roomId, input.actorId);
  const role = actor?.role ?? (room.ownerId === input.actorId ? "host" : null);
  if (!role || !isModeratorRole(role)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Only a host or cohost can stop recording",
    };
  }

  const recording = await prisma.recording.findFirst({
    where: {
      roomId: input.roomId,
      status: { in: ["pending_consent", "starting", "active"] },
    },
    include: { consents: true },
    orderBy: { createdAt: "desc" },
  });
  if (!recording) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "No active recording" };
  }

  await prisma.recording.update({
    where: { id: recording.id },
    data: { status: "finishing" },
  });

  for (const egressId of recording.egressIds) {
    try {
      await stopEgressById(egressId);
    } catch {
      // Egress may already have stopped.
    }
  }

  const finished = await prisma.recording.update({
    where: { id: recording.id },
    data: { status: "finished", finishedAt: new Date() },
    include: { consents: true },
  });
  await publishRecordingMetadata(input.roomId, null);
  await writeAudit({
    actorId: input.actorId,
    action: "recording.stop",
    targetType: "recording",
    targetId: recording.id,
  });
  await enqueueWebhook("recording_finished", {
    recording: { id: recording.id, roomId: input.roomId },
  });
  const { onRecordingFinished } = await import("@/lib/transcript");
  await onRecordingFinished(recording.id);
  return { ok: true, recording: toRecordingDto(finished) };
}

export async function getRecordingForUser(input: {
  recordingId: string;
  userId: string;
  orgAdmin: boolean;
}): Promise<
  | { ok: true; recording: Recording }
  | { ok: false; status: number; code: string; message: string }
> {
  const recording = await prisma.recording.findUnique({
    where: { id: input.recordingId },
    include: { consents: true, room: true },
  });
  if (!recording) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Recording not found" };
  }
  const participation = await getParticipation(recording.roomId, input.userId);
  const allowed =
    input.orgAdmin ||
    recording.room.ownerId === input.userId ||
    recording.startedById === input.userId ||
    (participation !== null &&
      !participation.banned &&
      participation.lobbyStatus === "admitted");
  if (!allowed) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "Not allowed" };
  }

  let downloadUrl: string | null = null;
  if (recording.objectKey && recording.status === "finished") {
    try {
      downloadUrl = await signRecordingDownloadUrl(recording.objectKey);
    } catch {
      downloadUrl = null;
    }
  }
  const hlsUrl =
    recording.hlsPrefix && recording.status === "finished"
      ? `/api/v1/recordings/${recording.id}/media/index.m3u8`
      : null;
  return {
    ok: true,
    recording: toRecordingDto(recording, { downloadUrl, hlsUrl }),
  };
}

export async function currentRoomRecording(roomId: string): Promise<Recording | null> {
  const recording = await prisma.recording.findFirst({
    where: {
      roomId,
      status: { in: ["pending_consent", "starting", "active"] },
    },
    include: { consents: true },
    orderBy: { createdAt: "desc" },
  });
  return recording ? toRecordingDto(recording) : null;
}
