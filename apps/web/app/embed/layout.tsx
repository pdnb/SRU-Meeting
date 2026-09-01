import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SRU-Conf embed",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
