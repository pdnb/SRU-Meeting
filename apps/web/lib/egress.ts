import "server-only";

import {
  DirectFileOutput,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
  SegmentedFileOutput,
  SegmentedFileProtocol,
  StreamOutput,
  StreamProtocol,
} from "livekit-server-sdk";
import { getServerEnv, recordingsBucket } from "@/lib/env";
import { livekitHttpUrl } from "@/lib/livekit/room-service";

export type StartedEgress = {
  egressId: string;
  objectKey: string;
  hlsPrefix: string | null;
};

function s3Upload(): S3Upload {
  const env = getServerEnv();
  const bucket = recordingsBucket();
  if (!env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || !bucket) {
    throw new Error("Recording storage is not configured");
  }
  return new S3Upload({
    accessKey: env.S3_ACCESS_KEY,
    secret: env.S3_SECRET_KEY,
    region: env.S3_REGION ?? "us-east-1",
    endpoint: env.S3_INTERNAL_ENDPOINT || env.S3_ENDPOINT || "",
    bucket,
    forcePathStyle: true,
  });
}

export function getEgressClient(): EgressClient | null {
  const env = getServerEnv();
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return null;
  }
  return new EgressClient(
    livekitHttpUrl(env.LIVEKIT_URL),
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );
}

export function recordingObjectKey(roomId: string, recordingId: string): string {
  return `recordings/${roomId}/${recordingId}.mp4`;
}

export function recordingHlsPrefix(roomId: string, recordingId: string): string {
  return `recordings/${roomId}/${recordingId}/`;
}

export function recordingHlsPlaylistKey(
  roomId: string,
  recordingId: string,
): string {
  return `${recordingHlsPrefix(roomId, recordingId)}index.m3u8`;
}

export const STREAM_LIVE_PLAYLIST_NAME = "live.m3u8";

export function streamHlsPrefix(roomId: string, streamId: string): string {
  return `streams/${roomId}/${streamId}/`;
}

export function streamLivePlaylistConfig(hlsPrefix: string): {
  filenamePrefix: string;
  playlistName: string;
  livePlaylistName: string;
} {
  return {
    filenamePrefix: `${hlsPrefix}seg`,
    playlistName: "index.m3u8",
    livePlaylistName: STREAM_LIVE_PLAYLIST_NAME,
  };
}

export function streamLivePlaylistKey(
  roomId: string,
  streamId: string,
): string {
  return `${streamHlsPrefix(roomId, streamId)}${STREAM_LIVE_PLAYLIST_NAME}`;
}

export async function startCompositeEgress(input: {
  roomId: string;
  recordingId: string;
}): Promise<StartedEgress> {
  const client = getEgressClient();
  if (!client) {
    throw new Error("LiveKit egress is not configured");
  }
  const objectKey = recordingObjectKey(input.roomId, input.recordingId);
  const hlsPrefix = recordingHlsPrefix(input.roomId, input.recordingId);
  const file = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: objectKey,
    disableManifest: true,
    output: { case: "s3", value: s3Upload() },
  });
  const segments = new SegmentedFileOutput({
    filenamePrefix: `${hlsPrefix}seg`,
    playlistName: "index.m3u8",
    protocol: SegmentedFileProtocol.HLS_PROTOCOL,
    output: { case: "s3", value: s3Upload() },
  });
  const info = await client.startRoomCompositeEgress(
    input.roomId,
    { file, segments },
    { layout: "grid" },
  );
  return {
    egressId: info.egressId,
    objectKey,
    hlsPrefix,
  };
}

export async function startTrackFileEgress(input: {
  roomId: string;
  recordingId: string;
  trackId: string;
}): Promise<StartedEgress> {
  const client = getEgressClient();
  if (!client) {
    throw new Error("LiveKit egress is not configured");
  }
  const objectKey = `recordings/${input.roomId}/${input.recordingId}/${input.trackId}.mp4`;
  const file = new DirectFileOutput({
    filepath: objectKey,
    output: { case: "s3", value: s3Upload() },
  });
  const info = await client.startTrackEgress(input.roomId, file, input.trackId);
  return { egressId: info.egressId, objectKey, hlsPrefix: null };
}

export async function startRtmpRoomCompositeEgress(input: {
  roomId: string;
  urls: string[];
  hlsPrefix?: string | null;
}): Promise<{ egressId: string; hlsPrefix: string | null }> {
  const client = getEgressClient();
  if (!client) {
    throw new Error("LiveKit egress is not configured");
  }
  // LiveKit StreamOutput RTMP + optional HLS live playlist:
  // https://docs.livekit.io/transport/media/ingress-egress/egress/outputs/
  // https://docs.livekit.io/reference/other/egress/api/
  // Empty stream urls are valid so a later updateStream can add RTMP.
  const stream = new StreamOutput({
    protocol: StreamProtocol.RTMP,
    urls: input.urls,
  });
  const hlsPrefix = input.hlsPrefix ?? null;
  const output = hlsPrefix
    ? {
        stream,
        segments: new SegmentedFileOutput({
          ...streamLivePlaylistConfig(hlsPrefix),
          protocol: SegmentedFileProtocol.HLS_PROTOCOL,
          output: { case: "s3" as const, value: s3Upload() },
        }),
      }
    : { stream };
  const info = await client.startRoomCompositeEgress(input.roomId, output, {
    layout: "grid",
  });
  return { egressId: info.egressId, hlsPrefix };
}

export async function updateRtmpStream(
  egressId: string,
  addOutputUrls: string[] = [],
  removeOutputUrls: string[] = [],
): Promise<void> {
  const client = getEgressClient();
  if (!client) {
    throw new Error("LiveKit egress is not configured");
  }
  await client.updateStream(egressId, addOutputUrls, removeOutputUrls);
}

export async function stopEgressById(egressId: string): Promise<void> {
  const client = getEgressClient();
  if (!client) {
    throw new Error("LiveKit egress is not configured");
  }
  await client.stopEgress(egressId);
}
