"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { LocalVideoTrack, Track } from "livekit-client";
import { useEffect } from "react";
import { useVirtualBackgroundPreference } from "@/components/meeting/useVirtualBackgroundPreference";
import {
  applyVirtualBackgroundToTrack,
  isVirtualBackgroundSupported,
} from "@/lib/livekit/track-processors";

/** Keeps the local camera background effect in sync with stored preference. */
export function LocalVideoBackgroundSync() {
  const { localParticipant, cameraTrack, isCameraEnabled } =
    useLocalParticipant();
  const [choice] = useVirtualBackgroundPreference();
  const supported = isVirtualBackgroundSupported();

  useEffect(() => {
    if (!supported || !isCameraEnabled) {
      return;
    }
    const track = cameraTrack?.track ?? localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (!(track instanceof LocalVideoTrack)) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await applyVirtualBackgroundToTrack(track, choice);
      } catch {
        if (!cancelled) {
          // Processor attach can fail on unsupported browsers; degrade silently.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cameraTrack, choice, isCameraEnabled, localParticipant, supported]);

  return null;
}
