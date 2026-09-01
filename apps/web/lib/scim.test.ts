import { describe, expect, it, vi, beforeEach } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    orgSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/deletion", () => ({ deleteUserData: vi.fn(async () => {}) }));
vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(async (value: string) => `hash:${value}`),
  verifyPassword: vi.fn(async (hash: string, value: string) => hash === `hash:${value}`),
}));

import {
  configuredScimGroups,
  generateScimBearerToken,
  orgRoleFromScimGroups,
  parseScimUserNameFilter,
  scimGroupRoleMap,
  verifyScimBearerToken,
} from "./scim";
import { requireScimBearer } from "./scim-auth";

describe("SCIM helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses userName eq filter", () => {
    expect(parseScimUserNameFilter('userName eq "alice@sru.ac.th"')).toEqual({
      ok: true,
      userName: "alice@sru.ac.th",
    });
    expect(parseScimUserNameFilter('displayName eq "Alice"').ok).toBe(false);
  });

  it("maps SCIM_GROUP_ROLE_MAP like SSO_ROLE_MAP", () => {
    const map = scimGroupRoleMap({
      SCIM_GROUP_ROLE_MAP: "IT-Admin:org_admin,Hosts:host,Everyone:participant",
    });
    expect(orgRoleFromScimGroups(["IT-Admin"], { SCIM_GROUP_ROLE_MAP: "IT-Admin:org_admin,Hosts:host,Everyone:participant" })).toBe(
      "org_admin",
    );
    expect(configuredScimGroups({ SCIM_GROUP_ROLE_MAP: "IT-Admin:org_admin,Hosts:host" })).toEqual([
      "IT-Admin",
      "Hosts",
    ]);
    expect(map.get("it-admin")).toBe("org_admin");
  });

  it("generates sru_scim bearer tokens", () => {
    const token = generateScimBearerToken();
    expect(token.startsWith("sru_scim_")).toBe(true);
    expect(token.length).toBeGreaterThan(20);
  });

  it("accepts valid bearer and rejects missing/invalid", async () => {
    prisma.orgSetting.findUnique.mockResolvedValue({
      key: "scimBearerToken",
      value: {
        hash: "hash:good-token",
        createdAt: "2026-09-01T00:00:00.000Z",
        lastRotatedAt: null,
      },
    });
    await expect(verifyScimBearerToken("good-token")).resolves.toBe(true);
    await expect(verifyScimBearerToken("bad-token")).resolves.toBe(false);
    await expect(verifyScimBearerToken(null)).resolves.toBe(false);

    const ok = await requireScimBearer(
      new Request("http://localhost/scim/v2/Users", {
        headers: { Authorization: "Bearer good-token" },
      }),
    );
    expect(ok.ok).toBe(true);

    const denied = await requireScimBearer(new Request("http://localhost/scim/v2/Users"));
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.response.status).toBe(401);
    }
  });
});

/**
 * Manual IdP curl path (replace TOKEN and BASE):
 *
 * curl -sS -H "Authorization: Bearer TOKEN" \\
 *   -H "Content-Type: application/scim+json" \\
 *   "$BASE/scim/v2/Users"
 *
 * curl -sS -X POST -H "Authorization: Bearer TOKEN" \\
 *   -H "Content-Type: application/scim+json" \\
 *   -d '{"schemas":["urn:ietf:params:scim:schemas:core:2.0:User"],"userName":"alice@sru.ac.th","externalId":"entra-123","name":{"formatted":"Alice"}}' \\
 *   "$BASE/scim/v2/Users"
 *
 * curl -sS -H "Authorization: Bearer TOKEN" \\
 *   "$BASE/scim/v2/Users?filter=userName%20eq%20%22alice@sru.ac.th%22"
 *
 * curl -sS -X PATCH -H "Authorization: Bearer TOKEN" \\
 *   -H "Content-Type: application/scim+json" \\
 *   -d '{"schemas":["urn:ietf:params:scim:api:messages:2.0:PatchOp"],"Operations":[{"op":"add","path":"members","value":[{"value":"USER_ID"}]}]}' \\
 *   "$BASE/scim/v2/Groups/IT-Admin"
 */
