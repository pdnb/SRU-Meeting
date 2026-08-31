import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe session gate. Unauthenticated /app visits go to /login.
// https://authjs.dev/getting-started/installation?framework=Next.js
// Next.js 15 still uses middleware.ts (proxy.ts is Next.js 16).

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/app/:path*"],
};
