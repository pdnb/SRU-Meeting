"use client";

import { useParticipants } from "@livekit/components-react";

export function ParticipantList({
  roomId,
  host,
}: {
  roomId: string;
  host: boolean;
}) {
  const participants = useParticipants();

  async function send(body: Record<string, unknown>) {
    await fetch(`/api/v1/rooms/${roomId}/moderation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <aside className="sru-meet-panel" style={{ top: "auto", bottom: "5.5rem" }}>
      <h2>People</h2>
      <ul className="m-0 list-none overflow-y-auto p-3">
        {participants.map((participant) => (
          <li
            key={participant.identity}
            className="mb-3 flex flex-wrap items-center justify-between gap-2"
          >
            <span>{participant.name || participant.identity}</span>
            {host ? (
              <span className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="sru-meet-btn"
                  onClick={() =>
                    void send({
                      action: "kick",
                      targetUserId: participant.identity,
                    })
                  }
                >
                  Kick
                </button>
                <button
                  type="button"
                  className="sru-meet-btn"
                  onClick={() =>
                    void send({
                      action: "ban",
                      targetUserId: participant.identity,
                    })
                  }
                >
                  Ban
                </button>
                <button
                  type="button"
                  className="sru-meet-btn"
                  onClick={() =>
                    void send({
                      action: "promote",
                      targetUserId: participant.identity,
                    })
                  }
                >
                  Cohost
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
