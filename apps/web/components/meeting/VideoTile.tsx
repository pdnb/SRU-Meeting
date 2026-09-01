"use client";

import {
  AudioTrack,
  VideoTrack,
  useIsSpeaking,
} from "@livekit/components-react";
import type {
  TrackReference,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOff } from "lucide-react";

function initials(label: string) {
  const parts = label
    .replace(/\s*·\s*screen$/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const letters = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return letters || "?";
}

function hasVideoPublication(
  trackRef: TrackReferenceOrPlaceholder,
): trackRef is TrackReference {
  return Boolean(
    trackRef.publication &&
      trackRef.publication.kind === "video" &&
      !trackRef.publication.isMuted,
  );
}

export function VideoTile({
  trackRef,
  label,
}: {
  trackRef?: TrackReferenceOrPlaceholder;
  label: string;
}) {
  if (!trackRef) {
    return <PlaceholderTile label={label} speaking={false} micMuted={false} />;
  }
  return <ActiveTile trackRef={trackRef} label={label} />;
}

function ActiveTile({
  trackRef,
  label,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  label: string;
}) {
  const speaking = useIsSpeaking(trackRef.participant);
  const isScreen = trackRef.source === Track.Source.ScreenShare;
  const videoOn = hasVideoPublication(trackRef);
  const micMuted = !trackRef.participant.isMicrophoneEnabled;

  return (
    <div className={`sru-tile ${speaking ? "sru-tile-speaking" : ""}`}>
      {videoOn ? (
        <VideoTrack trackRef={trackRef} />
      ) : (
        <AvatarFallback label={label} />
      )}
      {trackRef.publication?.kind === "audio" ? (
        <AudioTrack trackRef={trackRef as TrackReference} />
      ) : null}
      <TileLabel label={label} micMuted={micMuted && !isScreen} />
    </div>
  );
}

function PlaceholderTile({
  label,
  speaking,
  micMuted,
}: {
  label: string;
  speaking: boolean;
  micMuted: boolean;
}) {
  return (
    <div className={`sru-tile ${speaking ? "sru-tile-speaking" : ""}`}>
      <AvatarFallback label={label} />
      <TileLabel label={label} micMuted={micMuted} />
    </div>
  );
}

function AvatarFallback({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center bg-meet-panel">
      <span
        className="grid h-16 w-16 place-items-center rounded-full bg-meet-raised text-xl font-medium text-meet-ink"
        aria-hidden
      >
        {initials(label)}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function TileLabel({
  label,
  micMuted,
}: {
  label: string;
  micMuted: boolean;
}) {
  return (
    <span className="sru-tile-label">
      {micMuted ? <MicOff className="h-3 w-3 shrink-0" aria-hidden /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
