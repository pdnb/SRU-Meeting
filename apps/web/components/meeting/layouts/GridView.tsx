"use client";

import type { TrackReference } from "@livekit/components-react";
import { VideoTile } from "@/components/meeting/VideoTile";

export function GridView({
  tiles,
}: {
  tiles: { id: string; label: string; trackRef?: TrackReference }[];
}) {
  return (
    <div className="sru-meet-grid">
      {tiles.map((tile) => (
        <VideoTile key={tile.id} trackRef={tile.trackRef} label={tile.label} />
      ))}
    </div>
  );
}
