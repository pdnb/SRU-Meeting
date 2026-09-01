import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/livekit/room-service", () => ({
  getRoomService: () => null,
  liveKitIdentity: (userId: string) => userId,
}));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/webhooks", () => ({ enqueueWebhook: vi.fn() }));

import { assertCanModerate } from "./moderation";

describe("assertCanModerate", () => {
  it("allows host and cohost and rejects a participant", () => {
    expect(assertCanModerate("host")).toBe(true);
    expect(assertCanModerate("cohost")).toBe(true);
    expect(assertCanModerate("participant")).toBe(false);
    expect(assertCanModerate(null)).toBe(false);
  });
});
