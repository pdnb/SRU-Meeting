"use client";

import { useSyncExternalStore } from "react";
import {
  readNoiseSuppressionPreference,
  writeNoiseSuppressionPreference,
} from "@/lib/livekit/track-preferences";

const NOISE_PREF_EVENT = "sru-noise-pref-change";

function subscribeNoisePreference(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = () => onChange();
  window.addEventListener(NOISE_PREF_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(NOISE_PREF_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useNoiseSuppressionPreference() {
  const enabled = useSyncExternalStore(
    subscribeNoisePreference,
    () => readNoiseSuppressionPreference(),
    () => false,
  );

  const setEnabled = (next: boolean) => {
    writeNoiseSuppressionPreference(next);
    window.dispatchEvent(new Event(NOISE_PREF_EVENT));
  };

  return [enabled, setEnabled] as const;
}
