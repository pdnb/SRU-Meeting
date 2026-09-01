"use client";

import {
  BACKGROUND_PRESETS,
  isVirtualBackgroundSupported,
  shouldShowBackgroundPerformanceHint,
  virtualBackgroundBlurAvailable,
  virtualBackgroundChoiceLabel,
  type VirtualBackgroundChoice,
  type VirtualBackgroundPresetId,
} from "@/lib/livekit/track-processors";
import { useVirtualBackgroundPreference } from "@/components/meeting/useVirtualBackgroundPreference";

function choiceFromSelectValue(value: string): VirtualBackgroundChoice {
  if (value === "none") {
    return { type: "none" };
  }
  if (value === "blur") {
    return { type: "blur" };
  }
  if (BACKGROUND_PRESETS.some((preset) => preset.id === value)) {
    return { type: "preset", id: value as VirtualBackgroundPresetId };
  }
  return { type: "none" };
}

function selectValueFromChoice(choice: VirtualBackgroundChoice): string {
  if (choice.type === "none") {
    return "none";
  }
  if (choice.type === "blur") {
    return "blur";
  }
  return choice.id;
}

export function VirtualBackgroundControl({
  showUnsupportedNotice = false,
  compact = false,
}: {
  showUnsupportedNotice?: boolean;
  compact?: boolean;
}) {
  const supported = isVirtualBackgroundSupported();
  const blurAvailable = virtualBackgroundBlurAvailable();
  const [choice, setChoice] = useVirtualBackgroundPreference();

  if (!supported) {
    if (!showUnsupportedNotice) {
      return null;
    }
    return (
      <p className="text-caption text-zinc-400">
        Virtual backgrounds are not available in this browser.
      </p>
    );
  }

  const showHint = shouldShowBackgroundPerformanceHint(choice);

  return (
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
      <label
        htmlFor={compact ? "virtual-bg-prejoin" : "virtual-bg-meeting"}
        className={compact ? "sr-only" : "sru-label"}
      >
        Background
      </label>
      <select
        id={compact ? "virtual-bg-prejoin" : "virtual-bg-meeting"}
        className="sru-input max-w-xs"
        value={selectValueFromChoice(choice)}
        onChange={(event) => {
          setChoice(choiceFromSelectValue(event.target.value));
        }}
        aria-label={`Background: ${virtualBackgroundChoiceLabel(choice)}`}
      >
        <option value="none">No background effect</option>
        {blurAvailable ? (
          <option value="blur">Blur background</option>
        ) : null}
        {BACKGROUND_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
      {showHint || (!blurAvailable && choice.type === "blur") ? (
        <p className="text-caption text-amber-300/90" role="status">
          {!blurAvailable && choice.type === "blur"
            ? "Background blur is disabled on mobile to save battery."
            : "Background effects use extra CPU on this device. Turn off blur or presets if video stutters."}
        </p>
      ) : null}
    </div>
  );
}
