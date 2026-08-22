"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoother } from "@/components/motion/smooth-provider";

gsap.registerPlugin(ScrollTrigger);

/**
 * Nav charm — lemon-and-chilis good-luck totem (nazar-style), hanging under the
 * nav's Amsterdam clock. HOME PAGE ONLY. Locked values, CLAUDE.md §Nav charm:
 *
 *   - 34px wide, height auto (source aspect preserved)
 *   - swing ±6deg, 4.2s ease-in-out, infinite
 *   - transform-origin: top center — it pivots from the string like a real
 *     hanging object
 *   - GSAP, not framer-motion (declarative motion is broken in this stack)
 *
 * ⚠️ Must render OUTSIDE #smooth-content (as a sibling of nav/cursor/curtain in
 * providers.tsx) or ScrollSmoother's transform drags it down the page.
 *
 * The asset is `nav-charm.png`, re-cut from design/moodboard/lc1.png on
 * 2026-07-31. lc1.png's "transparency" was fake — it had an alpha channel but a
 * flat opaque (247,247,247) fill, which showed as a grey box on dark
 * backgrounds. This version is a real border-flood cutout, so the lemon's own
 * white highlights are preserved while the background is genuinely alpha 0.
 */

const WIDTH = 34;
/** Source is 860×959. */
const RATIO = 959 / 860;

export function NavCharm() {
  const ref = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";
  // The fade below is a ScrollTrigger, so it can only be built once the
  // smoother exists — otherwise it measures against the wrong scroller.
  const smoother = useSmoother();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !isHome) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tween = gsap.fromTo(
      el,
      { rotate: -6 },
      {
        rotate: 6,
        duration: 4.2 / 2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        transformOrigin: "top center",
      },
    );

    return () => {
      tween.kill();
    };
  }, [isHome]);

  // Charm belongs to the OPENING only (Arnav 2026-07-31: "should show on the
  // first page and not later"). It is fixed chrome, so without this it would
  // hang over every section below. Same anchor + window as the vertical rails,
  // so the two pieces of opening chrome leave together.
  //
  // ⚠️ Query BOTH ids — `USE_DP_OPENING` swaps `#opening` for `#opening-dp`.
  // Hunting only `#opening` made this effect no-op and the charm hung forever.
  useLayoutEffect(() => {
    const el = shell.current;
    const opening = document.querySelector<HTMLElement>(
      "#opening, #opening-dp",
    );
    if (!el || !isHome || !opening) return;

    const context = gsap.context(() => {
      gsap.set(el, { autoAlpha: 1 });
      gsap.to(el, {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: {
          trigger: opening,
          start: "bottom 90%",
          end: "bottom 55%",
          scrub: true,
          // Re-measure on resize/refresh. Without it the trigger keeps the
          // positions it computed at mount.
          invalidateOnRefresh: true,
        },
      });
    }, el);

    // The trigger is created in the same frame the scroller mounts, before
    // Lenis has settled the document height, so its start/end resolve against a
    // stale page and the fade never fires. One refresh after paint fixes it.
    // OpeningDP's pinSpacing also lands a frame late — second rAF catches it.
    let refresh2 = 0;
    const refresh1 = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      refresh2 = requestAnimationFrame(() => ScrollTrigger.refresh());
    });

    return () => {
      cancelAnimationFrame(refresh1);
      cancelAnimationFrame(refresh2);
      context.revert();
    };
  }, [isHome, smoother]);

  if (!isHome) return null;

  return (
    <div className="nav-charm" ref={shell}>
      <div
        ref={ref}
        className="nav-charm-swing"
        data-cursor="pointer"
        aria-label="No nazar please"
      >
        <Image
          src="/assets/nav-charm.png"
          alt=""
          width={WIDTH * 3}
          height={Math.round(WIDTH * RATIO * 3)}
          style={{ width: WIDTH, height: "auto" }}
          priority
        />
        <span className="nav-charm-tip" aria-hidden="true">
          No nazar please 👀
        </span>
      </div>
    </div>
  );
}
