"use client";

import type { Room } from "@sru/shared";
import { useEffect, useRef, useState } from "react";

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
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(true);
  const [password, setPassword] = useState("");
  const [name, setName] = useState(defaultName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (!video) {
      return;
    }
    void navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((next) => {
        stream = next;
        if (videoRef.current) {
          videoRef.current.srcObject = next;
        }
      })
      .catch(() => {
        setVideo(false);
        setError("Camera is not available. You can still join with audio.");
      });
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [video]);

  return (
    <div className="sru-meet items-center justify-center overflow-y-auto px-page py-10">
      <div className="w-full max-w-lg">
        <h1 className="font-sans text-display font-semibold">{room.name}</h1>
        <p className="mt-2 text-body text-zinc-300">
          Check camera and microphone before you join.
        </p>
        <div className="sru-tile mt-6 aspect-video">
          {video ? (
            <video ref={videoRef} autoPlay muted playsInline />
          ) : (
            <p className="grid h-full place-items-center text-zinc-400">
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
          </div>
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
