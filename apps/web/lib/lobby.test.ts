import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { applyKnock } from "./lobby";

describe("applyKnock", () => {
  it("turns a denied request into a new pending knock", () => {
    expect(applyKnock("denied")).toBe("pending");
    expect(applyKnock(null)).toBe("pending");
    expect(applyKnock("admitted")).toBe("admitted");
  });
});
