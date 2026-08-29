"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HomeButton } from "@/components/ui/home-button";
import { useSmoother } from "@/components/motion/smooth-provider";
import { usePageTransition } from "@/components/motion/page-transition";
import { TimeWidget } from "@/components/ui/time-widget";
import { EyeToggle } from "@/components/ui/eye-toggle";
import { WorkIcon, StackIcon, ContactIcon, ApproachIcon } from "@/components/ui/nav-link-icons";
import { USE_ROUTE_PREFETCH } from "@/lib/transition-flags";

/**
 * Scroll distance before the bar starts hiding on scroll-down (/how-i-work
 * only, see hideOnScroll below). Small — the page has real content right
 * under the fold, so the bar should get out of the way early.
 */
const HIDE_SCROLL_THRESHOLD = 48;

/**
 * Shared site chrome (v3 "Site Chrome" template) — identical on / and /about.
 * Left: AG avatar mark + a separate thick glass pill (clock, eye-toggle,
 * section links). Link type is Satoshi bold (.nav-link).
 *
 * ⚠️ LOCKED 2026-08-27 (Arnav, ss12 reference): the pill is the permanent
 * look, present from first paint — there is no "static full-width bar that
 * shrinks into a pill on scroll" anymore. That two-state model (a `liquid`
 * boolean flipped past a scroll threshold) is GONE; a previous round's
 * screenshot showed the transition itself, which Arnav rejected ("not like
 * the way it does a transition from being static but instead stay like that
 * throughout"). Do not reintroduce a static/liquid distinction for the
 * pill's shape or size.
 *
 * What DOES still respond to scroll is visibility, and only on /how-i-work
 * (see hideOnScroll): the bar slides/fades away on scroll-down and back on
 * scroll-up, independent of the pill's own (now constant) shape.
 */
export function Nav() {
  const smoother = useSmoother();
  const { navigate } = usePageTransition();
  const router = useRouter();
  const pathname = usePathname();
  const isAbout = pathname?.startsWith("/how-i-work");
  /** /how-i-work only: true while scrolled down past the threshold AND the
   *  last scroll delta was downward. Direction-based, not position-based —
   *  see the effect below for why a pure "scrolled past X" flag (the old
   *  `liquid` state) reads as "weird" on this page (Arnav 2026-08-27: "does
   *  not smooth away in or out when scrolled up or down"). */
  const [hidden, setHidden] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastYRef = useRef(0);

  useEffect(() => {
    // Only /how-i-work runs this listener at all — home always shows the
    // bar (the pill's own look no longer changes with scroll, see the note
    // above). `hidden` can go stale (stay true) after navigating away from
    // /how-i-work mid-scroll, since nothing resets it here — that's fine,
    // because the rendered attribute below is `isAbout && hidden`, so a
    // stale true never reaches the DOM on any other route. Resetting it
    // here too would be a setState call in the effect body outside a
    // scroll/resize callback, which is the exact pattern the
    // react-hooks/set-state-in-effect lint rule flags.
    if (!isAbout) return;

    const read = () => {
      // Lenis exposes the live position as `.animatedScroll`, not a method —
      // caught this during implementation (an earlier draft called a
      // non-existent `.scroll()`).
      const y = smoother ? smoother.animatedScroll : window.scrollY;
      const goingDown = y > lastYRef.current;
      lastYRef.current = y;
      // Direction-based, not "past a fixed position" (the old `liquid`
      // threshold-only model): a visitor scrolling UP wants the bar back
      // immediately, regardless of how far down the page they are. A pure
      // position check only hides/shows once per threshold crossing, which
      // reads as the bar "sticking" on the way back up — Arnav's "does not
      // smooth away in or out when scrolled up or down" complaint. Near the
      // very top it always shows, so it doesn't flicker on a 2px jitter.
      setHidden(y > HIDE_SCROLL_THRESHOLD && goingDown);
      rafRef.current = null;
    };
    // rAF-throttled: Lenis/ScrollSmoother fire scroll updates every frame
    // already, so reading position on every one of those without throttling
    // would just double the work for no visual gain — one state check per
    // paint is all this needs.
    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(read);
    };
    read();
    if (smoother) {
      smoother.on("scroll", onScroll);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (smoother) smoother.off("scroll", onScroll);
      else window.removeEventListener("scroll", onScroll);
    };
  }, [smoother, isAbout]);

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

  /**
   * Shared in-page scroll handler for the three home-page section links
   * (Work → #experience, Stack → #stack, Contact → #desk). Same pattern as
   * the original single-purpose goContact: scroll on home (no curtain — a
   * wipe for moving within the same page would read as a bug), route+curtain
   * from anywhere else (e.g. from /how-i-work, these are real navigations).
   */
  const goSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      if (smoother) smoother.scrollTo(el);
      else el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate(`/#${id}`);
  };

  // /how-i-work LOCKED 2026-08-27 (Arnav: "remove the bar... just place the
  // icons regular how it was before" — reverting to the pre-pill layout for
  // this route only). No avatar, no glass pill, no fixed-height group — just
  // TimeWidget on the left and EyeToggle + HomeButton on the right, the same
  // plain fixed chrome this page had before the ss12 redesign. `hidden`
  // still applies (slides/fades away on scroll-down, back on scroll-up).
  if (isAbout) {
    return (
      <header
        data-hidden={hidden}
        className="nav-shell-group nav-plain-bar fixed inset-x-0 top-0 z-[100] flex items-center justify-between px-7 py-5"
      >
        <TimeWidget />
        <div className="flex items-center gap-[14px]">
          <EyeToggle />
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
        </div>
      </header>
    );
  }

  // Home LOCKED 2026-08-27 (Arnav, ss12 reference): two separate pieces —
  // an "AG" avatar circle, then a distinct thick glass pill holding the
  // eye-toggle and section links. Not one fused shape. `hidden` never
  // applies here — only /how-i-work's bar hides on scroll (see above).
  return (
    <div className="nav-shell-group fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-4 pt-4">
      <span className="nav-avatar" aria-hidden="true">
        AG
      </span>

      <header className="nav-shell flex items-center justify-between">
        {/* Time removed from the home pill 2026-08-27 (Arnav: "remove time
            from the nav bar, keep the toggle on one side") — the eye-toggle
            is now the sole left-side element. */}
        <EyeToggle />

        <nav className="flex items-center gap-[22px]">
          {/* Nav order locked 2026-08-27 (Arnav): Work → Stack → Contact →
              Approach. Work/Stack/Contact are in-page scrolls to their
              sections; Approach routes to /how-i-work (the case-study page
              built from lib/about-data.ts) via the curtain, same as the old
              HOW I WORK link did. Icons are outline glyphs, not emoji — see
              nav-link-icons.tsx for why. */}
          <Link
            href="/#experience"
            onClick={goSection("experience")}
            data-cursor="pointer"
            className="nav-link text-ink transition-opacity hover:opacity-60"
          >
            <WorkIcon />
            <span className="nav-link-text">Work</span>
          </Link>
          <Link
            href="/#stack"
            onClick={goSection("stack")}
            data-cursor="pointer"
            className="nav-link text-ink transition-opacity hover:opacity-60"
          >
            <StackIcon />
            <span className="nav-link-text">Stack</span>
          </Link>
          <Link
            href="/#desk"
            onClick={goSection("desk")}
            data-cursor="pointer"
            className="nav-link text-ink transition-opacity hover:opacity-60"
          >
            <ContactIcon />
            <span className="nav-link-text">Contact</span>
          </Link>
          <Link
            href="/how-i-work"
            onClick={goAbout}
            onMouseEnter={prefetchAbout}
            onFocus={prefetchAbout}
            data-cursor="pointer"
            className="nav-link text-ink transition-opacity hover:opacity-60"
          >
            <ApproachIcon />
            <span className="nav-link-text">Approach</span>
          </Link>
        </nav>
      </header>
    </div>
  );
}
