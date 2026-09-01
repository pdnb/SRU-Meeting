export type StreamBannerKind = "consent" | "live" | "hidden";

export function streamBannerKind(
  status:
    | "pending_consent"
    | "starting"
    | "active"
    | "finishing"
    | "finished"
    | "failed"
    | null
    | undefined,
): StreamBannerKind {
  if (status === "pending_consent") {
    return "consent";
  }
  if (status === "starting" || status === "active") {
    return "live";
  }
  return "hidden";
}

export function streamLivePlaylistUrl(streamId: string): string {
  return `/api/v1/streams/${streamId}/media/live.m3u8`;
}

export function streamMediaObjectKey(
  hlsPrefix: string,
  relative: string,
): { ok: true; key: string } | { ok: false } {
  if (
    !relative ||
    relative.startsWith("/") ||
    relative.includes("..") ||
    relative.includes("\\")
  ) {
    return { ok: false };
  }
  return { ok: true, key: `${hlsPrefix}${relative}` };
}
