"use client";

import type { Room } from "@sru/shared";
import { createLocalVideoTrack, LocalVideoTrack } from "livekit-client";
import { AudioLines, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ControlIconButton } from "@/components/meeting/chrome/ControlIconButton";
import { MeetingLobbyShell } from "@/components/meeting/chrome/MeetingLobbyShell";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";
import { VirtualBackgroundControl } from "@/components/meeting/VirtualBackgroundControl";
import { useNoiseSuppressionPreference } from "@/components/meeting/useNoiseSuppressionPreference";
import { useVirtualBackgroundPreference } from "@/components/meeting/useVirtualBackgroundPreference";
import { useTrackProcessorSupport } from "@/components/meeting/useTrackProcessorSupport";
import { getE2eeBlockReason } from "@/lib/e2ee/support";

export type PrejoinResult = {
  audio: boolean;
  video: boolean;
  password?: string;
  name?: string;
};

function initials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return letters || "?";
}

export function Prejoin({
  room,
  defaultName,
  guest,
  onJoin,
}: {
  room: Room;
  defaultName?: string;
  guest?: boolean;
  onJoin: (result: PrejoinResult) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewTrackRef = useRef<LocalVideoTrack | null>(null);
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(true);
  const [password, setPassword] = useState("");
  const [name, setName] = useState(defaultName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [noiseSuppression, setNoiseSuppression] =
    useNoiseSuppressionPreference();
  const { choice: virtualBackground } = useVirtualBackgroundPreference();
  const { noiseSuppression: noiseSupported, virtualBackground: backgroundSupported } =
    useTrackProcessorSupport();
  const e2eeBlockReason = room.e2eeEnabled ? getE2eeBlockReason() : null;
  const previewName = name.trim() || defaultName || "You";

  useEffect(() => {
    if (!video) {
      previewTrackRef.current?.stop();
      previewTrackRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const track = await createLocalVideoTrack();
        if (cancelled) {
          track.stop();
          return;
        }
        previewTrackRef.current?.stop();
        previewTrackRef.current = track;
        if (backgroundSupported) {
          const { applyVirtualBackgroundToTrack } = await import(
            "@/lib/livekit/track-processors"
          );
          await applyVirtualBackgroundToTrack(track, virtualBackground);
        }
        if (videoRef.current) {
          track.attach(videoRef.current);
        }
      } catch {
        if (!cancelled) {
          setVideo(false);
          setError("Camera is not available. You can still join with audio.");
        }
      }
    })();

    return () => {
      cancelled = true;
      previewTrackRef.current?.stop();
      previewTrackRef.current = null;
    };
  }, [video, backgroundSupported, virtualBackground]);

  useEffect(() => {
    const track = previewTrackRef.current;
    if (!track || !backgroundSupported || !video) {
      return;
    }
    void (async () => {
      const { applyVirtualBackgroundToTrack } = await import(
        "@/lib/livekit/track-processors"
      );
      await applyVirtualBackgroundToTrack(track, virtualBackground).catch(() => {
        // Preview background is best-effort before join.
      });
    })();
  }, [virtualBackground, backgroundSupported, video]);

  if (e2eeBlockReason) {
    return (
      <MeetingErrorState
        title="End-to-end encryption unavailable"
        message={e2eeBlockReason}
      />
    );
  }

  return (
    <MeetingLobbyShell roomName={room.name}>
      <div className="sru-meet-lobby-preview">
        <div className="sru-tile sru-meet-lobby-tile">
          {video ? (
            <video ref={videoRef} autoPlay muted playsInline />
          ) : (
            <div className="grid h-full place-items-center bg-meet-panel">
              <span
                className="grid h-20 w-20 place-items-center rounded-full bg-meet-raised text-2xl font-medium text-meet-ink"
                aria-hidden
              >
                {initials(previewName)}
              </span>
              <span className="sr-only">Camera off</span>
            </div>
          )}
          <div className="sru-meet-lobby-controls">
            <ControlIconButton
              label={audio ? "Mute microphone" : "Unmute microphone"}
              danger={!audio}
              pressed={!audio}
              onClick={() => setAudio((value) => !value)}
            >
              {audio ? (
                <Mic className="h-5 w-5" aria-hidden />
              ) : (
                <MicOff className="h-5 w-5" aria-hidden />
              )}
            </ControlIconButton>
            <ControlIconButton
              label={video ? "Stop camera" : "Start camera"}
              danger={!video}
              pressed={!video}
              onClick={() => setVideo((value) => !value)}
            >
              {video ? (
                <Video className="h-5 w-5" aria-hidden />
              ) : (
                <VideoOff className="h-5 w-5" aria-hidden />
              )}
            </ControlIconButton>
            {noiseSupported ? (
              <ControlIconButton
                label={
                  noiseSuppression
                    ? "Turn off noise reduction"
                    : "Turn on noise reduction"
                }
                pressed={noiseSuppression}
                onClick={() => setNoiseSuppression(!noiseSuppression)}
              >
                <AudioLines className="h-5 w-5" aria-hidden />
              </ControlIconButton>
            ) : null}
          </div>
        </div>
        <div className="sru-meet-lobby-options">
          <VirtualBackgroundControl showUnsupportedNotice compact />
          {!noiseSupported ? (
            <p className="text-caption sru-meet-muted">
              Noise reduction unavailable in this browser
            </p>
          ) : null}
        </div>
      </div>

      <div className="sru-meet-lobby-join">
        <div>
          <h1>Ready to join?</h1>
          <p className="mt-2 text-body sru-meet-muted">{room.name}</p>
        </div>
        {room.e2eeEnabled ? (
          <p role="status" className="sru-meet-notice">
            This meeting uses end-to-end encryption for camera and microphone.
            Recording, streaming, and breakouts are disabled. Screen share is not
            encrypted.
          </p>
        ) : null}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            try {
              await onJoin({
                audio,
                video,
                password: password || undefined,
                name: name || undefined,
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not join");
              setPending(false);
            }
          }}
        >
          {guest ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="display-name" className="sru-label">
                Display name
              </label>
              <input
                id="display-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="sru-input"
                required
                autoComplete="nickname"
              />
            </div>
          ) : null}
          {room.hasPassword ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="room-password" className="sru-label">
                Room password
              </label>
              <input
                id="room-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="sru-input"
                autoComplete="off"
              />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="sru-error">
              {error}
            </p>
          ) : null}
          <button type="submit" className="sru-meet-cta" disabled={pending}>
            {pending ? "Joining…" : "Join meeting"}
          </button>
        </form>
      </div>
    </MeetingLobbyShell>
  );
}
