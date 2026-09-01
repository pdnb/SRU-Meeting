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

export const NOISE_SUPPRESSION_STORAGE_KEY = "sru-noise-suppression";

export function readNoiseSuppressionPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(NOISE_SUPPRESSION_STORAGE_KEY) === "1";
}

export function writeNoiseSuppressionPreference(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    NOISE_SUPPRESSION_STORAGE_KEY,
    enabled ? "1" : "0",
  );
}

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

export const VIRTUAL_BACKGROUND_STORAGE_KEY = "sru-virtual-background";
export const DEFAULT_BLUR_RADIUS = 10;

export const BACKGROUND_PRESETS = [
  { id: "office", label: "Office", path: "/backgrounds/office.jpg" },
  { id: "nature", label: "Nature", path: "/backgrounds/nature.jpg" },
  { id: "abstract", label: "Abstract", path: "/backgrounds/abstract.jpg" },
] as const;

export type VirtualBackgroundPresetId =
  (typeof BACKGROUND_PRESETS)[number]["id"];

export type VirtualBackgroundChoice =
  | { type: "none" }
  | { type: "blur" }
  | { type: "preset"; id: VirtualBackgroundPresetId };

export function parseVirtualBackgroundChoice(
  raw: string | null,
): VirtualBackgroundChoice {
  if (!raw) {
    return { type: "none" };
  }
  try {
    const parsed = JSON.parse(raw) as VirtualBackgroundChoice;
    if (parsed.type === "blur") {
      return { type: "blur" };
    }
    if (
      parsed.type === "preset" &&
      BACKGROUND_PRESETS.some((preset) => preset.id === parsed.id)
    ) {
      return parsed;
    }
  } catch {
    // ignore invalid stored values
  }
  return { type: "none" };
}

export function readVirtualBackgroundPreference(): VirtualBackgroundChoice {
  if (typeof window === "undefined") {
    return { type: "none" };
  }
  return parseVirtualBackgroundChoice(
    window.localStorage.getItem(VIRTUAL_BACKGROUND_STORAGE_KEY),
  );
}

export function writeVirtualBackgroundPreference(
  choice: VirtualBackgroundChoice,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    VIRTUAL_BACKGROUND_STORAGE_KEY,
    JSON.stringify(choice),
  );
}

export function isVirtualBackgroundSupported(): boolean {
  try {
    return supportsBackgroundProcessors();
  } catch {
    return false;
  }
}

export function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return (navigator.hardwareConcurrency ?? 8) <= 4;
}

export function isLikelyMobileDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Blur is disabled on mobile to reduce CPU and battery drain. */
export function virtualBackgroundBlurAvailable(): boolean {
  return isVirtualBackgroundSupported() && !isLikelyMobileDevice();
}

export function shouldShowBackgroundPerformanceHint(
  choice: VirtualBackgroundChoice,
): boolean {
  return choice.type !== "none" && isLowEndDevice();
}

export function presetImageUrl(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }
  return new URL(path, window.location.origin).href;
}

export function virtualBackgroundChoiceLabel(
  choice: VirtualBackgroundChoice,
): string {
  if (choice.type === "none") {
    return "None";
  }
  if (choice.type === "blur") {
    return "Blur";
  }
  return (
    BACKGROUND_PRESETS.find((preset) => preset.id === choice.id)?.label ??
    "Preset"
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
