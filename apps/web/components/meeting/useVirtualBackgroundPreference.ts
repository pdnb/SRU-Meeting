"use client";

import { useSyncExternalStore } from "react";
import {
  readVirtualBackgroundPreference,
  writeVirtualBackgroundPreference,
  type VirtualBackgroundChoice,
} from "@/lib/livekit/track-processors";

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

export function useVirtualBackgroundPreference() {
  const choice = useSyncExternalStore(
    subscribeVirtualBackgroundPreference,
    () => readVirtualBackgroundPreference(),
    () => ({ type: "none" }) as VirtualBackgroundChoice,
  );

  const setChoice = (next: VirtualBackgroundChoice) => {
    writeVirtualBackgroundPreference(next);
    window.dispatchEvent(new Event(VIRTUAL_BG_PREF_EVENT));
  };

  return [choice, setChoice] as const;
}
