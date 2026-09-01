import { logoutAction } from "@/lib/auth-actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isOrgAdmin } from "@/lib/rbac";
import { SiteHeader } from "@/components/ui/SiteHeader";

export default async function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const actor = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const admin = actor ? isOrgAdmin(actor.orgRole) : false;

  const nav = [
    { href: "/app", label: "Rooms" },
    { href: "/app/account", label: "Account" },
    ...(admin ? [{ href: "/app/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a href="#app-main" className="sru-skip">
        Skip to content
      </a>
      <SiteHeader
        homeHref="/app"
        nav={nav}
        trailing={
          <>
            {email ? (
              <span className="hidden max-w-[20ch] truncate text-caption text-muted sm:inline">
                {email}
              </span>
            ) : null}
            <form action={logoutAction}>
              <button type="submit" className="sru-nav-link">
                Sign out
              </button>
            </form>
          </>
        }
      />
      {children}
    </div>
  );
}
