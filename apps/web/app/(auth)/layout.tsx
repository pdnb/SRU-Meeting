import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a href="#main" className="sru-skip">
        Skip to content
      </a>
      <SiteHeader homeHref="/" />
      <div className="sru-hero-glow flex flex-1 items-center justify-center px-page py-12">
        <div className="sru-auth-panel">{children}</div>
      </div>
      <p className="border-t border-line py-6 text-center text-caption text-muted">
        <Link href="/" className="sru-text-link">
          Back to home
        </Link>
      </p>
    </div>
  );
}
