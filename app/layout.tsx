import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'KASDESK',
  description: "PWA keuangan pribadi mobile-first: catat pengeluaran harian, kelola dompet, tabungan, dan utang.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: 'KASDESK',
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0F",
  width: "device-width",
  initialScale: 1,
  // maximumScale / userScalable removed deliberately: disabling pinch-zoom
  // fails WCAG 2.2 SC 1.4.4 (Resize Text) and hurts low-vision users.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jetbrainsMono.variable} dark antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-text-primary">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
