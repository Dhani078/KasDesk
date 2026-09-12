import type { Metadata, Viewport } from "next";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL('https://kas-desk.vercel.app'),
  title: 'KASDESK',
  description: "PWA keuangan pribadi mobile-first: catat pengeluaran harian, kelola dompet, tabungan, dan utang.",
  manifest: "/manifest.json",
  alternates: {
    canonical: '/',
  },
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
      className="dark antialiased"
    >
      <body className="min-h-full flex flex-col bg-canvas text-text-primary">
        {children}
      </body>
    </html>
  );
}
