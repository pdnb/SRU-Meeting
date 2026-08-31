import "server-only";

import { LoginRequestSchema } from "@sru/shared";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

// Auth.js v5 + Credentials: https://authjs.dev/getting-started/authentication/credentials
// Next.js handlers: https://authjs.dev/getting-started/installation?framework=Next.js

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = LoginRequestSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || user.isGuest) {
          return null;
        }

        const matches = await verifyPassword(
          user.passwordHash,
          parsed.data.password,
        );
        if (!matches) {
          return null;
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
