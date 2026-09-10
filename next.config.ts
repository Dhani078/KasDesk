import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
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
 *  - CSP is REPORT-ONLY. It exists to surface violations in the browser
 *    console without blocking anything, because a strict enforcement policy
 *    needs the script/style sources of Next, the PWA service worker and
 *    Tailwind's runtime, and a wrong one is worse than none. Promote to
 *    enforcing once the reports are clean.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
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
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withPWA(nextConfig);
