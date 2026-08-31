"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LocalTimeWidget } from "@/components/ui/local-time-widget";

gsap.registerPlugin(ScrollTrigger);

const RAIL = {
  inset: "16.41px",
  // Midpoint of the old amsterdamCenter (79.48%) / copyrightCenter (5.94%)
  // pair — WANT replaces both labels with one, sitting where the space
  // between them used to be, not where either one was.
  wantCenter: "42.71%",
} as const;

/**
 * Viewport chrome shared by Opening and Desk.
 *
 * It lives outside ScrollSmoother's transformed content, so it remains fixed
 * while those sections transition. When a third section exists, the rails
 * fade with the Desk → third-section scroll instead of entering that section.
 */
export function SectionRails() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = root.current;
    // Anchored to OPENING, not Desk. Desk used to be the second section, so it
    // was the right trigger; the 2026-07-30 reorder moved it to fifth (behind
    // Experience, Selected Work and Stack), which left the rails hanging over
    // three sections they were never meant to cross.
    // Both opening ids — `USE_DP_OPENING` ships `#opening-dp`, classic is `#opening`.
    const anchor = document.querySelector<HTMLElement>(
      "#opening, #opening-dp",
    );
    if (!element || !anchor) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const context = gsap.context(() => {
      gsap.set(element, { autoAlpha: 1 });

      if (reducedMotion) {
        ScrollTrigger.create({
          trigger: anchor,
          start: "bottom top",
          onEnter: () => gsap.set(element, { autoAlpha: 0 }),
          onLeaveBack: () => gsap.set(element, { autoAlpha: 1 }),
        });
        return;
      }

      // The fade must FINISH while the opening is still on screen, so the rails
      // are gone before Experience arrives — Arnav 2026-07-28: they belong to
      // the opening. Scrubbing to "bottom top" instead let them linger over the
      // sections that follow.
      gsap.to(element, {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: {
          trigger: anchor,
          start: "bottom 90%",
          end: "bottom 55%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    }, element);

    // Same reason as the nav charm: the trigger is built before Lenis settles
    // the document height, so it must re-measure after paint or the fade never
    // fires. Waits on the real font too (not just one rAF) — a fallback-font
    // refresh caches a stale range that a later font swap silently
    // invalidates, which is what produced the "scroll jumps near the
    // bottom" bug fixed in footer-nav.tsx; same shape here.
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
    <div
      ref={root}
      aria-hidden
      className="section-rails pointer-events-none fixed inset-x-0 bottom-0 z-[90]"
      style={{ top: "var(--nav-h)" }}
    >
      {/* WANT — replaces the old two-label pair (city name + live clock),
          sitting vertically in the space between where they used to be
          (RAIL.wantCenter is that pair's midpoint, not either label's own
          position). Same rotate/anchor technique as the labels it replaces:
          rotate(90deg) around left-center, translate(-50%, -50%) to center
          the rotated box on that point. This wrapper only positions and
          rotates — .local-time-widget's own flex-wrap/gap styling lives on
          LocalTimeWidget's root, untouched, so the same component still
          renders identically wherever else it's used (footer, mid-page). */}
      <div
        className="rail-want absolute whitespace-nowrap"
        style={{
          left: RAIL.inset,
          top: RAIL.wantCenter,
          transform: "rotate(90deg) translate(-50%, -50%)",
          transformOrigin: "left center",
        }}
      >
        <LocalTimeWidget />
      </div>
    </div>
  );
}
