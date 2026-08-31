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
 * The home nav's four tabs, in Arnav's locked order (2026-08-27):
 * Work → Stack → Contact → Approach.
 *
 * Hoisted out of JSX into data 2026-08-30 for the sliding pill: the pill
 * measures tabs by index, so the links have to be a mappable list rather
 * than four hand-written elements, or every ref would be wired by hand and
 * the indices could drift out of step with the render order.
 *
 * `section` set → an in-page scroll (goSection). `section` null → a real
 * route change through the curtain (goAbout). Only the routing one prefetches.
 */
const NAV_TABS = [
  { label: "Work", href: "/#experience", section: "experience", Icon: WorkIcon, prefetch: false },
  { label: "Stack", href: "/#stack", section: "stack", Icon: StackIcon, prefetch: false },
  { label: "Contact", href: "/#desk", section: "desk", Icon: ContactIcon, prefetch: false },
  { label: "Approach", href: "/how-i-work", section: null, Icon: ApproachIcon, prefetch: true },
] as const;

/**
 * Slides the sliding-tab pill onto tab `idx`.
 *
 * The whole mechanic: read the target tab's own `offsetLeft`/`offsetWidth`
 * and write them as inline `transform`/`width`. Both properties are
 * transitioned in CSS (.nav-tabs-pill), so the browser tweens between the
 * PREVIOUS measured pair and this one — no hardcoded per-tab geometry, which
 * is what lets the same code work unchanged in the icon-only sub-900px layout
 * where every tab is far narrower than its desktop width.
 *
 * `animate: false` re-snaps instantly: the transition is stripped, the new
 * values written, a reflow forced (the `void offsetWidth` read), and the
 * transition restored. Without that forced read the browser coalesces all
 * three style writes into one frame and animates anyway.
 *
 * Module-level, not a component body function, deliberately: it touches only
 * the two refs handed to it and no reactive value, so defining it inside the
 * component would make it a new closure every render for no benefit — and the
 * react-hooks/immutability rule (correctly) rejects an effect reaching for a
 * component-scoped function declared below it.
 */
function movePill(
  pill: HTMLSpanElement | null,
  tab: HTMLAnchorElement | null,
  animate: boolean,
) {
  if (!pill || !tab) return;
  const left = tab.offsetLeft;
  const width = tab.offsetWidth;
  if (animate) {
    pill.style.transform = `translateX(${left}px)`;
    pill.style.width = `${width}px`;
    return;
  }
  const prev = pill.style.transition;
  pill.style.transition = "none";
  pill.style.transform = `translateX(${left}px)`;
  pill.style.width = `${width}px`;
  void pill.offsetWidth;
  pill.style.transition = prev;
}

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

  /**
   * Sliding-pill state for the home nav's four links.
   *
   * ⚠️ WHAT "ACTIVE" MEANS HERE, and why it is not scroll position.
   * Three of these four links are in-page scrolls (Work/Stack/Contact) and
   * the fourth (Approach) ROUTES to /how-i-work. A scroll-spy pill — the
   * usual choice for a one-page nav — can therefore never light Approach on
   * the home page, because there is no #approach section to be scrolled
   * into. A quarter of the bar would look permanently dead. So the pill
   * follows INTENT instead of position: it slides to whatever tab is
   * hovered or keyboard-focused, and falls back to the last tab the visitor
   * actually clicked once the pointer leaves. That reads as a CTA affordance
   * (what the user asked for) without claiming to report where on the page
   * you are, which would be a lie for one of the four.
   *
   * `committed` = last clicked, `hovered` = current pointer/focus target.
   * `null` in both retracts the pill entirely (see [data-armed] in CSS), so
   * the bar at rest looks exactly as it did before this change.
   */
  const [committed, setCommitted] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const shown = hovered ?? committed;

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

  /**
   * Drives the pill from `shown`, and re-snaps it on resize.
   *
   * The resize listener is the reason this is an effect at all: tab widths
   * are measured in px, so a viewport change (or the 900px breakpoint that
   * collapses the labels to icon-only) silently invalidates the last
   * measurement and would leave the pill sitting over the wrong tab. It
   * re-measures WITHOUT animating, because a pill gliding across the bar
   * while the window is being dragged reads as a glitch, not a transition.
   *
   * The first placement of a given tab is also un-animated: with the pill
   * starting at width 0 / translateX(0), animating into place would make it
   * grow out of the bar's left edge on the very first hover, regardless of
   * which tab was hovered. Subsequent moves animate normally.
   */
  useEffect(() => {
    if (isAbout) return;
    if (shown === null) return;
    const first = !pillRef.current?.style.width;
    // rAF so the measurement happens after layout has settled — reading
    // offsetLeft synchronously during the commit phase can catch stale
    // geometry on the very first paint, before fonts/icons have sized.
    const id = window.requestAnimationFrame(() =>
      movePill(pillRef.current, tabRefs.current[shown], !first),
    );
    const onResize = () => movePill(pillRef.current, tabRefs.current[shown], false);
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [shown, isAbout]);

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

        {/* Nav order locked 2026-08-27 (Arnav): Work → Stack → Contact →
            Approach. Work/Stack/Contact are in-page scrolls to their
            sections; Approach routes to /how-i-work (the case-study page
            built from lib/about-data.ts) via the curtain, same as the old
            HOW I WORK link did. Icons are outline glyphs, not emoji — see
            nav-link-icons.tsx for why.

            ⚠️ SEMANTICS — these stay plain LINKS, deliberately.
            The transitions.dev reference this pill mechanic comes from uses
            <button role="tab" aria-selected>, which is correct for a real
            tab widget that swaps panels in place. These do not: three
            navigate within the document and one loads a different route.
            Announcing them as tabs would tell a screen-reader user there are
            four panels here to switch between, and `aria-selected` would
            claim one is currently shown when nothing was ever selected. So
            there is no role="tablist"/role="tab"/aria-selected anywhere in
            this block. The pill is decoration: it is aria-hidden, and the
            visual "active" state rides on a plain data-attribute, which
            assistive tech ignores. `Link` keeps its own href semantics and
            the reduced-motion/keyboard paths for free. */}
        <nav
          className="nav-tabs"
          data-armed={shown !== null}
          onMouseLeave={() => setHovered(null)}
        >
          <span ref={pillRef} className="nav-tabs-pill" aria-hidden="true" />
          {NAV_TABS.map((tab, i) => (
            <Link
              key={tab.label}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              href={tab.href}
              // Click behaviour is UNCHANGED from before the pill landed:
              // the three section links still run goSection (Lenis scrollTo
              // on home, curtain-navigate from elsewhere) and Approach still
              // runs goAbout (curtain route). setCommitted is additive and
              // runs alongside, never instead of, the original handler.
              onClick={(e) => {
                setCommitted(i);
                if (tab.section) goSection(tab.section)(e);
                else goAbout(e);
              }}
              onMouseEnter={() => {
                setHovered(i);
                if (tab.prefetch) prefetchAbout();
              }}
              onFocus={() => {
                setHovered(i);
                if (tab.prefetch) prefetchAbout();
              }}
              onBlur={() => setHovered(null)}
              data-cursor="pointer"
              data-active={shown === i}
              className="nav-link text-ink"
            >
              <tab.Icon />
              <span className="nav-link-text">{tab.label}</span>
            </Link>
          ))}
        </nav>
      </header>
    </div>
  );
}
