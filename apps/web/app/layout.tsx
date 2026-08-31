import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SRU-Conf",
  description: "Self-hosted video conference",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
