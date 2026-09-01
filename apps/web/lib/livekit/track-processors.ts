import {
  isKrispNoiseFilterSupported,
  KrispNoiseFilter,
  type KrispNoiseFilterProcessor,
} from "@livekit/krisp-noise-filter";
import {
  BackgroundProcessor,
  supportsBackgroundProcessors,
  type BackgroundProcessorWrapper,
} from "@livekit/track-processors";
import type { LocalAudioTrack, LocalVideoTrack } from "livekit-client";
import {
  BACKGROUND_PRESETS,
  DEFAULT_BLUR_RADIUS,
  presetImageUrl,
  virtualBackgroundBlurAvailable as virtualBackgroundBlurAvailableWhenSupported,
  type VirtualBackgroundChoice,
} from "@/lib/livekit/track-preferences";

export {
  BACKGROUND_PRESETS,
  DEFAULT_BLUR_RADIUS,
  DEFAULT_VIRTUAL_BACKGROUND_CHOICE,
  NOISE_SUPPRESSION_STORAGE_KEY,
  VIRTUAL_BACKGROUND_STORAGE_KEY,
  parseVirtualBackgroundChoice,
  presetImageUrl,
  readNoiseSuppressionPreference,
  readVirtualBackgroundPreference,
  shouldShowBackgroundPerformanceHint,
  virtualBackgroundChoiceLabel,
  writeNoiseSuppressionPreference,
  writeVirtualBackgroundPreference,
  type VirtualBackgroundChoice,
  type VirtualBackgroundPresetId,
} from "@/lib/livekit/track-preferences";

export function isNoiseSuppressionSupported(): boolean {
  try {
    return isKrispNoiseFilterSupported();
  } catch {
    return false;
  }
}

let sharedNoiseProcessor: KrispNoiseFilterProcessor | undefined;

export function getSharedNoiseProcessor(): KrispNoiseFilterProcessor {
  sharedNoiseProcessor ??= KrispNoiseFilter();
  return sharedNoiseProcessor;
}

/** Attach the shared Krisp processor and enable or bypass without unpublishing. */
export async function applyNoiseSuppressionToTrack(
  track: LocalAudioTrack,
  enabled: boolean,
  processor: KrispNoiseFilterProcessor = getSharedNoiseProcessor(),
): Promise<void> {
  if (!track.getProcessor()) {
    await track.setProcessor(processor);
  }
  await processor.setEnabled(enabled);
}

/** Disable filtering while keeping the processor attached to avoid reconnect artifacts. */
export async function removeNoiseSuppressionFromTrack(
  track: LocalAudioTrack,
  processor: KrispNoiseFilterProcessor = getSharedNoiseProcessor(),
): Promise<void> {
  if (track.getProcessor()) {
    await processor.setEnabled(false);
  }
}

export function isVirtualBackgroundSupported(): boolean {
  try {
    return supportsBackgroundProcessors();
  } catch {
    return false;
  }
}

export function virtualBackgroundBlurAvailable(): boolean {
  return virtualBackgroundBlurAvailableWhenSupported(
    isVirtualBackgroundSupported(),
  );
}

let sharedBackgroundProcessor: BackgroundProcessorWrapper | undefined;

export function getSharedBackgroundProcessor(): BackgroundProcessorWrapper {
  sharedBackgroundProcessor ??= BackgroundProcessor({ mode: "disabled" });
  return sharedBackgroundProcessor;
}

/** Switch the shared background processor without unpublishing the camera track. */
export async function applyVirtualBackgroundChoice(
  choice: VirtualBackgroundChoice,
  processor: BackgroundProcessorWrapper = getSharedBackgroundProcessor(),
): Promise<void> {
  if (choice.type === "none") {
    await processor.switchTo({ mode: "disabled" });
    return;
  }
  if (choice.type === "blur") {
    await processor.switchTo({
      mode: "background-blur",
      blurRadius: DEFAULT_BLUR_RADIUS,
    });
    return;
  }
  const preset = BACKGROUND_PRESETS.find((item) => item.id === choice.id);
  if (!preset) {
    await processor.switchTo({ mode: "disabled" });
    return;
  }
  await processor.switchTo({
    mode: "virtual-background",
    imagePath: presetImageUrl(preset.path),
  });
}

/** Attach the shared background processor and switch modes without unpublishing. */
export async function applyVirtualBackgroundToTrack(
  track: LocalVideoTrack,
  choice: VirtualBackgroundChoice,
  processor: BackgroundProcessorWrapper = getSharedBackgroundProcessor(),
): Promise<void> {
  if (!track.getProcessor()) {
    await track.setProcessor(processor);
  }
  await applyVirtualBackgroundChoice(choice, processor);
}
