"use client";

import type { TrackReference } from "@livekit/components-react";
import { VideoTile } from "@/components/meeting/VideoTile";

export function SpeakerView({
  tiles,
  mainId,
}: {
  tiles: { id: string; label: string; trackRef?: TrackReference }[];
  mainId?: string;
}) {
  const main = tiles.find((tile) => tile.id === mainId) ?? tiles[0];
  const others = tiles.filter((tile) => tile.id !== main?.id);

  if (!main) {
    return <p className="grid h-full place-items-center">Waiting for video</p>;
  }

  return (
    <div className="sru-meet-speaker">
      <VideoTile trackRef={main.trackRef} label={main.label} />
      {others.length > 0 ? (
        <div className="sru-meet-speaker-strip">
          {others.map((tile) => (
            <VideoTile
              key={tile.id}
              trackRef={tile.trackRef}
              label={tile.label}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
