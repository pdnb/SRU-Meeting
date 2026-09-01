import { logoutAction } from "@/lib/auth-actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isOrgAdmin } from "@/lib/rbac";

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

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a href="#app-main" className="sru-skip">
        Skip to content
      </a>
      <header className="sticky top-0 z-10 flex h-nav items-center justify-between border-b border-line bg-canvas px-page">
        <p className="font-sans text-body font-semibold">SRU-Conf</p>
        <nav aria-label="Workspace" className="flex items-center gap-6 text-body">
          <a href="/app" className="font-semibold text-ink">
            Rooms
          </a>
          <a href="/app/account" className="text-ink">
            Account
          </a>
          {admin ? (
            <a href="/app/admin" className="text-ink">
              Admin
            </a>
          ) : null}
          {email ? (
            <span className="text-muted">{email}</span>
          ) : (
            <span className="text-muted">Account</span>
          )}
          <form action={logoutAction}>
            <button type="submit" className="text-ink underline">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
