"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HomeButton } from "@/components/ui/home-button";
import { useSmoother } from "@/components/motion/smooth-provider";
import { usePageTransition } from "@/components/motion/page-transition";
import { TimeWidget } from "@/components/ui/time-widget";
import { EyeToggle } from "@/components/ui/eye-toggle";
import { USE_ROUTE_PREFETCH } from "@/lib/transition-flags";

/**
 * Shared site chrome (v3 "Site Chrome" template) — identical on / and /about.
 * Left: AMSTERDAM live time. Right: CLICK label + eye-toggle (theme flip),
 * ABOUT (/about), CONTACT (smooth-scroll to #desk on home).
 *
 * Link type is Satoshi bold (.nav-link) as of 2026-07-30 — the mono
 * .type-label it used before is now reserved for section eyebrows.
 */
export function Nav() {
  const smoother = useSmoother();
  const { navigate } = usePageTransition();
  const router = useRouter();
  const pathname = usePathname();
  const isAbout = pathname?.startsWith("/how-i-work");

  const prefetchAbout = () => {
    if (USE_ROUTE_PREFETCH) router.prefetch("/how-i-work");
  };
  const prefetchHome = () => {
    if (USE_ROUTE_PREFETCH) router.prefetch("/");
  };

  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
  };

  // Route changes play the curtain wipe first (page-transition.tsx); a plain
  // Link would swap the DOM instantly and skip it.
  const goAbout = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/how-i-work");
  };

  const goContact = (e: React.MouseEvent) => {
    e.preventDefault();
    // On the home page this is an in-page scroll, so no curtain — wiping the
    // screen to move within the same page would read as a bug.
    const desk = document.getElementById("desk");
    if (desk) {
      // Lenis signature (2026-07-31 swap): scrollTo(target, options).
      if (smoother) smoother.scrollTo(desk);
      else desk.scrollIntoView({ behavior: "smooth" });
      return;
    }
    // Coming from /about it IS a route change, so play the curtain.
    navigate("/#desk");
  };

  // Layout mirrors the Framer "Site Chrome" nav: padding 20/24, space-between,
  // LEFT = clock only, RIGHT = toggle → ABOUT → CONTACT at gap 22px.
  return (
    <header className="nav-shell fixed inset-x-0 top-0 z-[100] flex items-center justify-between px-7 py-5">
      {/* Chrome follows the theme (ink on paper / paper on ink via tokens). */}
      <TimeWidget />

      <nav className="flex items-center gap-[22px]">
        {/* Hit Me sits immediately before the links (Framer Nav Links order). */}
        <EyeToggle />

        {isAbout ? (
          /* On /about the section links have nowhere to go — ABOUT would route
             to the page you're already on (it rendered blank) and CONTACT
             points at a section that doesn't exist here. A single Home mark
             replaces both. */
          <Link
            href="/"
            onClick={goHome}
            onMouseEnter={prefetchHome}
            onFocus={prefetchHome}
            data-cursor="pointer"
            aria-label="Back to home"
            className="nav-home text-ink"
          >
            <HomeButton />
          </Link>
        ) : (
          <>
            <Link
              href="/how-i-work"
              onClick={goAbout}
              onMouseEnter={prefetchAbout}
              onFocus={prefetchAbout}
              data-cursor="pointer"
              className="nav-link text-ink transition-opacity hover:opacity-60"
            >
              HOW I WORK
            </Link>
            <Link
              href="/#desk"
              onClick={goContact}
              data-cursor="pointer"
              className="nav-link text-ink transition-opacity hover:opacity-60"
            >
              CONTACT
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
