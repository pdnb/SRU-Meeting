import "server-only";

import { SAML } from "@node-saml/node-saml";
import { consumeAuthTicket, issueAuthTicket } from "@/lib/auth-ticket";

export type SamlProfile = {
  email: string;
  name: string | null;
  subject: string;
  groups: string[];
};

function samlConfig() {
  const entryPoint = process.env.SAML_ENTRYPOINT;
  const issuer = process.env.SAML_ISSUER;
  const idpCert = process.env.SAML_IDP_CERT;
  const callbackUrl =
    process.env.SAML_CALLBACK_URL ?? "http://localhost:3000/api/auth/saml/acs";
  if (!entryPoint || !issuer || !idpCert) {
    return null;
  }
  return {
    callbackUrl,
    entryPoint,
    issuer,
    idpCert,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    acceptedClockSkewMs: 5 * 60 * 1000,
  };
}

export function getSaml(): SAML | null {
  const config = samlConfig();
  if (!config) {
    return null;
  }
  return new SAML(config);
}

export function parseSamlProfile(profile: Record<string, unknown>): SamlProfile | null {
  const emailRaw =
    profile.email ??
    profile.mail ??
    profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ??
    profile.nameID;
  const email = typeof emailRaw === "string" ? emailRaw.toLowerCase() : "";
  if (!email.includes("@")) {
    return null;
  }
  const nameRaw =
    profile.displayName ??
    profile.cn ??
    profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
  const groupsRaw = profile.groups ?? profile.memberOf ?? [];
  const groups = Array.isArray(groupsRaw)
    ? groupsRaw.filter((item): item is string => typeof item === "string")
    : typeof groupsRaw === "string"
      ? [groupsRaw]
      : [];
  const subject =
    typeof profile.nameID === "string" ? profile.nameID : email;
  return {
    email,
    name: typeof nameRaw === "string" ? nameRaw : null,
    subject,
    groups,
  };
}

export function issueSamlTicket(userId: string): string {
  return issueAuthTicket(userId);
}

export function consumeSamlTicket(id: string): string | null {
  return consumeAuthTicket(id);
}

export function rejectInvalidSamlResponse(): {
  ok: false;
  status: 401;
  code: string;
  message: string;
} {
  return {
    ok: false,
    status: 401,
    code: "SAML_INVALID",
    message: "SAML response failed validation",
  };
}
