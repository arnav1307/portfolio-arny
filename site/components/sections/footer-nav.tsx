"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FOOTER_NAV } from "@/lib/data";
import { NavCharm } from "@/components/ui/nav-charm";
import { FooterGravity } from "@/components/ui/footer-gravity";

gsap.registerPlugin(ScrollTrigger);

/**
 * FooterNav — the closing band, shared by / and /about.
 *
 * Visual pass 2026-08-10 (copy untouched): big name mark, mono footnote stack,
 * hairline under the round corners, taller pad, theme-aware stone tokens, and
 * a short scroll-settle so the band arrives instead of just appearing.
 *
 * Two constraints:
 *   1. Must render INSIDE the page (never providers.tsx) — scrolls with doc.
 *   2. Colours from --footer-* only. Tokens now flip with the eye-toggle so
 *      the band participates in theme, without using --ink/--paper directly.
 */
export function FooterNav() {
  const band = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = band.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 36, autoAlpha: 0.55 },
        {
          y: 0,
          autoAlpha: 1,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            end: "top 72%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    }, el);

    // Waits on the real font before refreshing, not just one rAF.
    // ScrollTrigger.refresh() caches this trigger's start/end in pixels
    // against whatever is laid out at the moment it runs — if the
    // fallback font is still showing then, and the real one swaps in a
    // moment later (a wider/taller "Arnav." at clamp(28px, 3.2vw, 40px)
    // changes .footer-band's height), the cached range goes stale right
    // as a visitor reaches the bottom of the page, and the scroll
    // position visibly jumps once GSAP's ticker reconciles against the
    // new, now-correct range. footer-gravity.tsx already waits on
    // document.fonts.ready for the same reason — this brings the refresh
    // here in line with it instead of racing a single frame.
    let cancelled = false;
    let refreshFrame = 0;
    Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).then(() => {
      if (cancelled) return;
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(refreshFrame);
      context.revert();
    };
  }, []);

  return (
    <footer ref={band} className="footer-band">
      {/* Physics stage — sits behind the name/nav row, z-indexed under it.
          See footer-gravity.tsx for the full extraction/adaptation notes. */}
      <FooterGravity />

      <div className="footer-name-stack">
        <span className="footer-nav-name">{FOOTER_NAV.name}</span>
        {/* Moved from the opening's vertical rail (Arnav 2026-08-27: "2026 C
            can be moved under Arnav in the footer") — that rail slot now
            shows the live clock instead (section-rails.tsx). */}
        <span className="footer-nav-sub">
          2026 <span style={{ fontFamily: "var(--font-display)" }}>©</span>
        </span>
      </div>

      <div className="footer-right">
        {/* Charm hangs above "Powered by" (Arnav 2026-08-27: "make it look
            like it is hanging over there") — moved out of the fixed nav
            chrome entirely, see nav-charm.tsx for why. */}
        <NavCharm />
        <div className="footer-stack">
          <span className="footer-nav-sub">{FOOTER_NAV.poweredBy}</span>
          <span className="footer-nav-sub">{FOOTER_NAV.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
