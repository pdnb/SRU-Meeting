import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "SRU-Conf",
  description: "Self-hosted video conference",
  applicationName: "SRU-Conf",
  appleWebApp: {
    capable: true,
    title: "SRU-Conf",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f5c56",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
