import "server-only";

import { LoginRequestSchema } from "@sru/shared";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Keycloak from "next-auth/providers/keycloak";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Okta from "next-auth/providers/okta";
import type { Provider } from "next-auth/providers";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { authenticateLdap } from "@/lib/ldap";
import { verifyPassword } from "@/lib/password";
import { consumeSamlTicket } from "@/lib/saml";
import { consumeAuthTicket } from "@/lib/auth-ticket";
import { configuredOidcProviders, groupsFromProfile, ldapIsConfigured } from "@/lib/sso";
import { upsertFederatedUser } from "@/lib/sso-users";

// Auth.js v5 providers:
// https://authjs.dev/getting-started/authentication/credentials
// https://authjs.dev/getting-started/providers/keycloak
// https://authjs.dev/getting-started/providers/microsoft-entra-id
// https://authjs.dev/getting-started/providers/google
// https://authjs.dev/getting-started/providers/okta

function oidcProviders(): Provider[] {
  const providers: Provider[] = [];
  const enabled = new Set(configuredOidcProviders().map((item) => item.id));
  if (enabled.has("keycloak")) {
    providers.push(Keycloak);
  }
  if (enabled.has("microsoft-entra-id")) {
    providers.push(MicrosoftEntraID);
  }
  if (enabled.has("google")) {
    providers.push(Google);
  }
  if (enabled.has("okta")) {
    providers.push(Okta);
  }
  return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        samlTicket: { type: "text" },
        desktopTicket: { type: "text" },
        ldapUsername: { type: "text" },
      },
      authorize: async (credentials) => {
        if (credentials?.samlTicket && typeof credentials.samlTicket === "string") {
          const userId = consumeSamlTicket(credentials.samlTicket);
          if (!userId) {
            return null;
          }
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (!user || user.deletedAt) {
            return null;
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            orgRole: user.orgRole,
          };
        }

        if (credentials?.desktopTicket && typeof credentials.desktopTicket === "string") {
          const userId = consumeAuthTicket(credentials.desktopTicket);
          if (!userId) {
            return null;
          }
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (!user || user.deletedAt) {
            return null;
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            orgRole: user.orgRole,
          };
        }

        if (
          ldapIsConfigured() &&
          typeof credentials?.ldapUsername === "string" &&
          typeof credentials.password === "string"
        ) {
          const identity = await authenticateLdap(
            credentials.ldapUsername,
            credentials.password,
          );
          if (!identity) {
            return null;
          }
          const user = await upsertFederatedUser({
            email: identity.email,
            name: identity.name,
            provider: "ldap",
            subject: identity.dn,
            groups: identity.groups,
            ldapDn: identity.dn,
          });
          return user;
        }

        const parsed = LoginRequestSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || user.isGuest || user.deletedAt || !user.passwordHash) {
          return null;
        }

        const matches = await verifyPassword(
          user.passwordHash,
          parsed.data.password,
        );
        if (!matches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgRole: user.orgRole,
        };
      },
    }),
    ...oidcProviders(),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (!account || account.provider === "credentials") {
        return true;
      }
      const email = user.email;
      if (!email) {
        return false;
      }
      const groups = profile
        ? groupsFromProfile(profile as Record<string, unknown>)
        : [];
      const dbUser = await upsertFederatedUser({
        email,
        name: user.name,
        provider: account.provider,
        subject: account.providerAccountId,
        groups,
      });
      user.id = dbUser.id;
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        if ("orgRole" in user && typeof user.orgRole === "string") {
          token.orgRole = user.orgRole;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      if (session.user && typeof token.orgRole === "string") {
        session.user.orgRole = token.orgRole as typeof session.user.orgRole;
      }
      return session;
    },
  },
});
