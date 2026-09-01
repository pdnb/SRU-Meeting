import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  requireSessionUser: vi.fn(async () => ({
    user: {
      id: "u1",
      email: "host@sru.ac.th",
      name: "Host",
      orgRole: "host",
    },
    response: null,
  })),
}));

import { requireOrgAdmin } from "./admin";

describe("admin API", () => {
  it("forbids a host from org-admin routes", async () => {
    const result = await requireOrgAdmin();
    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });
});
