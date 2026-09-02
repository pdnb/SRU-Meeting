/** Baked-in org server URL (override at build: SRU_SERVER_URL=https://meeting.org.ac.th). */
export function defaultServerUrl(): string {
  return process.env.SRU_SERVER_URL ?? "http://127.0.0.1:3000";
}
