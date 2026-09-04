"use server";

import { RegisterRequestSchema } from "@sru/shared";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { ensurePersonalRoom } from "@/lib/personal-room";
import { orgRoleForNewUser } from "@/lib/rbac";

export async function registerAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  const parsed = RegisterRequestSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: emptyToUndefined(formData.get("name")),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const created = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name ?? null,
      passwordHash: await hashPassword(parsed.data.password),
      isGuest: false,
      orgRole: orgRoleForNewUser(email),
    },
  });

  await ensurePersonalRoom(created.id);

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try logging in." };
    }
    throw error;
  }
}

export async function loginAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function ssoSignInAction(provider: string): Promise<void> {
  await signIn(provider, { redirectTo: "/app" });
}

export async function ldapLoginAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  try {
    await signIn("credentials", {
      ldapUsername: String(formData.get("ldapUsername") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "LDAP sign-in failed." };
    }
    throw error;
  }
}

export async function samlTicketSignInAction(
  ticket: string,
): Promise<{ error: string } | void> {
  try {
    await signIn("credentials", {
      samlTicket: ticket,
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "SAML sign-in failed." };
    }
    throw error;
  }
}

export async function desktopTicketSignInAction(
  ticket: string,
): Promise<{ error: string } | void> {
  try {
    await signIn("credentials", {
      desktopTicket: ticket,
      redirectTo: "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Desktop sign-in failed." };
    }
    throw error;
  }
}

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
