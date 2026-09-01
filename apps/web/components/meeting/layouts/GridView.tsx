"use client";

import { useState } from "react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VideoTile } from "@/components/meeting/VideoTile";

const PAGE_SIZE = 6;

export function GridView({
  tiles,
}: {
  tiles: { id: string; label: string; trackRef?: TrackReferenceOrPlaceholder }[];
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(tiles.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = tiles.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  if (tiles.length === 0) {
    return (
      <p className="grid h-full place-items-center text-meet-muted">
        Waiting for video
      </p>
    );
  }

  return (
    <div className="relative h-full min-h-0">
      <div className="grid h-full min-h-0 grid-cols-1 content-start gap-2 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-2 lg:grid-rows-3 lg:overflow-hidden">
        {visible.map((tile) => (
          <VideoTile key={tile.id} trackRef={tile.trackRef} label={tile.label} />
        ))}
      </div>
      {pageCount > 1 ? (
        <div className="pointer-events-none absolute inset-y-0 right-2 left-2 flex items-center justify-between">
          <button
            type="button"
            className="pointer-events-auto grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-black/55 text-meet-ink disabled:opacity-40"
            aria-label="Previous video page"
            disabled={safePage === 0}
            onClick={() => setPage(Math.max(0, safePage - 1))}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <span className="rounded-full bg-black/55 px-2 py-1 text-xs text-meet-ink">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="pointer-events-auto grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-black/55 text-meet-ink disabled:opacity-40"
            aria-label="Next video page"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
