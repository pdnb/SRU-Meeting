import { describe, expect, it } from "vitest";
import { ldapUserFilter } from "./ldap";

describe("LDAP filter", () => {
  it("interpolates a sanitized username", () => {
    expect(ldapUserFilter("alice", "(uid={{username}})")).toBe("(uid=alice)");
    expect(ldapUserFilter("al(ice)", "(uid={{username}})")).toBe("(uid=alice)");
  });
});
