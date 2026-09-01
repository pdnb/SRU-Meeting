export function hlsXhrNeedsCredentials(src: string): boolean {
  return src.startsWith("/");
}

export function hlsLoadOptions(src: string): { live: boolean } {
  return { live: src.includes("/live.m3u8") };
}
