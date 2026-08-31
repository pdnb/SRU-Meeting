"use client";

import {
  AudioTrack,
  VideoTrack,
  useIsSpeaking,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";

export function VideoTile({
  trackRef,
  label,
}: {
  trackRef?: TrackReference;
  label: string;
}) {
  if (!trackRef) {
    return (
      <div className="sru-tile">
        <p className="grid h-full place-items-center text-zinc-400">{label}</p>
        <span className="sru-tile-label">{label}</span>
      </div>
    );
  }
  return <ActiveTile trackRef={trackRef} label={label} />;
}

function ActiveTile({
  trackRef,
  label,
}: {
  trackRef: TrackReference;
  label: string;
}) {
  const speaking = useIsSpeaking(trackRef.participant);

  return (
    <div className={`sru-tile ${speaking ? "sru-tile-speaking" : ""}`}>
      {trackRef.publication?.kind === "video" ? (
        <VideoTrack trackRef={trackRef} />
      ) : (
        <p className="grid h-full place-items-center text-zinc-400">{label}</p>
      )}
      {trackRef.source === Track.Source.Microphone ||
      trackRef.publication?.kind === "audio" ? (
        <AudioTrack trackRef={trackRef} />
      ) : null}
      <span className="sru-tile-label">{label}</span>
    </div>
  );
}
