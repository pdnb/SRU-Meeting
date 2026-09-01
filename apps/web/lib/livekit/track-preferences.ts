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

export const DEFAULT_VIRTUAL_BACKGROUND_CHOICE: VirtualBackgroundChoice = {
  type: "none",
};

const BLUR_VIRTUAL_BACKGROUND_CHOICE: VirtualBackgroundChoice = { type: "blur" };

const presetChoiceCache = new Map<
  VirtualBackgroundPresetId,
  VirtualBackgroundChoice
>();

function presetVirtualBackgroundChoice(
  id: VirtualBackgroundPresetId,
): VirtualBackgroundChoice {
  let cached = presetChoiceCache.get(id);
  if (!cached) {
    cached = { type: "preset", id };
    presetChoiceCache.set(id, cached);
  }
  return cached;
}

export function parseVirtualBackgroundChoice(
  raw: string | null,
): VirtualBackgroundChoice {
  if (!raw) {
    return DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
  }
  try {
    const parsed = JSON.parse(raw) as VirtualBackgroundChoice;
    if (parsed.type === "blur") {
      return BLUR_VIRTUAL_BACKGROUND_CHOICE;
    }
    if (
      parsed.type === "preset" &&
      BACKGROUND_PRESETS.some((preset) => preset.id === parsed.id)
    ) {
      return presetVirtualBackgroundChoice(parsed.id);
    }
  } catch {
    // ignore invalid stored values
  }
  return DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
}

export function readVirtualBackgroundPreference(): VirtualBackgroundChoice {
  if (typeof window === "undefined") {
    return DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
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
export function virtualBackgroundBlurAvailable(
  virtualBackgroundSupported: boolean,
): boolean {
  return virtualBackgroundSupported && !isLikelyMobileDevice();
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
