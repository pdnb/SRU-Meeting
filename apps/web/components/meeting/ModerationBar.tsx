"use client";

import { useParticipants } from "@livekit/components-react";
import { Track } from "livekit-client";

export function ModerationBar({ roomId }: { roomId: string }) {
  const participants = useParticipants();

  async function send(body: Record<string, unknown>) {
    await fetch(`/api/v1/rooms/${roomId}/moderation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div role="group" aria-label="Moderator media">
      <button
        type="button"
        className="sru-meet-btn"
        onClick={() => void send({ action: "mute_all" })}
      >
        Mute all
      </button>
      {participants.map((participant) => {
        const mic = participant.getTrackPublication(Track.Source.Microphone);
        const camera = participant.getTrackPublication(Track.Source.Camera);
        return (
          <span key={participant.identity} className="inline-flex gap-1">
            <button
              type="button"
              className="sru-meet-btn"
              onClick={() =>
                void send({
                  action: "mute",
                  targetUserId: participant.identity,
                  trackSid: mic?.trackSid,
                })
              }
            >
              Mute {participant.name || participant.identity}
            </button>
            <button
              type="button"
              className="sru-meet-btn"
              onClick={() =>
                void send({
                  action: "disable_camera",
                  targetUserId: participant.identity,
                  trackSid: camera?.trackSid,
                })
              }
            >
              Camera off
            </button>
            <button
              type="button"
              className="sru-meet-btn"
              onClick={() =>
                void send({
                  action: "spotlight",
                  targetUserId: participant.identity,
                })
              }
            >
              Spotlight
            </button>
          </span>
        );
      })}
    </div>
  );
}
