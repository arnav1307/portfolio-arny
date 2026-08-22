"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const SmoothContext = createContext<Lenis | null>(null);

/**
 * Module-level handle on the live scroller.
 *
 * PageTransition RENDERS SmoothProvider (it is the outer component), so it
 * cannot read the context — but it must reset Lenis's internal position when a
 * route changes, or the next wheel event snaps back to the old page's offset.
 * A module singleton is the only way for a parent to reach it.
 */
export const lenisRef: { current: Lenis | null } = { current: null };

/**
 * Site-wide smooth scroll — Lenis (Arnav 2026-07-31: "use lenis motion to
 * scroll through pages and gsap on elements and components").
 *
 * ⚠️ HISTORY, so this isn't churned again: Lenis was here originally, replaced
 * by GSAP ScrollSmoother on 2026-07-26 because the two fight over the scroll
 * position and ScrollSmoother shares a scroll model with ScrollTrigger for
 * free. Swapping back was approved on 2026-07-31, so the bridge below is
 * MANDATORY — without it every pinned/scrubbed ScrollTrigger on the site
 * (the /about rail pin, the vertical rails, the nav charm fade) measures
 * against the native scroller while Lenis animates a transform, and they drift
 * apart.
 *
 * The bridge is three lines of contract:
 *   1. Lenis emits `scroll` → ScrollTrigger.update()
 *   2. GSAP's ticker drives Lenis's rAF, so both run on ONE loop
 *   3. lagSmoothing(0) — GSAP's frame-skip protection makes Lenis stutter
 *
 * Unlike ScrollSmoother, Lenis scrolls the real document, so there is no
 * #smooth-wrapper/#smooth-content transform. That means `position: fixed` and
 * `position: sticky` both behave natively again. The wrapper divs are kept ONLY
 * so existing CSS selectors and the page-transition curtain keep working.
 *
 * Reduced-motion: skip Lenis entirely, fall back to native scroll.
 */
export function SmoothProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Held in state (not a ref) so consumers re-render once it mounts and get the
  // live instance through context.
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const instance = new Lenis({
      // ~1.1s glide, matching the feel ScrollSmoother's `smooth: 1.1` had.
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Native momentum on touch — the old config used smoothTouch: 0.
      smoothWheel: true,
      syncTouch: false,
    });

    /**
     * ⚠️ NO SNAPPING — removed 2026-07-28, and it stays removed under Lenis.
     *
     * It caused three separate bugs Arnav hit: scrolling into Stack or Contact
     * threw you back to the desk, merely HOVERING a stack shape threw you back,
     * and the contact section couldn't be read without holding the scrollbar.
     *
     * The cause was structural: snap targets were `offsetTop` in DOCUMENT space
     * while progress was normalised over the scroll RANGE, so the last section
     * always normalised past 1.0 and was unreachable. Free scrolling is also
     * what the design wants — sections size to their content.
     */

    // ── The ScrollTrigger bridge ──
    instance.on("scroll", ScrollTrigger.update);

    const onTick = (time: number) => {
      // GSAP ticks in seconds, Lenis expects milliseconds.
      instance.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    // GSAP's lag smoothing skips frames after a stall, which reads as a stutter
    // when it is also driving the scroller.
    gsap.ticker.lagSmoothing(0);

    // Creating + exposing an imperative external system is the sanctioned
    // setState-in-effect case; runs once, torn down in cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLenis(instance);
    lenisRef.current = instance;

    // Root layouts persist during Next.js client navigation. Honor cross-page
    // hashes such as /about → /#desk after the new page's sections have
    // mounted.
    const hashFrame = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target) instance.scrollTo(target, { immediate: true });
    });

    /**
     * Re-measure on RESIZE (Arnav 2026-08-01: "if the user resizes the pages the
     * elements should be stuck where they are").
     *
     * Every ScrollTrigger computes its start/end in pixels when it is built. A
     * resize changes the document height and every section's offset, so without
     * a refresh the pinned /about rail, the charm and rail fades, and the
     * parallax all keep positions measured against the OLD viewport and drift
     * out of place.
     *
     * Debounced: a drag-resize fires continuously, and refreshing on every
     * event is expensive enough to stutter the scroller.
     */
    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        instance.resize();
        ScrollTrigger.refresh();
      }, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(hashFrame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(onTick);
      gsap.ticker.lagSmoothing(500, 33);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, [pathname]);

  return (
    <SmoothContext.Provider value={lenis}>
      {/* Kept for CSS/structure compatibility — Lenis scrolls the document, so
          these no longer transform anything. */}
      <div id="smooth-wrapper">
        <div id="smooth-content">{children}</div>
      </div>
    </SmoothContext.Provider>
  );
}

/** Access the scroller (e.g. nav CONTACT → scrollTo("#desk")). */
export function useSmoother(): Lenis | null {
  return useContext(SmoothContext);
}
