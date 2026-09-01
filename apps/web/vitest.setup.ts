import { vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: (fn: () => unknown) => fn(),
}));

process.env.AUTH_SECRET ??= "unit-test-auth-secret-at-least-32-chars";
process.env.LIVEKIT_URL ??= "ws://localhost:7880";
process.env.LIVEKIT_API_KEY ??= "devkey";
process.env.LIVEKIT_API_SECRET ??= "unit-test-livekit-secret-32chars";
