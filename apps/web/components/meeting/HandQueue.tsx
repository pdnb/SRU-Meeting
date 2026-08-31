"use client";

import { useParticipants } from "@livekit/components-react";
import { parseHandMetadata, sortHandQueue } from "@/lib/livekit/metadata";

export function HandQueue() {
  const participants = useParticipants();
  const queue = sortHandQueue(
    participants
      .map((participant) => {
        const raisedAt = parseHandMetadata(participant.metadata).handRaisedAt;
        if (!raisedAt) return null;
        return {
          identity: participant.identity,
          name: participant.name || participant.identity,
          raisedAt,
        };
      })
      .filter((row): row is { identity: string; name: string; raisedAt: string } =>
        Boolean(row),
      ),
  );

  if (queue.length === 0) {
    return null;
  }

  return (
    <aside className="sru-meet-panel" style={{ left: "0.75rem", right: "auto" }}>
      <h2>Hands</h2>
      <ol className="m-0 list-decimal overflow-y-auto py-3 pr-3 pl-8">
        {queue.map((entry) => (
          <li key={entry.identity} className="mb-2">
            {entry.name}
          </li>
        ))}
      </ol>
    </aside>
  );
}
