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

export type PersistedVirtualBackgroundChoice =
  | { type: "none" }
  | { type: "blur" }
  | { type: "preset"; id: VirtualBackgroundPresetId }
  | { type: "org"; id: string };

export type VirtualBackgroundChoice =
  | PersistedVirtualBackgroundChoice
  | { type: "custom"; objectUrl: string };

export const DEFAULT_VIRTUAL_BACKGROUND_CHOICE: PersistedVirtualBackgroundChoice =
  {
    type: "none",
  };

const BLUR_VIRTUAL_BACKGROUND_CHOICE: PersistedVirtualBackgroundChoice = {
  type: "blur",
};

const presetChoiceCache = new Map<
  VirtualBackgroundPresetId,
  PersistedVirtualBackgroundChoice
>();

function presetVirtualBackgroundChoice(
  id: VirtualBackgroundPresetId,
): PersistedVirtualBackgroundChoice {
  let cached = presetChoiceCache.get(id);
  if (!cached) {
    cached = { type: "preset", id };
    presetChoiceCache.set(id, cached);
  }
  return cached;
}

export function isPersistedVirtualBackgroundChoice(
  choice: VirtualBackgroundChoice,
): choice is PersistedVirtualBackgroundChoice {
  return choice.type !== "custom";
}

export function parseVirtualBackgroundChoice(
  raw: string | null,
): PersistedVirtualBackgroundChoice {
  if (!raw) {
    return DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
  }
  try {
    const parsed = JSON.parse(raw) as VirtualBackgroundChoice;
    if (parsed.type === "custom") {
      return DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
    }
    if (parsed.type === "blur") {
      return BLUR_VIRTUAL_BACKGROUND_CHOICE;
    }
    if (
      parsed.type === "preset" &&
      BACKGROUND_PRESETS.some((preset) => preset.id === parsed.id)
    ) {
      return presetVirtualBackgroundChoice(parsed.id);
    }
    if (
      parsed.type === "org" &&
      typeof parsed.id === "string" &&
      parsed.id.length > 0
    ) {
      return { type: "org", id: parsed.id };
    }
  } catch {
    // ignore invalid stored values
  }
  return DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
}

export function readVirtualBackgroundPreference(): PersistedVirtualBackgroundChoice {
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
  if (typeof window === "undefined" || choice.type === "custom") {
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

export function orgBackgroundImageUrl(id: string): string {
  const path = `/api/v1/backgrounds/org/${encodeURIComponent(id)}/image`;
  if (typeof window === "undefined") {
    return path;
  }
  return new URL(path, window.location.origin).href;
}

export function virtualBackgroundChoiceLabel(
  choice: VirtualBackgroundChoice,
  orgLabel?: string,
): string {
  if (choice.type === "none") {
    return "None";
  }
  if (choice.type === "blur") {
    return "Blur";
  }
  if (choice.type === "custom") {
    return "Custom image";
  }
  if (choice.type === "org") {
    return orgLabel ?? "Organization";
  }
  return (
    BACKGROUND_PRESETS.find((preset) => preset.id === choice.id)?.label ??
    "Preset"
  );
}

export const MAX_BACKGROUND_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_BACKGROUND_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function assertClientBackgroundImageAllowed(file: {
  size: number;
  type: string;
}): { ok: true } | { ok: false; message: string } {
  if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
    return {
      ok: false,
      message: "Background images must be 5 MB or smaller",
    };
  }
  if (!ALLOWED_BACKGROUND_IMAGE_TYPES.has(file.type)) {
    return {
      ok: false,
      message: "Only JPEG, PNG, or WebP images are allowed",
    };
  }
  return { ok: true };
}
