"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";

/**
 * Nav charm — lemon-and-chilis good-luck totem (nazar-style), now hanging in
 * the footer (moved from the nav 2026-08-27, Arnav: "towards the right side
 * but above Powered by, make it look like it is hanging over there").
 *
 * ⚠️ HISTORY: this used to be `position: fixed` chrome mounted in
 * providers.tsx, hanging directly under the nav's clock and fading out with
 * the opening section (home page only) — see git history / CLAUDE.md for
 * that version if it's ever needed again. It is now a plain, non-fixed
 * component rendered inline inside FooterNav, so:
 *   - no route gating (the footer renders on every page, so the charm does too)
 *   - no ScrollTrigger fade-with-opening (the footer isn't near the opening)
 *   - no `useSmoother()` dependency (nothing here needs scroll position)
 * Only the swing animation survives from the original — same locked values
 * (34px wide, ±6deg, 4.2s ease-in-out, infinite, pivoting from the string).
 */

const WIDTH = 34;
/** Source is 860×959. */
const RATIO = 959 / 860;

export function NavCharm() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
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
  }, []);

  return (
    <div className="footer-charm">
      <div
        ref={ref}
        className="footer-charm-swing"
        data-cursor="pointer"
        aria-label="No nazar please"
      >
        <Image
          src="/assets/nav-charm.png"
          alt=""
          width={WIDTH * 3}
          height={Math.round(WIDTH * RATIO * 3)}
          style={{ width: WIDTH, height: "auto" }}
        />
        <span className="footer-charm-tip" aria-hidden="true">
          No nazar please 🧿
        </span>
      </div>
    </div>
  );
}
