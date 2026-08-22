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
};

export default nextConfig;
