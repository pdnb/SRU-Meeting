"use client";

import { useEffect, useState } from "react";

type TrackProcessorSupport = {
  noiseSuppression: boolean;
  virtualBackground: boolean;
};

const DEFAULT_SUPPORT: TrackProcessorSupport = {
  noiseSuppression: false,
  virtualBackground: false,
};

/** Loads LiveKit processor support checks on the client without SSR worker imports. */
export function useTrackProcessorSupport(): TrackProcessorSupport {
  const [support, setSupport] = useState(DEFAULT_SUPPORT);

  useEffect(() => {
    void import("@/lib/livekit/track-processors").then((module) => {
      setSupport({
        noiseSuppression: module.isNoiseSuppressionSupported(),
        virtualBackground: module.isVirtualBackgroundSupported(),
      });
    });
  }, []);

  return support;
}
