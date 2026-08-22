"use client";

import { useEffect, useState } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";

/**
 * Cal.com inline embed (spec §3).
 *
 * Config is Arnav's verbatim: namespace "13", calLink "arnav-e4udwr/13",
 * month_view, useSlotsViewOnSmallScreen, and the light/dark cal-brand pair.
 *
 * ⚠️ Two integration constraints, both load-bearing:
 *   1. This must render INSIDE #smooth-content — it scrolls with the page.
 *      It is mounted from the Contact section, never from providers.tsx.
 *   2. The embed sets its own `overflow: scroll` internally, which can fight
 *      ScrollSmoother's normalizeScroll. `.cal-embed` therefore claims its own
 *      scroll context and marks itself data-lenis-prevent / ScrollTrigger-
 *      ignored, so wheel events over the calendar go to the calendar and
 *      everywhere else still goes to the smoother.
 */

const CAL_LINK = "arnav-e4udwr/13";
const CAL_NAMESPACE = "13";

export function CalEmbed() {
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
            "cal-brand": "#131211",
            // The embed's own surfaces. Without these it inherits Cal's default
            // grey, which is what kept reading as "not white" against ss5.
            "cal-bg": "#ffffff",
            "cal-bg-emphasis": "#f1f0ee",
            "cal-border": "#e6e3dc",
            "cal-border-emphasis": "#d5d1c8",
            "cal-text": "#131211",
            "cal-text-emphasis": "#131211",
          },
          dark: {
            "cal-brand": "#f3f0e9",
            "cal-bg": "#1c1a18",
            "cal-bg-emphasis": "#2a2825",
            "cal-border": "#2a2825",
            "cal-text": "#f3f0e9",
            "cal-text-emphasis": "#f3f0e9",
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
  }, []);

  return (
    <div className="cal-embed" data-lenis-prevent>
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
    </div>
  );
}
