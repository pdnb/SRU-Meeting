"use client";

import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { VideoTile } from "@/components/meeting/VideoTile";

export function SidebarView({
  tiles,
  mainId,
}: {
  tiles: { id: string; label: string; trackRef?: TrackReferenceOrPlaceholder }[];
  mainId?: string;
}) {
  const main = tiles.find((tile) => tile.id === mainId) ?? tiles[0];
  const others = tiles.filter((tile) => tile.id !== main?.id);

  if (!main) {
    return <p className="grid h-full place-items-center">Waiting for video</p>;
  }

  return (
    <div className="sru-meet-sidebar">
      <VideoTile trackRef={main.trackRef} label={main.label} />
      <div className="sru-meet-sidebar-list">
        {others.map((tile) => (
          <VideoTile key={tile.id} trackRef={tile.trackRef} label={tile.label} />
        ))}
      </div>
    </div>
  );
}
