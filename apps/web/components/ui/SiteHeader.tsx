import Link from "next/link";
import { LogoMark } from "@/components/ui/icons";

type NavLink = { href: string; label: string; active?: boolean };

export function SiteHeader({
  homeHref = "/",
  nav,
  trailing,
}: {
  homeHref?: string;
  nav?: NavLink[];
  trailing?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-[var(--sru-z-nav)] border-b border-line bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex h-nav max-w-6xl items-center justify-between gap-4 px-page">
        <Link
          href={homeHref}
          className="flex cursor-pointer items-center gap-2.5 text-ink no-underline transition-opacity duration-200 hover:opacity-80"
        >
          <LogoMark />
          <span className="font-sans text-body font-semibold tracking-tight">
            SRU-Conf
          </span>
        </Link>
        {nav && nav.length > 0 ? (
          <nav aria-label="Primary" className="flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={
                  item.active
                    ? "sru-nav-link sru-nav-link-active"
                    : "sru-nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
        {trailing ? (
          <div className="flex items-center gap-3">{trailing}</div>
        ) : null}
      </div>
    </header>
  );
}
