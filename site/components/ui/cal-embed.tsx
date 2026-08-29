"use client";

import { useEffect, useRef, useState } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";

/**
 * Cal.com inline embed (spec §3).
 *
 * Config is Arnav's verbatim: namespace "13", calLink "arnav-e4udwr/13",
 * month_view, useSlotsViewOnSmallScreen, and the light/dark cal-brand pair.
 *
 * ⚠️ Three integration constraints, all load-bearing:
 *   1. This must render INSIDE #smooth-content — it scrolls with the page.
 *      It is mounted from the Contact section, never from providers.tsx.
 *   2. The embed sets its own `overflow: scroll` internally, which can fight
 *      ScrollSmoother's normalizeScroll. `.cal-embed` therefore claims its own
 *      scroll context and marks itself data-lenis-prevent / ScrollTrigger-
 *      ignored, so wheel events over the calendar go to the calendar and
 *      everywhere else still goes to the smoother.
 *   3. The `<Cal>` iframe + its `embed.js` are NOT mounted until this section
 *      is near the viewport (Arnav 2026-08-28: "sometimes takes a lot of
 *      time to load"). Confirmed via the iframe's own `loading="auto"` (not
 *      "lazy") and a bare network check — nothing gated this heavy
 *      cross-origin load before; it fired on every page mount regardless of
 *      scroll position, competing with the opening's images/fonts/GSAP for
 *      bandwidth on a page where Contact is near the bottom. Same
 *      IntersectionObserver pattern as interview-agent.tsx's launcher reveal,
 *      for the same reason: no smoother to hang a ScrollTrigger on this deep
 *      in the tree, and IO survives the pinned/scrubbed OpeningDP with no
 *      refresh handling since it reads real viewport geometry, not scroll
 *      progress.
 */

/** Exported so the agent widget can link to the same calendar without keeping a
 *  second copy of the handle — two copies is how they drift apart. */
export const CAL_LINK = "arnav-e4udwr/13";
const CAL_NAMESPACE = "13";

export function CalEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);
  /** Once true, stays true — the point is to defer the first load, not to
      tear the iframe down again once a visitor has actually reached it. */
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || nearViewport) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNearViewport(true);
      },
      // Starts loading a little before it's actually on screen, so the
      // calendar is ready by the time a visitor finishes scrolling to it
      // rather than popping in after.
      { threshold: 0, rootMargin: "40% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [nearViewport]);

  /**
   * The embed is REMOUNTED on a theme flip rather than just re-configured.
   * `cal("ui", { theme })` only reliably applies to an embed that has not
   * rendered yet — pushing it at a live iframe left the calendar on its old
   * theme (Arnav 2026-07-31: "not switching the colors"). Keying the <Cal>
   * element on the theme forces a fresh iframe that boots with the right one.
   */
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setTheme(root.dataset.theme === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Same gate as the mount below — no point pushing theme config at the
    // Cal API before the embed has ever been asked to load.
    if (!nearViewport) return;
    let cancelled = false;
    const root = document.documentElement;

    /**
     * Push the SITE's current theme into the embed. Without this the calendar
     * resolves its own theme from the OS and can render a white panel on the
     * dark page (Arnav 2026-07-31: "on white bg cal should look white, on black
     * it should look black").
     */
    const apply = async () => {
      const cal = await getCalApi({ namespace: CAL_NAMESPACE });
      if (cancelled) return;
      const dark = root.dataset.theme === "dark";
      cal("ui", {
        theme: dark ? "dark" : "light",
        /**
         * `cal-brand` is the SELECTED-STATE colour (the filled day chip in
         * ss5), not the panel background — the panel follows `theme`. Setting
         * brand to the page's paper colour was what made the calendar read
         * wrong; it needs to be the INK so the chosen day is a dark chip on a
         * white card, exactly as in ss5.
         */
        cssVarsPerTheme: {
          light: {
            /* Re-tinted 2026-08-26 to the new cool #F0F5FE/#01060D palette —
               was the old warm beige/black values (#131211, #f1f0ee, etc). */
            "cal-brand": "#01060d",
            // The embed's own surfaces. Without these it inherits Cal's default
            // grey, which is what kept reading as "not white" against ss5.
            "cal-bg": "#ffffff",
            "cal-bg-emphasis": "#eef2fa",
            "cal-border": "#dbe3f0",
            "cal-border-emphasis": "#c3ced0",
            "cal-text": "#01060d",
            "cal-text-emphasis": "#01060d",
          },
          dark: {
            "cal-brand": "#f0f5fe",
            "cal-bg": "#10161f",
            "cal-bg-emphasis": "#1a212c",
            "cal-border": "#1a212c",
            "cal-text": "#f0f5fe",
            "cal-text-emphasis": "#f0f5fe",
          },
        },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    };

    void apply();

    // The eye-toggle flips data-theme on <html>; re-push on every flip.
    const observer = new MutationObserver(() => void apply());
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [nearViewport]);

  return (
    <div ref={containerRef} className="cal-embed" data-lenis-prevent>
      {nearViewport && (
        <Cal
          /* Remounts on a theme flip — see the note above. */
          key={theme}
          namespace={CAL_NAMESPACE}
          calLink={CAL_LINK}
          style={{ width: "100%", height: "100%", overflow: "scroll" }}
          config={{
            layout: "month_view",
            useSlotsViewOnSmallScreen: "true",
            theme,
          }}
        />
      )}
    </div>
  );
}
