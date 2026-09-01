import { VideoPresets, type RoomConnectOptions, type RoomOptions } from "livekit-client";

export function isLocalLiveKitUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

/** Windows Docker Desktop drops host-mapped ICE/UDP. Force TURN/TCP locally. */
export function connectOptionsForLiveKitUrl(url: string): RoomConnectOptions {
  if (!isLocalLiveKitUrl(url)) {
    return { peerConnectionTimeout: 15_000 };
  }
  return {
    peerConnectionTimeout: 45_000,
    rtcConfig: {
      iceTransportPolicy: "relay",
    },
  };
}

export function networkPrefersLowBandwidth(hints?: {
  saveData?: boolean;
  effectiveType?: string;
}): boolean {
  if (hints?.saveData) {
    return true;
  }
  return (
    hints?.effectiveType === "slow-2g" ||
    hints?.effectiveType === "2g" ||
    hints?.effectiveType === "3g" ||
    hints?.effectiveType === "4g"
  );
}

export function roomOptionsForNetwork(hints?: {
  saveData?: boolean;
  effectiveType?: string;
}): RoomOptions {
  if (!networkPrefersLowBandwidth(hints)) {
    return {};
  }
  return {
    videoCaptureDefaults: {
      resolution: VideoPresets.h360.resolution,
    },
    publishDefaults: {
      videoEncoding: VideoPresets.h360.encoding,
      screenShareEncoding: VideoPresets.h720.encoding,
    },
  };
}

export function readBrowserNetworkHints(): {
  saveData?: boolean;
  effectiveType?: string;
} {
  if (typeof navigator === "undefined") {
    return {};
  }
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return {
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
  };
}
