"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CONTACT } from "@/lib/data";
import { useAmsterdamTime } from "@/lib/use-amsterdam-time";

gsap.registerPlugin(ScrollTrigger);

const RAIL = {
  inset: "16.41px",
  amsterdamCenter: "79.48%",
  copyrightCenter: "5.94%",
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
    // fires.
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(refresh);
      context.revert();
    };
  }, []);

  const time = useAmsterdamTime();

  return (
    <div
      ref={root}
      aria-hidden
      className="section-rails pointer-events-none fixed inset-x-0 bottom-0 z-[90]"
      style={{ top: "var(--nav-h)" }}
    >
      {/* Not uppercase (Arnav 2026-08-27: "Amsterdam, Netherlands instead of
          caps") — `.type-label` forces text-transform:uppercase globally, so
          this needs its own override rather than relying on the shared
          class's default (removing it there would affect every eyebrow/tag
          on the site). See `.section-rails .rail-city` in globals.css. */}
      <span
        className="type-label rail-city absolute whitespace-nowrap text-muted"
        style={{
          left: RAIL.inset,
          top: RAIL.amsterdamCenter,
          transform: "rotate(90deg) translate(-50%, -50%)",
          transformOrigin: "left center",
        }}
      >
        {CONTACT.location.city}, Netherlands
      </span>

      {/* "2026 ©" moved to the footer, under Arnav. (Arnav 2026-08-27) — this
          slot now shows the live Amsterdam clock instead, matching the nav's
          own TimeWidget. */}
      <span
        className="type-label absolute whitespace-nowrap text-muted"
        style={{
          left: RAIL.inset,
          top: RAIL.copyrightCenter,
          transform: "rotate(90deg) translate(-50%, -50%)",
          transformOrigin: "left center",
        }}
      >
        <span className="tabular-nums">{time ?? "--:--:--"}</span>{" "}
        {CONTACT.location.label}
      </span>
    </div>
  );
}
