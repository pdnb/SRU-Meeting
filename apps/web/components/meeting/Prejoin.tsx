"use client";

import type { Room } from "@sru/shared";
import { createLocalVideoTrack, LocalVideoTrack } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";
import { VirtualBackgroundControl } from "@/components/meeting/VirtualBackgroundControl";
import { useNoiseSuppressionPreference } from "@/components/meeting/useNoiseSuppressionPreference";
import { useVirtualBackgroundPreference } from "@/components/meeting/useVirtualBackgroundPreference";
import { useTrackProcessorSupport } from "@/components/meeting/useTrackProcessorSupport";
import { getE2eeBlockReason } from "@/lib/e2ee/support";
import { readVirtualBackgroundPreference } from "@/lib/livekit/track-preferences";

export type PrejoinResult = {
  audio: boolean;
  video: boolean;
  password?: string;
  name?: string;
};

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
  const [virtualBackground] = useVirtualBackgroundPreference();
  const { noiseSuppression: noiseSupported, virtualBackground: backgroundSupported } =
    useTrackProcessorSupport();
  const e2eeBlockReason = room.e2eeEnabled ? getE2eeBlockReason() : null;

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
          await applyVirtualBackgroundToTrack(
            track,
            readVirtualBackgroundPreference(),
          );
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
  }, [video, backgroundSupported]);

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
    <div className="sru-meet items-center justify-center overflow-y-auto px-page py-10">
      <div className="w-full max-w-lg">
        <h1 className="font-sans text-display font-semibold">{room.name}</h1>
        <p className="mt-2 text-body sru-meet-muted">
          Check camera and microphone before you join.
        </p>
        {room.e2eeEnabled ? (
          <p role="status" className="sru-meet-notice">
            This meeting uses end-to-end encryption for camera and microphone.
            Recording, streaming, and breakouts are disabled. Screen share is not
            encrypted.
          </p>
        ) : null}
        <div className="sru-tile mt-6 aspect-video">
          {video ? (
            <video ref={videoRef} autoPlay muted playsInline />
          ) : (
            <p className="grid h-full place-items-center sru-meet-muted">
              Camera off
            </p>
          )}
        </div>
        <form
          className="mt-6 flex flex-col gap-4"
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="sru-meet-btn"
              aria-pressed={audio}
              onClick={() => setAudio((value) => !value)}
            >
              {audio ? "Mic on" : "Mic off"}
            </button>
            <button
              type="button"
              className="sru-meet-btn"
              aria-pressed={video}
              onClick={() => setVideo((value) => !value)}
            >
              {video ? "Camera on" : "Camera off"}
            </button>
            {noiseSupported ? (
              <button
                type="button"
                className="sru-meet-btn"
                aria-pressed={noiseSuppression}
                onClick={() => {
                  setNoiseSuppression(!noiseSuppression);
                }}
              >
                {noiseSuppression ? "Noise reduction on" : "Reduce noise"}
              </button>
            ) : (
              <span className="text-caption sru-meet-muted self-center">
                Noise reduction unavailable in this browser
              </span>
            )}
          </div>
          <VirtualBackgroundControl showUnsupportedNotice compact />
          {error ? (
            <p role="alert" className="sru-error">
              {error}
            </p>
          ) : null}
          <button type="submit" className="sru-cta" disabled={pending}>
            {pending ? "Joining…" : "Join meeting"}
          </button>
        </form>
      </div>
    </div>
  );
}
