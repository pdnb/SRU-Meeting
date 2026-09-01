import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-page py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-body font-medium text-ink">SRU-Meeting</p>
          <p className="mt-1 text-caption text-muted">
            Self-hosted campus video conference
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-caption">
          <Link href="/docs" className="sru-text-link">
            API docs
          </Link>
          <Link href="/dev/poc" className="sru-text-link">
            Media PoC
          </Link>
          <Link href="/login" className="sru-text-link">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
