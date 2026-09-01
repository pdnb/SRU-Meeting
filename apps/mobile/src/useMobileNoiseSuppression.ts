import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/react-native";
import { LocalAudioTrack } from "livekit-client";
import {
  KrispNoiseFilter,
  isKrispNoiseFilterSupported,
  type KrispNoiseFilterProcessor,
} from "@livekit/react-native-krisp-noise-filter";
import {
  attachMobileNoiseSuppression,
  readNoiseSuppressionPreference,
  writeNoiseSuppressionPreference,
} from "./noise-suppression";

export function useMobileNoiseSuppression() {
  const { microphoneTrack, isMicrophoneEnabled } = useLocalParticipant();
  const [enabled, setEnabled] = useState(() => readNoiseSuppressionPreference());
  const [pending, setPending] = useState(false);
  const processorRef = useRef<KrispNoiseFilterProcessor | undefined>();
  const supported = useMemo(() => {
    try {
      return isKrispNoiseFilterSupported();
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const track = microphoneTrack?.track;
    if (!(track instanceof LocalAudioTrack) || !supported) {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      setPending(true);
      try {
        processorRef.current ??= KrispNoiseFilter();
        await attachMobileNoiseSuppression({
          createProcessor: () => processorRef.current!,
          getProcessor: () => track.getProcessor(),
          setProcessor: (processor) => track.setProcessor(processor as never),
          enabled,
        });
      } catch {
        // Native module missing or attach failed — join continues without filtering.
      } finally {
        if (!cancelled) {
          setPending(false);
        }
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [enabled, microphoneTrack?.track, supported]);

  return {
    supported,
    enabled,
    pending,
    isMicrophoneEnabled,
    setEnabled: (next: boolean) => {
      writeNoiseSuppressionPreference(next);
      setEnabled(next);
    },
  };
}
