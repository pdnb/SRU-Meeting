"use client";

import { useLocalParticipant } from "@livekit/components-react";
import {
  parseHandMetadata,
  serializeHandMetadata,
} from "@/lib/livekit/metadata";

export function RaiseHand() {
  const { localParticipant } = useLocalParticipant();
  const raised = Boolean(parseHandMetadata(localParticipant.metadata).handRaisedAt);

  return (
    <button
      type="button"
      className="sru-meet-btn"
      aria-pressed={raised}
      onClick={() => {
        const next = raised ? null : new Date().toISOString();
        void localParticipant.setMetadata(
          serializeHandMetadata({ handRaisedAt: next }),
        );
      }}
    >
      {raised ? "Lower hand" : "Raise hand"}
    </button>
  );
}
