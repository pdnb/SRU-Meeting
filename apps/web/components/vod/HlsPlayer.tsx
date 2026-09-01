"use client";

import { useEffect, useRef } from "react";
import { hlsLoadOptions, hlsXhrNeedsCredentials } from "@/lib/hls-options";

export function HlsPlayer({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) {
      return;
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }
    let destroyed = false;
    let hls: { destroy: () => void; loadSource: (url: string) => void; attachMedia: (media: HTMLMediaElement) => void } | undefined;
    void import("hls.js").then(({ default: Hls }) => {
      if (destroyed || !Hls.isSupported()) {
        video.src = src;
        return;
      }
      const options = hlsLoadOptions(src);
      hls = new Hls({
        ...options,
        xhrSetup: (xhr) => {
          if (hlsXhrNeedsCredentials(src)) {
            xhr.withCredentials = true;
          }
        },
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      video.dataset.hls = "1";
    });
    return () => {
      destroyed = true;
      hls?.destroy();
    };
  }, [src]);

  return (
    <video
      ref={ref}
      controls
      playsInline
      className="w-full rounded-sru bg-black"
      aria-label={title}
    />
  );
}
