import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";

import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "GemWallet - Expressive Budget PWA",
  description: "Mobile-first personal finance PWA with expressive Material-inspired motion.",
  applicationName: "GemWallet",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GemWallet",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--m3-surface)] text-[var(--m3-on-surface)]">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}

export const viewport: Viewport = {
  themeColor: "#12131a",
};
