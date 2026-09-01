import { VideoPresets, type RoomOptions } from "livekit-client";

/** Cap camera publish resolution while E2EE is active (Task 83). */
export const E2EE_MAX_VIDEO_RESOLUTION = VideoPresets.h720.resolution;

/**
 * Screen share is intentionally left unencrypted in v1 because composite
 * egress and many receivers expect decoded frames. Camera and microphone
 * tracks remain encrypted via Insertable Streams.
 */
export const E2EE_SCREEN_SHARE_PLAINTEXT = true as const;

export function applyE2eeVideoLimits(options: RoomOptions): RoomOptions {
  return {
    ...options,
    videoCaptureDefaults: {
      ...options.videoCaptureDefaults,
      resolution: E2EE_MAX_VIDEO_RESOLUTION,
    },
    publishDefaults: {
      ...options.publishDefaults,
      videoEncoding: VideoPresets.h720.encoding,
      screenShareEncoding: VideoPresets.h720.encoding,
    },
  };
}

export function mergeE2eeRoomOptions(
  base: RoomOptions,
  e2ee: RoomOptions | null,
): RoomOptions {
  if (!e2ee) {
    return base;
  }
  return applyE2eeVideoLimits({
    ...base,
    ...e2ee,
    videoCaptureDefaults: {
      ...base.videoCaptureDefaults,
      ...e2ee.videoCaptureDefaults,
    },
    publishDefaults: {
      ...base.publishDefaults,
      ...e2ee.publishDefaults,
    },
  });
}
