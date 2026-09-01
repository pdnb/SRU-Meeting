import { describe, expect, it } from "vitest";
import {
  canCreateRoom,
  isOrgAdmin,
  orgRoleForNewUser,
  parseOrgAdminEmails,
} from "./rbac";

describe("org RBAC", () => {
  it("lets host and org_admin create rooms, not participant", () => {
    expect(canCreateRoom("org_admin")).toBe(true);
    expect(canCreateRoom("host")).toBe(true);
    expect(canCreateRoom("participant")).toBe(false);
  });

  it("treats only org_admin as an org admin", () => {
    expect(isOrgAdmin("org_admin")).toBe(true);
    expect(isOrgAdmin("host")).toBe(false);
  });

  it("promotes listed bootstrap emails to org_admin", () => {
    expect(parseOrgAdminEmails("it@sru.ac.th, Host@sru.ac.th").has("it@sru.ac.th")).toBe(
      true,
    );
    expect(orgRoleForNewUser("it@sru.ac.th", "it@sru.ac.th")).toBe("org_admin");
    expect(orgRoleForNewUser("user@sru.ac.th", "it@sru.ac.th")).toBe("host");
  });
});
