"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  assertClientBackgroundImageAllowed,
  DEFAULT_VIRTUAL_BACKGROUND_CHOICE,
  readVirtualBackgroundPreference,
  VIRTUAL_BACKGROUND_STORAGE_KEY,
  writeVirtualBackgroundPreference,
  type PersistedVirtualBackgroundChoice,
  type VirtualBackgroundChoice,
} from "@/lib/livekit/track-preferences";

export const VIRTUAL_BG_PREF_EVENT = "sru-virtual-bg-pref-change";

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

let cachedPersistedSnapshot: PersistedVirtualBackgroundChoice =
  DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
let cachedStorageValue: string | null | undefined;

function getPersistedSnapshot(): PersistedVirtualBackgroundChoice {
  if (typeof window === "undefined") {
    return DEFAULT_VIRTUAL_BACKGROUND_CHOICE;
  }
  const raw = window.localStorage.getItem(VIRTUAL_BACKGROUND_STORAGE_KEY);
  if (raw === cachedStorageValue) {
    return cachedPersistedSnapshot;
  }
  cachedStorageValue = raw;
  cachedPersistedSnapshot = readVirtualBackgroundPreference();
  return cachedPersistedSnapshot;
}

let sessionCustomChoice: Extract<VirtualBackgroundChoice, { type: "custom" }> | null =
  null;

function getEffectiveSnapshot(): VirtualBackgroundChoice {
  return sessionCustomChoice ?? getPersistedSnapshot();
}

function notifyVirtualBackgroundChange() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(VIRTUAL_BG_PREF_EVENT));
}

function revokeSessionCustomUrl() {
  if (sessionCustomChoice?.objectUrl.startsWith("blob:")) {
    URL.revokeObjectURL(sessionCustomChoice.objectUrl);
  }
}

export function clearSessionCustomBackground() {
  if (!sessionCustomChoice) {
    return;
  }
  revokeSessionCustomUrl();
  sessionCustomChoice = null;
  notifyVirtualBackgroundChange();
}

export function useVirtualBackgroundPreference() {
  const persistedChoice = useSyncExternalStore(
    subscribeVirtualBackgroundPreference,
    getPersistedSnapshot,
    () => DEFAULT_VIRTUAL_BACKGROUND_CHOICE,
  );

  const choice = useSyncExternalStore(
    subscribeVirtualBackgroundPreference,
    getEffectiveSnapshot,
    () => DEFAULT_VIRTUAL_BACKGROUND_CHOICE,
  );

  const setChoice = useCallback((next: VirtualBackgroundChoice) => {
    if (next.type === "custom") {
      revokeSessionCustomUrl();
      sessionCustomChoice = next;
      notifyVirtualBackgroundChange();
      return;
    }
    revokeSessionCustomUrl();
    sessionCustomChoice = null;
    writeVirtualBackgroundPreference(next);
    notifyVirtualBackgroundChange();
  }, []);

  const setSessionCustomFromFile = useCallback(
    (file: File): { ok: true } | { ok: false; message: string } => {
      const allowed = assertClientBackgroundImageAllowed({
        size: file.size,
        type: file.type,
      });
      if (!allowed.ok) {
        return allowed;
      }
      const objectUrl = URL.createObjectURL(file);
      setChoice({ type: "custom", objectUrl });
      return { ok: true };
    },
    [setChoice],
  );

  return {
    choice,
    persistedChoice,
    setChoice,
    setSessionCustomFromFile,
    clearSessionCustom: clearSessionCustomBackground,
    isSessionCustom: choice.type === "custom",
  } as const;
}
