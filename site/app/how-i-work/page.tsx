import type { Metadata } from "next";
import { AboutHero } from "@/components/sections/about-hero";
import { FooterNav } from "@/components/sections/footer-nav";

/**
 * Renamed from /about → /how-i-work (2026-08-14).
 *
 * The interview widget's header reads "Ask about me", which collided with both
 * the nav label and the route. The page is about METHOD, not biography, so the
 * route now says so and the nav label moved with it — renaming the route alone
 * would have left the visitor reading "ABOUT" next to "Ask about me" and kept
 * the clash. /about redirects here permanently (next.config.ts) so any link
 * already shared still resolves.
 */
export const metadata: Metadata = {
  title: "How I work — Arnav Gupta",
  description:
    "Can one person own the whole line, from idea to shipped? A case study on building with AI end to end.",
};

export default function HowIWorkPage() {
  return (
    <main className="flex flex-col">
      <AboutHero />

      {/* Shared with the home page. Rendered per-page rather than in
          providers.tsx because it must sit INSIDE #smooth-content and scroll
          with the document — chrome in providers is fixed to the viewport. */}
      <FooterNav />
    </main>
  );
}
