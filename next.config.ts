import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  extendDefaultRuntimeCaching: false,
  workboxOptions: {
    skipWaiting: false,
    clientsClaim: true,
    runtimeCaching: [
      { urlPattern: /\/api\//, handler: "NetworkOnly" },
      { urlPattern: ({ request }) => request.mode === "navigate", handler: "NetworkOnly" },
      {
        urlPattern: /\.(?:png|jpg|jpeg|webp|svg|ico|woff2)$/i,
        handler: "CacheFirst",
        options: { cacheName: "kasdesk-static", expiration: { maxEntries: 80, maxAgeSeconds: 2592000 } },
      },
    ],
  },
});

/**
 * Security headers.
 *
 * Deliberately conservative. Each one closes a real risk without a strict
 * policy that would break the app:
 *
 *  - nosniff stops a browser guessing a type and executing a response as
 *    script when the server said something else. The receipt-upload route
 *    returns status codes and small JSON bodies; without this a crafted
 *    response could be sniffed into HTML.
 *
 *  - DENY on framing prevents clickjacking — a payment app being framed by a
 *    look-alike site is a real phishing shape.
 *
 *  - Referrer-Policy keeps wallet/receipt URLs out of the Referer header sent
 *    to third parties. Query strings and paths here are user data.
 *
 *  - Permissions-Policy turns off APIs this app never uses, so a future
 *    dependency cannot quietly start requesting them. Camera is NOT listed:
 *    the receipt scanner uses a file input, not getUserMedia, so the default
 *    applies and a native "take photo" flow keeps working.
 *
 *  - CSP is enforced. Inline bootstrap/style allowances remain narrowly scoped
 *    to the current Next.js runtime and should move to nonces when supported.
 */
const securityHeaders = [
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      // Next injects inline bootstrap scripts; 'unsafe-inline' here is what a
      // strict CSP would have to replace with nonces before enforcement.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "font-src 'self' data:",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["lucide-react"] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default withPWA(nextConfig);
