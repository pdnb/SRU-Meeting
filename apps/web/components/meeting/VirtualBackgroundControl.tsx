"use client";

import { BackgroundGalleryModal } from "@/components/meeting/BackgroundGalleryModal";

export function VirtualBackgroundControl({
  showUnsupportedNotice = false,
  compact = false,
}: {
  showUnsupportedNotice?: boolean;
  compact?: boolean;
}) {
  return (
    <BackgroundGalleryModal
      showUnsupportedNotice={showUnsupportedNotice}
      compact={compact}
      controlId={compact ? "virtual-bg-prejoin" : "virtual-bg-meeting"}
    />
  );
}
