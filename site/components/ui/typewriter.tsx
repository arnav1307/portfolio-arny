"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Typewriter — types a string forward, holds it, deletes it backward, loops.
 * Behaviour matches Arnav's screen recording frame-for-frame
 * (design/moodboard/Screen Recording 2026-07-27 at 7.55.53 PM.mov):
 * forward type → hold complete → faster backward delete → brief empty → repeat.
 *
 * The blue block caret (▮) is the only blue element; the text stays ink.
 * Nothing here is a link or clickable — the "blue click" in Arnav's brief turned
 * out to be that caret, not a hyperlink.
 *
 * Built with a plain timer rather than framer-motion (declarative animation is
 * broken in this stack — see memory motion-unreliable-use-css) or GSAP TextPlugin;
 * a character-index state machine is simpler and easier to tune.
 */

/**
 * ┌─ TUNE THE TYPING HERE ──────────────────────────────────────────────────┐
 * All timing lives in this object. Delete is deliberately faster than type,
 * as in the recording.
 * └─────────────────────────────────────────────────────────────────────────┘
 */
const TIMING = {
  /** ms per character while typing forward */
  typeMs: 55,
  /** ms per character while deleting backward — visibly quicker */
  deleteMs: 30,
  /** pause holding the complete string */
  holdMs: 1800,
  /** pause on empty before retyping */
  emptyMs: 600,
} as const;

type Phase = "typing" | "holding" | "deleting" | "empty";

export function Typewriter({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [started, setStarted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const hostRef = useRef<HTMLSpanElement>(null);

  // Reduced motion → show the finished string, never animate.
  // Subscribing to a platform API (matchMedia) is the sanctioned external-system
  // case for setState-in-effect; the initial read must also happen here because
  // matchMedia is unavailable during SSR.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Start on scroll-into-view, so the loop isn't already mid-cycle by the time
  // the section is reached. One-shot: once started it never re-arms.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || started) return;

    const begin = () => {
      setStarted(true);
      observer.disconnect();
      clearTimeout(fallback);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) begin();
      },
      { threshold: 0.4 },
    );
    observer.observe(host);

    // IntersectionObserver never fires in some environments — a backgrounded or
    // zero-size viewport reports nothing as intersecting, which would leave the
    // headline permanently blank. The reserve span means the layout is already
    // correct, so starting late costs nothing and never-starting is the only
    // real failure. Fires once if the observer has stayed silent.
    const fallback = setTimeout(begin, 2500);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [started]);

  // The state machine. Each phase schedules exactly one timer, then hands off.
  useEffect(() => {
    if (!started || reduced) return;

    let timer: ReturnType<typeof setTimeout>;

    switch (phase) {
      case "typing":
        if (count < text.length) {
          timer = setTimeout(() => setCount((n) => n + 1), TIMING.typeMs);
        } else {
          timer = setTimeout(() => setPhase("holding"), 0);
        }
        break;

      case "holding":
        timer = setTimeout(() => setPhase("deleting"), TIMING.holdMs);
        break;

      case "deleting":
        if (count > 0) {
          timer = setTimeout(() => setCount((n) => n - 1), TIMING.deleteMs);
        } else {
          timer = setTimeout(() => setPhase("empty"), 0);
        }
        break;

      case "empty":
        timer = setTimeout(() => setPhase("typing"), TIMING.emptyMs);
        break;
    }

    return () => clearTimeout(timer);
  }, [started, reduced, phase, count, text.length]);

  const visible = reduced ? text : text.slice(0, count);
  // Solid while characters are moving; blinking only during the two pauses.
  const blinking = reduced || phase === "holding" || phase === "empty";

  return (
    <span ref={hostRef} className={className}>
      {/* Real text for assistive tech + SEO. The animated copy below is hidden
          from the accessibility tree so the string isn't announced per keystroke. */}
      <span className="sr-only">{text}</span>

      {/* Invisible full-length copy reserves the final width and height, so the
          section never reflows as characters appear or disappear. The animated
          text is overlaid on top of it.

          `.typewriter-line` keeps nowrap on desktop (load-bearing: without it
          the overlay wrapped onto a second line when the caret no longer fit
          beside the last word — flicker at end of every cycle, Arnav
          2026-07-28). Below 720px globals.css allows wrap so the headline
          does not force horizontal page scroll. Reserve + overlay must share
          the same white-space so they measure identically. */}
      <span aria-hidden className="typewriter-line relative inline-block">
        {/* Trailing caret-width spacer: at full length the caret sits AFTER the
            last character, so the reserve must account for it too. */}
        <span className="invisible">{text}</span>
        <span className="type-caret invisible" />
        <span className="typewriter-line absolute inset-0">
          {visible}
          <span
            className={`type-caret${blinking ? " type-caret--blink" : ""}`}
          />
        </span>
      </span>
    </span>
  );
}
