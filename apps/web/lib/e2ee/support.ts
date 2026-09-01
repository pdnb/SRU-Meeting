import {
  isE2EESupported,
  isInsertableStreamSupported,
  isScriptTransformSupported,
  getBrowser,
  type RoomOptions,
} from "livekit-client";
import type { ParticipantKeyProvider } from "./keys";

export type E2eeBrowserSupport = {
  insertableStreams: boolean;
  scriptTransform: boolean;
  supported: boolean;
  browser: ReturnType<typeof getBrowser>;
  isSafari: boolean;
  isMobile: boolean;
};

export function detectE2eeBrowserSupport(): E2eeBrowserSupport {
  const browser = getBrowser();
  const ua =
    typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isSafari =
    browser?.name === "Safari" ||
    (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium"));
  const isMobile =
    typeof navigator !== "undefined" &&
    /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  const insertableStreams = isInsertableStreamSupported();
  const scriptTransform = isScriptTransformSupported();
  return {
    insertableStreams,
    scriptTransform,
    supported: isE2EESupported(),
    browser,
    isSafari,
    isMobile,
  };
}

export function getE2eeBlockReason(
  support: E2eeBrowserSupport = detectE2eeBrowserSupport(),
): string | null {
  if (support.isMobile) {
    return "End-to-end encryption is not supported on mobile browsers in v1. Join from desktop Chrome or Edge.";
  }
  if (support.isSafari) {
    return "Safari does not support the Insertable Streams APIs required for end-to-end encryption. Use Chrome or Edge on desktop.";
  }
  if (!support.supported) {
    return "This browser does not support Insertable Streams or RTCRtpScriptTransform, which are required for end-to-end encryption.";
  }
  return null;
}

export function createE2eeWorker(): Worker | null {
  if (typeof Worker === "undefined") {
    return null;
  }
  try {
    return new Worker(
      new URL("livekit-client/e2ee-worker", import.meta.url),
      { type: "module" },
    );
  } catch {
    return null;
  }
}

export function buildE2eeRoomOptions(
  keyProvider: ParticipantKeyProvider,
): RoomOptions | null {
  const worker = createE2eeWorker();
  if (!worker) {
    return null;
  }
  return {
    encryption: {
      keyProvider,
      worker,
    },
  };
}
