"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { isScreenShareSupported } from "@/lib/livekit/screen-share";

export function ScreenShareButton({ e2eeEnabled = false }: { e2eeEnabled?: boolean }) {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  const supported = isScreenShareSupported();

  if (!supported) {
    return (
      <span role="status" className="text-sm text-zinc-400">
        Screen share is not available in this browser
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {e2eeEnabled ? (
        <p role="status" className="text-xs text-amber-300">
          Screen share is not encrypted in E2EE meetings.
        </p>
      ) : null}
      <button
        type="button"
        className="sru-meet-btn"
        aria-pressed={isScreenShareEnabled}
        onClick={() => {
          void localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
        }}
      >
        {isScreenShareEnabled ? "Stop share" : "Share screen"}
      </button>
    </div>
  );
}
