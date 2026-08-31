import Link from "next/link";

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
      <header className="flex h-nav items-center border-b border-line px-page">
        <Link href="/" className="font-sans text-body font-semibold text-ink">
          SRU-Conf
        </Link>
      </header>
      {children}
    </div>
  );
}
