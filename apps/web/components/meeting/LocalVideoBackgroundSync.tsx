"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { LocalVideoTrack, Track } from "livekit-client";
import { useEffect } from "react";
import { useVirtualBackgroundPreference } from "@/components/meeting/useVirtualBackgroundPreference";
import { useTrackProcessorSupport } from "@/components/meeting/useTrackProcessorSupport";

/** Keeps the local camera background effect in sync with stored preference. */
export function LocalVideoBackgroundSync() {
  const { localParticipant, cameraTrack, isCameraEnabled } =
    useLocalParticipant();
  const [choice] = useVirtualBackgroundPreference();
  const { virtualBackground: supported } = useTrackProcessorSupport();

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
        const { applyVirtualBackgroundToTrack } = await import(
          "@/lib/livekit/track-processors"
        );
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
