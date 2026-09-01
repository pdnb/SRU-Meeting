import "server-only";

import {
  StartStreamRequestSchema,
  StreamSchema,
  UpdateStreamRequestSchema,
  type StartStreamRequest,
  type Stream,
} from "@sru/shared";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  startRtmpRoomCompositeEgress,
  stopEgressById,
  streamHlsPrefix,
  updateRtmpStream,
} from "@/lib/egress";
import { allAdmittedHaveConsented } from "@/lib/recording";
import { getParticipation, getRoomRecord, isModeratorRole } from "@/lib/rooms";
import { enqueueWebhook } from "@/lib/webhooks";
import { streamLivePlaylistUrl } from "@/lib/stream-ui";
import { getRoomService } from "@/lib/livekit/room-service";

const MAX_STREAM_DESTINATIONS = 8;

type StreamActionResult =
  | { ok: true; stream: Stream }
  | { ok: false; status: number; code: string; message: string };

type DestinationChange =
  | { ok: true; urls: string[] }
  | { ok: false; status: 422 | 409 | 404; code: string; message: string };

export function parseRtmpUrl(
  raw: unknown,
): { ok: true; url: string } | { ok: false } {
  if (typeof raw !== "string") {
    return { ok: false };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 2048) {
    return { ok: false };
  }
  if (!trimmed.startsWith("rtmp://") && !trimmed.startsWith("rtmps://")) {
    return { ok: false };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "rtmp:" && parsed.protocol !== "rtmps:") {
      return { ok: false };
    }
    if (!parsed.hostname) {
      return { ok: false };
    }
    return { ok: true, url: trimmed };
  } catch {
    return { ok: false };
  }
}

export function redactRtmpUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "rtmp://";
  }
}

export function nextStreamDestinations(input: {
  current: string[];
  add?: unknown;
  remove?: unknown;
}): DestinationChange {
  if (
    (input.add === undefined && input.remove === undefined) ||
    (input.add !== undefined && input.remove !== undefined)
  ) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Provide either add or remove",
    };
  }
  if (input.add !== undefined) {
    const parsed = parseRtmpUrl(input.add);
    if (!parsed.ok) {
      return {
        ok: false,
        status: 422,
        code: "VALIDATION_ERROR",
        message: "RTMP URL must be rtmp:// or rtmps://",
      };
    }
    if (input.current.includes(parsed.url)) {
      return {
        ok: false,
        status: 409,
        code: "STREAM_DESTINATION_EXISTS",
        message: "That RTMP destination is already configured",
      };
    }
    if (input.current.length >= MAX_STREAM_DESTINATIONS) {
      return {
        ok: false,
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Too many RTMP destinations",
      };
    }
    return { ok: true, urls: [...input.current, parsed.url] };
  }
  const parsed = parseRtmpUrl(input.remove);
  if (!parsed.ok) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "RTMP URL must be rtmp:// or rtmps://",
    };
  }
  if (!input.current.includes(parsed.url)) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "That RTMP destination is not configured",
    };
  }
  return {
    ok: true,
    urls: input.current.filter((url) => url !== parsed.url),
  };
}

function collectRequestedRtmpUrls(
  data: StartStreamRequest,
): { ok: true; urls: string[] } | { ok: false } {
  const raw = [
    ...(data.rtmpUrl ? [data.rtmpUrl] : []),
    ...(data.rtmpUrls ?? []),
  ];
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = parseRtmpUrl(item);
    if (!parsed.ok) {
      return { ok: false };
    }
    if (!seen.has(parsed.url)) {
      seen.add(parsed.url);
      urls.push(parsed.url);
    }
  }
  if (urls.length > MAX_STREAM_DESTINATIONS) {
    return { ok: false };
  }
  return { ok: true, urls };
}

export function toStreamDto(
  row: {
    id: string;
    roomId: string;
    startedById: string;
    status:
      | "pending_consent"
      | "starting"
      | "active"
      | "finishing"
      | "finished"
      | "failed";
    rtmpUrls: string[];
    hlsPrefix?: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    createdAt: Date;
    consents?: { userId: string }[];
  },
  extras?: { hlsUrl?: string | null },
): Stream {
  return StreamSchema.parse({
    id: row.id,
    roomId: row.roomId,
    startedById: row.startedById,
    status: row.status,
    destinations: row.rtmpUrls.map(redactRtmpUrl),
    hlsPrefix: row.hlsPrefix ?? null,
    hlsUrl: extras?.hlsUrl ?? null,
    consentedUserIds: row.consents?.map((row) => row.userId) ?? [],
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  });
}

async function publishStreamMetadata(
  roomId: string,
  streaming: { id: string; status: string } | null,
): Promise<void> {
  const livekit = getRoomService();
  if (!livekit) {
    return;
  }
  let spotlightIdentity: string | undefined;
  let recording: { id: string; status: string } | null | undefined;
  try {
    const rooms = await livekit.listRooms([roomId]);
    const raw = rooms[0]?.metadata;
    if (raw) {
      const parsed = JSON.parse(raw) as {
        spotlightIdentity?: string;
        recording?: { id: string; status: string } | null;
      };
      spotlightIdentity = parsed.spotlightIdentity;
      recording = parsed.recording;
    }
  } catch {
    // Keep going with streaming-only metadata.
  }
  await livekit.updateRoomMetadata(
    roomId,
    JSON.stringify({
      ...(spotlightIdentity ? { spotlightIdentity } : {}),
      ...(recording !== undefined ? { recording } : {}),
      streaming,
    }),
  );
}

async function startEgressForStream(stream: {
  id: string;
  roomId: string;
  rtmpUrls: string[];
  hlsPrefix: string | null;
}): Promise<void> {
  await prisma.stream.update({
    where: { id: stream.id },
    data: { status: "starting" },
  });
  try {
    const started = await startRtmpRoomCompositeEgress({
      roomId: stream.roomId,
      urls: stream.rtmpUrls,
      hlsPrefix: stream.hlsPrefix,
    });
    await prisma.stream.update({
      where: { id: stream.id },
      data: {
        status: "active",
        startedAt: new Date(),
        egressIds: [started.egressId],
      },
    });
    await publishStreamMetadata(stream.roomId, {
      id: stream.id,
      status: "active",
    });
    await enqueueWebhook("streaming_started", {
      stream: { id: stream.id, roomId: stream.roomId },
    });
  } catch (error) {
    await prisma.stream.update({
      where: { id: stream.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Egress failed",
      },
    });
    await publishStreamMetadata(stream.roomId, null);
    throw error;
  }
}

export async function requestStream(input: {
  roomId: string;
  actorId: string;
  raw: unknown;
}): Promise<StreamActionResult> {
  const parsed = StartStreamRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid stream request",
    };
  }
  const rtmp = collectRequestedRtmpUrls(parsed.data);
  if (!rtmp.ok) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "RTMP URL must be rtmp:// or rtmps://",
    };
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
      message: "Only a host or cohost can start streaming",
    };
  }

  const active = await prisma.stream.findFirst({
    where: {
      roomId: input.roomId,
      status: { in: ["pending_consent", "starting", "active"] },
    },
  });
  if (active) {
    return {
      ok: false,
      status: 409,
      code: "STREAM_ACTIVE",
      message: "A stream is already in progress",
    };
  }

  const stream = await prisma.stream.create({
    data: {
      roomId: input.roomId,
      startedById: input.actorId,
      status: "pending_consent",
      rtmpUrls: rtmp.urls,
      consents: {
        create: { userId: input.actorId },
      },
    },
    include: { consents: true },
  });
  const hlsPrefix = parsed.data.hls
    ? streamHlsPrefix(input.roomId, stream.id)
    : null;
  if (hlsPrefix) {
    await prisma.stream.update({
      where: { id: stream.id },
      data: { hlsPrefix },
    });
  }

  await writeAudit({
    actorId: input.actorId,
    action: "stream.request",
    targetType: "stream",
    targetId: stream.id,
    metadata: { roomId: input.roomId },
  });

  const admitted = await prisma.roomParticipant.findMany({
    where: { roomId: input.roomId, banned: false, lobbyStatus: "admitted" },
    select: { userId: true },
  });
  const admittedIds = admitted.map((row) => row.userId);
  if (admittedIds.length === 0) {
    admittedIds.push(input.actorId);
  }

  if (
    allAdmittedHaveConsented(
      admittedIds,
      stream.consents.map((row) => row.userId),
    )
  ) {
    await startEgressForStream({
      id: stream.id,
      roomId: input.roomId,
      rtmpUrls: rtmp.urls,
      hlsPrefix,
    });
  } else {
    await publishStreamMetadata(input.roomId, {
      id: stream.id,
      status: "pending_consent",
    });
  }

  const fresh = await prisma.stream.findUniqueOrThrow({
    where: { id: stream.id },
    include: { consents: true },
  });
  return { ok: true, stream: toStreamDto(fresh) };
}

export async function consentToStream(input: {
  roomId: string;
  actorId: string;
}): Promise<StreamActionResult> {
  const stream = await prisma.stream.findFirst({
    where: { roomId: input.roomId, status: "pending_consent" },
    include: { consents: true },
    orderBy: { createdAt: "desc" },
  });
  if (!stream) {
    return {
      ok: false,
      status: 404,
      code: "NOT_FOUND",
      message: "No stream is waiting for consent",
    };
  }

  await prisma.streamConsent.upsert({
    where: {
      streamId_userId: {
        streamId: stream.id,
        userId: input.actorId,
      },
    },
    update: {},
    create: { streamId: stream.id, userId: input.actorId },
  });

  const admitted = await prisma.roomParticipant.findMany({
    where: { roomId: input.roomId, banned: false, lobbyStatus: "admitted" },
    select: { userId: true },
  });
  const consents = await prisma.streamConsent.findMany({
    where: { streamId: stream.id },
  });
  if (
    allAdmittedHaveConsented(
      admitted.map((row) => row.userId),
      consents.map((row) => row.userId),
    )
  ) {
    const stored = await prisma.stream.findUniqueOrThrow({
      where: { id: stream.id },
    });
    await startEgressForStream({
      id: stored.id,
      roomId: stored.roomId,
      rtmpUrls: stored.rtmpUrls,
      hlsPrefix: stored.hlsPrefix,
    });
  }

  const fresh = await prisma.stream.findUniqueOrThrow({
    where: { id: stream.id },
    include: { consents: true },
  });
  return { ok: true, stream: toStreamDto(fresh) };
}

export async function stopStream(input: {
  roomId: string;
  actorId: string;
}): Promise<StreamActionResult> {
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
      message: "Only a host or cohost can stop streaming",
    };
  }

  const stream = await prisma.stream.findFirst({
    where: {
      roomId: input.roomId,
      status: { in: ["pending_consent", "starting", "active"] },
    },
    include: { consents: true },
    orderBy: { createdAt: "desc" },
  });
  if (!stream) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "No active stream" };
  }

  await prisma.stream.update({
    where: { id: stream.id },
    data: { status: "finishing" },
  });

  for (const egressId of stream.egressIds) {
    try {
      await stopEgressById(egressId);
    } catch {
      // Egress may already have stopped.
    }
  }

  const finished = await prisma.stream.update({
    where: { id: stream.id },
    data: { status: "finished", finishedAt: new Date() },
    include: { consents: true },
  });
  await publishStreamMetadata(input.roomId, null);
  await writeAudit({
    actorId: input.actorId,
    action: "stream.stop",
    targetType: "stream",
    targetId: stream.id,
  });
  return { ok: true, stream: toStreamDto(finished) };
}

export async function updateRoomStream(input: {
  roomId: string;
  actorId: string;
  raw: unknown;
}): Promise<StreamActionResult> {
  const parsed = UpdateStreamRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Invalid stream update",
    };
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
      message: "Only a host or cohost can update streaming destinations",
    };
  }

  const stream = await prisma.stream.findFirst({
    where: {
      roomId: input.roomId,
      status: { in: ["pending_consent", "starting", "active"] },
    },
    include: { consents: true },
    orderBy: { createdAt: "desc" },
  });
  if (!stream) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "No active stream" };
  }
  if (stream.status === "starting") {
    return {
      ok: false,
      status: 409,
      code: "STREAM_STARTING",
      message: "Stream egress is still starting",
    };
  }

  const next = nextStreamDestinations({
    current: stream.rtmpUrls,
    add: parsed.data.action === "add" ? parsed.data.rtmpUrl : undefined,
    remove: parsed.data.action === "remove" ? parsed.data.rtmpUrl : undefined,
  });
  if (!next.ok) {
    return next;
  }
  if (next.urls.length === 0 && !stream.hlsPrefix) {
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: "At least one destination is required",
    };
  }

  if (stream.status === "active") {
    const egressId = stream.egressIds[0];
    if (!egressId) {
      return {
        ok: false,
        status: 409,
        code: "STREAM_NOT_READY",
        message: "Stream egress is not ready",
      };
    }
    const added = next.urls.filter((url) => !stream.rtmpUrls.includes(url));
    const removed = stream.rtmpUrls.filter((url) => !next.urls.includes(url));
    await updateRtmpStream(egressId, added, removed);
  }

  await prisma.stream.update({
    where: { id: stream.id },
    data: { rtmpUrls: next.urls },
  });
  await writeAudit({
    actorId: input.actorId,
    action:
      parsed.data.action === "add"
        ? "stream.destination.add"
        : "stream.destination.remove",
    targetType: "stream",
    targetId: stream.id,
    metadata: {
      roomId: input.roomId,
      destination: redactRtmpUrl(parsed.data.rtmpUrl),
    },
  });
  const fresh = await prisma.stream.findUniqueOrThrow({
    where: { id: stream.id },
    include: { consents: true },
  });
  return { ok: true, stream: toStreamDto(fresh) };
}

export async function currentRoomStream(roomId: string): Promise<Stream | null> {
  const stream = await prisma.stream.findFirst({
    where: {
      roomId,
      status: { in: ["pending_consent", "starting", "active"] },
    },
    include: { consents: true },
    orderBy: { createdAt: "desc" },
  });
  return stream ? toStreamDto(stream) : null;
}

export async function getStreamForUser(input: {
  streamId: string;
  userId: string;
  orgAdmin: boolean;
}): Promise<StreamActionResult> {
  const stream = await prisma.stream.findUnique({
    where: { id: input.streamId },
    include: { consents: true, room: true },
  });
  if (!stream) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Stream not found" };
  }
  const participation = await getParticipation(stream.roomId, input.userId);
  const allowed =
    input.orgAdmin ||
    stream.room.ownerId === input.userId ||
    stream.startedById === input.userId ||
    (participation !== null &&
      !participation.banned &&
      participation.lobbyStatus === "admitted");
  if (!allowed) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "Not allowed" };
  }

  const liveStatuses = new Set([
    "starting",
    "active",
    "finishing",
    "finished",
  ]);
  const hlsUrl =
    stream.hlsPrefix && liveStatuses.has(stream.status)
      ? streamLivePlaylistUrl(stream.id)
      : null;
  return {
    ok: true,
    stream: toStreamDto(stream, { hlsUrl }),
  };
}
