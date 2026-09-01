import { describe, expect, it } from "vitest";
import {
  consumeSamlTicket,
  issueSamlTicket,
  parseSamlProfile,
  rejectInvalidSamlResponse,
} from "./saml";

describe("SAML profile and tickets", () => {
  it("extracts email and groups from a SAML profile", () => {
    const profile = parseSamlProfile({
      email: "it@sru.ac.th",
      displayName: "IT Admin",
      nameID: "it@sru.ac.th",
      groups: ["IT-Admin"],
    });
    expect(profile).toMatchObject({
      email: "it@sru.ac.th",
      groups: ["IT-Admin"],
    });
  });

  it("rejects profiles without an email", () => {
    expect(parseSamlProfile({ nameID: "not-an-email" })).toBeNull();
  });

  it("issues a one-time ticket", () => {
    const ticket = issueSamlTicket("user-1");
    expect(consumeSamlTicket(ticket)).toBe("user-1");
    expect(consumeSamlTicket(ticket)).toBeNull();
  });

  it("returns a 401 payload for invalid assertions", () => {
    expect(rejectInvalidSamlResponse().status).toBe(401);
  });
});
