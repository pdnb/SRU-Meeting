"use client";

import { useParticipants } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Ban, MicOff, Star, UserMinus, UserPlus, VideoOff } from "lucide-react";
import type { ReactElement } from "react";

export function ParticipantList({
  roomId,
  host,
  embedded = false,
}: {
  roomId: string;
  host: boolean;
  embedded?: boolean;
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
    <aside
      className={
        embedded
          ? "flex h-full min-h-0 flex-col bg-meet-panel text-meet-ink"
          : "sru-meet-panel"
      }
      aria-label="People"
    >
      {embedded ? null : <h2>People</h2>}
      {participants.length === 0 ? (
        <p className="p-3 text-sm text-meet-muted">No one else is here yet.</p>
      ) : (
        <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-2">
          {participants.map((participant) => {
            const mic = participant.getTrackPublication(Track.Source.Microphone);
            const camera = participant.getTrackPublication(Track.Source.Camera);
            const name = participant.name || participant.identity;
            return (
              <li
                key={participant.identity}
                className="mb-1 rounded-md px-2 py-2 hover:bg-meet-raised"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm">{name}</span>
                  {!participant.isMicrophoneEnabled ? (
                    <MicOff
                      className="h-3.5 w-3.5 shrink-0 text-meet-muted"
                      aria-label="Muted"
                    />
                  ) : null}
                </div>
                {host ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <HostAction
                      label={`Mute ${name}`}
                      onClick={() =>
                        void send({
                          action: "mute",
                          targetUserId: participant.identity,
                          trackSid: mic?.trackSid,
                        })
                      }
                    >
                      <MicOff className="h-3.5 w-3.5" aria-hidden />
                    </HostAction>
                    <HostAction
                      label={`Turn off camera for ${name}`}
                      onClick={() =>
                        void send({
                          action: "disable_camera",
                          targetUserId: participant.identity,
                          trackSid: camera?.trackSid,
                        })
                      }
                    >
                      <VideoOff className="h-3.5 w-3.5" aria-hidden />
                    </HostAction>
                    <HostAction
                      label={`Spotlight ${name}`}
                      onClick={() =>
                        void send({
                          action: "spotlight",
                          targetUserId: participant.identity,
                        })
                      }
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden />
                    </HostAction>
                    <HostAction
                      label={`Remove ${name}`}
                      onClick={() =>
                        void send({
                          action: "kick",
                          targetUserId: participant.identity,
                        })
                      }
                    >
                      <UserMinus className="h-3.5 w-3.5" aria-hidden />
                    </HostAction>
                    <HostAction
                      label={`Ban ${name}`}
                      onClick={() =>
                        void send({
                          action: "ban",
                          targetUserId: participant.identity,
                        })
                      }
                    >
                      <Ban className="h-3.5 w-3.5" aria-hidden />
                    </HostAction>
                    <HostAction
                      label={`Make ${name} a cohost`}
                      onClick={() =>
                        void send({
                          action: "promote",
                          targetUserId: participant.identity,
                        })
                      }
                    >
                      <UserPlus className="h-3.5 w-3.5" aria-hidden />
                    </HostAction>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function HostAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactElement;
}) {
  return (
    <button
      type="button"
      className="inline-grid h-7 w-7 cursor-pointer place-items-center rounded-md text-meet-muted hover:bg-meet-canvas hover:text-meet-ink"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children as never}
    </button>
  );
}
