import type { NextAuthConfig } from "next-auth";

// Edge-safe Auth.js config (no Prisma, no Node crypto).
// Middleware / proxy pattern: https://authjs.dev/getting-started/installation?framework=Next.js
// Credentials + JWT sessions: https://authjs.dev/getting-started/authentication/credentials

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  providers: [],
  cookies: {
    sessionToken: {
      options: sessionCookieOptions,
    },
  },
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
