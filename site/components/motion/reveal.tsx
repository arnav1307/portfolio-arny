"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoother } from "@/components/motion/smooth-provider";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-into-view reveal (spec §0).
 *
 * Every section element starts at `opacity: 0, translateY(12px)` and animates
 * to rest over 400ms on `cubic-bezier(0.16, 1, 0.3, 1)` — the site's
 * `--ease-signature`. Fires ONCE, slightly before the element is fully in view,
 * and does not replay on scroll-back.
 *
 * Implemented in GSAP, never framer-motion: declarative motion is broken in
 * this stack and freezes at the initial state (CLAUDE.md §Tech stack). The
 * reference uses Framer Motion; only the mechanism changes, the numbers carry.
 *
 * `stagger` is per-spec by section: 80ms between Experience rows, 60ms between
 * Selected Work cards, and Stack icons run at a 250ms duration instead of 400.
 */

const DURATION = 0.4;
const EASE = "power3.out";
const DISTANCE = 12;

/**
 * Differential-scroll parallax (CLAUDE.md open item #4).
 *
 * ScrollSmoother's `data-speed` / `data-lag` attributes died with the Lenis
 * swap (2026-07-31) — they were smoother-only. This is the equivalent built on
 * ScrollTrigger, which works against whatever scroller is driving the page, so
 * it survives the next swap too.
 *
 * `speed` > 1 moves the element FASTER than the page (it drifts up), < 1 slower
 * (it lags behind). 1 is no parallax. Keep it subtle: 0.85–1.15 reads as depth,
 * anything wider reads as a bug.
 */
export function Parallax({
  children,
  speed = 0.9,
  className,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const smoother = useSmoother();

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (speed === 1) return;

    const context = gsap.context(() => {
      // Shift over the element's own travel through the viewport. The distance
      // is proportional to how far off 1.0 the speed is, so 0.9 lags by 10% of
      // the scrolled distance.
      gsap.fromTo(
        el,
        { y: 0 },
        {
          y: () => (1 - speed) * (window.innerHeight * 0.5),
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    }, el);

    return () => context.revert();
  }, [speed, smoother]);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}

export function Reveal({
  children,
  selector,
  stagger = 0,
  duration = DURATION,
  className,
}: {
  children: React.ReactNode;
  /** Children to stagger. Omit to reveal the wrapper as one unit. */
  selector?: string;
  stagger?: number;
  duration?: number;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  // Rebuild once the scroller exists so ScrollTrigger measures against it.
  const smoother = useSmoother();

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = selector
      ? Array.from(el.querySelectorAll<HTMLElement>(selector))
      : [el];
    if (!targets.length) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: DISTANCE },
        {
          opacity: 1,
          y: 0,
          duration,
          ease: EASE,
          stagger,
          scrollTrigger: {
            trigger: el,
            // Slightly before fully in view, per the spec's -8% root margin.
            start: "top 92%",
            once: true,
            // Elements ABOVE the fold, or in a section whose trigger never
            // matches, would otherwise sit at opacity 0 forever. This reveals
            // anything already scrolled past on load.
            refreshPriority: -1,
          },
        },
      );

    }, el);

    // Measure once the page has settled, so triggers resolve against the real
    // document height (same reason as the nav charm / section rails).
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());

    /**
     * Fail-safe: if the trigger has not fired within a second, show the content
     * anyway. A reveal that silently hides copy is far worse than one that
     * skips its animation.
     *
     * ⚠️ Must be a plain setTimeout, NOT gsap.delayedCall — the whole point is
     * to survive a starved GSAP ticker (a throttled/backgrounded tab, or the
     * lagSmoothing(0) the Lenis bridge sets), and a GSAP-scheduled callback
     * dies with the same ticker it is meant to rescue.
     */
    const failsafe = window.setTimeout(() => {
      const hidden = targets.filter(
        (t) => Number(getComputedStyle(t).opacity) === 0,
      );
      for (const t of hidden) {
        t.style.opacity = "1";
        t.style.transform = "none";
      }
    }, 1000);

    return () => {
      cancelAnimationFrame(refresh);
      clearTimeout(failsafe);
      context.revert();
    };
  }, [selector, stagger, duration, smoother]);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
