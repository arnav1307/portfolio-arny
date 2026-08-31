import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * /about → /how-i-work, renamed 2026-08-14.
   *
   * Permanent (308), because the old path is never coming back and any link
   * already shared — a CV, a LinkedIn post, a message to a recruiter — must
   * still land. Without this the rename silently 404s exactly the people the
   * site exists for.
   */
  async redirects() {
    return [
      {
        source: "/about",
        destination: "/how-i-work",
        permanent: true,
      },
    ];
  },

  /**
   * Security headers (2026-08-31 review). None of these existed before.
   *
   * The one that actually mattered is CLICKJACKING. Without `frame-ancestors`
   * any site could iframe this one invisibly over their own UI and harvest
   * clicks — and a click here can fire /api/ask (spends Anthropic credit) or
   * /api/speak (spends the ElevenLabs quota). The session token is issued to
   * any browser that loads the page, so a framed victim mints a VALID token and
   * the guard in agent-guard.ts sees a legitimate request. The Console spend
   * cap bounds the damage but does not prevent it.
   *
   * ⚠️ CSP IS Report-Only ON PURPOSE, and this is the whole reason:
   *   - app/layout.tsx runs an INLINE <script> before paint to set the theme.
   *     Enforcing `script-src 'self'` kills it and every visitor gets a flash
   *     of the wrong theme. Fixing that properly needs a nonce, which needs
   *     middleware, which means the whole site stops being statically
   *     prerendered — a real cost for a portfolio.
   *   - Cal.com injects its own embed script and iframe at runtime.
   *   - `unsafe-inline`/`unsafe-eval` are present because Next's own runtime
   *     needs them without a nonce; a CSP carrying both blocks very little,
   *     so ENFORCING this exact policy would buy near-nothing while risking
   *     the booking flow.
   * Report-Only means violations are reported and NOTHING breaks. Read the
   * reports, tighten, and only then flip the key to
   * "Content-Security-Policy". Do not flip it blind.
   *
   * frame-ancestors is the exception: it is NOT enforceable via Report-Only,
   * so X-Frame-Options carries the clickjacking protection for real.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline'/'unsafe-eval': Next's runtime + the pre-paint theme
      // script. cal.com serves the booking embed.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.cal.com https://cal.com",
      "style-src 'self' 'unsafe-inline'",
      // data: covers the inlined cursor SVGs; blob: covers the TTS audio Blob.
      "img-src 'self' data: blob: https://app.cal.com https://cal.com",
      "font-src 'self' data:",
      // api.anthropic.com and api.elevenlabs.io are called SERVER-side only, so
      // they are deliberately absent — the browser never talks to them.
      "connect-src 'self' https://app.cal.com https://cal.com",
      "frame-src 'self' https://app.cal.com https://cal.com",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      // ⚠️ NO `upgrade-insecure-requests` here. It is IGNORED in a report-only
      // policy and the browser logs a console error on every page load saying
      // so. Vercel serves HTTPS only and HSTS above already forces it, so the
      // directive buys nothing even when the policy is enforced later.
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          // The real clickjacking control (see frame-ancestors note above).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No feature on this site needs any of these.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          // Vercel serves HTTPS only; 2 years + preload is the standard value.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
