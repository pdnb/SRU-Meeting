"use client";

import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import { useEffect, useRef } from "react";
import {
  readNoiseSuppressionPreference,
  writeNoiseSuppressionPreference,
} from "@/lib/livekit/track-preferences";
import { useTrackProcessorSupport } from "@/components/meeting/useTrackProcessorSupport";

export function NoiseSuppressionControl({
  showUnsupportedNotice = false,
}: {
  showUnsupportedNotice?: boolean;
}) {
  const { noiseSuppression: supported } = useTrackProcessorSupport();
  const krisp = useKrispNoiseFilter();
  const appliedPreference = useRef(false);

  useEffect(() => {
    if (!supported || appliedPreference.current) {
      return;
    }
    appliedPreference.current = true;
    const preferred = readNoiseSuppressionPreference();
    if (preferred) {
      void krisp.setNoiseFilterEnabled(true);
    }
  }, [krisp, supported]);

  if (!supported) {
    if (!showUnsupportedNotice) {
      return null;
    }
    return (
      <p className="text-caption text-zinc-400">
        Noise reduction is not available in this browser. You can still join
        with your microphone.
      </p>
    );
  }

  return (
    <button
      type="button"
      className="sru-meet-btn"
      aria-pressed={krisp.isNoiseFilterEnabled}
      disabled={krisp.isNoiseFilterPending}
      onClick={() => {
        const next = !krisp.isNoiseFilterEnabled;
        writeNoiseSuppressionPreference(next);
        void krisp.setNoiseFilterEnabled(next);
      }}
    >
      {krisp.isNoiseFilterEnabled ? "Noise reduction on" : "Reduce noise"}
    </button>
  );
}
