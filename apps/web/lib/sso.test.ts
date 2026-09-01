import { describe, expect, it } from "vitest";
import {
  configuredOidcProviders,
  groupsFromProfile,
  mapGroupsToOrgRole,
  parseRoleMap,
  samlIsConfigured,
} from "./sso";

describe("SSO helpers", () => {
  it("hides providers when env is missing", () => {
    expect(configuredOidcProviders({})).toEqual([]);
    expect(
      configuredOidcProviders({
        AUTH_KEYCLOAK_ID: "id",
        AUTH_KEYCLOAK_SECRET: "secret",
        AUTH_KEYCLOAK_ISSUER: "https://idp.example/realms/sru",
      }).map((provider) => provider.id),
    ).toEqual(["keycloak"]);
    expect(samlIsConfigured({})).toBe(false);
  });

  it("maps IT-Admin to org_admin", () => {
    const roleMap = parseRoleMap("IT-Admin:org_admin,Hosts:host,Everyone:participant");
    expect(mapGroupsToOrgRole(["IT-Admin"], roleMap)).toBe("org_admin");
    expect(mapGroupsToOrgRole(["Everyone"], roleMap)).toBe("participant");
    expect(mapGroupsToOrgRole(["Hosts", "Everyone"], roleMap)).toBe("host");
    expect(mapGroupsToOrgRole([], roleMap)).toBe("host");
  });

  it("reads Keycloak realm roles and groups", () => {
    expect(
      groupsFromProfile({
        groups: ["Hosts"],
        realm_access: { roles: ["IT-Admin"] },
      }),
    ).toEqual(["Hosts", "IT-Admin"]);
  });
});
