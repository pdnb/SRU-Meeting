import "server-only";

import { Client } from "ldapts";
import type { OrgRole } from "@prisma/client";
import { mapGroupsToOrgRole } from "@/lib/sso";

export type LdapIdentity = {
  dn: string;
  email: string;
  name: string | null;
  groups: string[];
  orgRole: OrgRole;
};

export function ldapUserFilter(username: string, template?: string): string {
  const safe = username.replace(/[\\*()/\0]/g, "");
  return (template ?? "(uid={{username}})").replaceAll("{{username}}", safe);
}

function attrString(
  attributes: Record<string, string[] | string | undefined>,
  name: string,
): string | undefined {
  const value = attributes[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

export async function authenticateLdap(
  username: string,
  password: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<LdapIdentity | null> {
  if (!env.LDAP_URL || !env.LDAP_BASE_DN || !password) {
    return null;
  }

  const client = new Client({ url: env.LDAP_URL, timeout: 5000, connectTimeout: 5000 });
  try {
    if (env.LDAP_BIND_DN && env.LDAP_BIND_PASSWORD) {
      await client.bind(env.LDAP_BIND_DN, env.LDAP_BIND_PASSWORD);
    }
    const filter = ldapUserFilter(username, env.LDAP_USER_FILTER);
    const { searchEntries } = await client.search(env.LDAP_BASE_DN, {
      scope: "sub",
      filter,
      attributes: [
        env.LDAP_EMAIL_ATTR ?? "mail",
        env.LDAP_NAME_ATTR ?? "cn",
        env.LDAP_GROUP_ATTR ?? "memberOf",
        "dn",
      ],
    });
    const entry = searchEntries[0];
    if (!entry) {
      return null;
    }
    const dn = typeof entry.dn === "string" ? entry.dn : String(entry.dn);
    await client.bind(dn, password);

    const attributes = entry as unknown as Record<string, string[] | string | undefined>;
    const email =
      attrString(attributes, env.LDAP_EMAIL_ATTR ?? "mail") ??
      `${username.replace(/[^a-zA-Z0-9._-]/g, "")}@ldap.local`;
    const name = attrString(attributes, env.LDAP_NAME_ATTR ?? "cn") ?? username;
    const groupAttr = attributes[env.LDAP_GROUP_ATTR ?? "memberOf"];
    const groups = Array.isArray(groupAttr)
      ? groupAttr
      : typeof groupAttr === "string"
        ? [groupAttr]
        : [];

    return {
      dn,
      email: email.toLowerCase(),
      name,
      groups,
      orgRole: mapGroupsToOrgRole(groups),
    };
  } catch {
    return null;
  } finally {
    try {
      await client.unbind();
    } catch {
      // ignore
    }
  }
}
