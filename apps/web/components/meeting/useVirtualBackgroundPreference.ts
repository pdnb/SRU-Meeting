"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_VIRTUAL_BACKGROUND_CHOICE,
  readVirtualBackgroundPreference,
  VIRTUAL_BACKGROUND_STORAGE_KEY,
  writeVirtualBackgroundPreference,
  type VirtualBackgroundChoice,
} from "@/lib/livekit/track-preferences";

const VIRTUAL_BG_PREF_EVENT = "sru-virtual-bg-pref-change";

function subscribeVirtualBackgroundPreference(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = () => onChange();
  window.addEventListener(VIRTUAL_BG_PREF_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(VIRTUAL_BG_PREF_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

let cachedSnapshot: VirtualBackgroundChoice = DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
let cachedStorageValue: string | null | undefined;

function getVirtualBackgroundPreferenceSnapshot(): VirtualBackgroundChoice {
  if (typeof window === "undefined") {
    return DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
  }
  const raw = window.localStorage.getItem(VIRTUAL_BACKGROUND_STORAGE_KEY);
  if (raw === cachedStorageValue) {
    return cachedSnapshot;
  }
  cachedStorageValue = raw;
  cachedSnapshot = readVirtualBackgroundPreference();
  return cachedSnapshot;
}

export function useVirtualBackgroundPreference() {
  const choice = useSyncExternalStore(
    subscribeVirtualBackgroundPreference,
    getVirtualBackgroundPreferenceSnapshot,
    () => DEFAULT_VIRTUAL_BACKGROUND_CHOICE,
  );

  const setChoice = (next: VirtualBackgroundChoice) => {
    writeVirtualBackgroundPreference(next);
    window.dispatchEvent(new Event(VIRTUAL_BG_PREF_EVENT));
  };

  return [choice, setChoice] as const;
}
