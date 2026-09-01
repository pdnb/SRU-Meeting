import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      orgRole?: "org_admin" | "host" | "participant";
    } & DefaultSession["user"];
  }

  interface User {
    orgRole?: "org_admin" | "host" | "participant";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    orgRole?: "org_admin" | "host" | "participant";
  }
}
