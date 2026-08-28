"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { EXPERIENCE_COPY, ROLES } from "@/lib/experience-data";
import { Reveal } from "@/components/motion/reveal";

/**
 * Experience — accordion list (spec §1).
 *
 * ⚠️ The copy in lib/experience-data.ts is a DRAFT pending Arnav's review.
 *
 * The list ⇄ timeline toggle and the whole timeline view were REMOVED
 * 2026-07-31 (Arnav) — the list is the only view now, so there is nothing to
 * toggle. `components/sections/experience-timeline.tsx` was deleted with it.
 *
 * Accordion rules: exactly one row open at a time, the current role (canon)
 * open on first render. Height is animated with GSAP, never framer-motion —
 * declarative motion is broken in this stack and freezes at the initial state
 * (CLAUDE.md §Tech stack).
 */

/** Slowed from 0.55 → 1.05s (Arnav 2026-07-31: "too quick, slow it down"). */
const OPEN_EASE = "power3.inOut";
const OPEN_DURATION = 1.05;

export function Experience() {
  // Canon is the current role and opens first (spec §1).
  const [openId, setOpenId] = useState<string | null>(ROLES[0].id);
  const bodies = useRef(new Map<string, HTMLDivElement>());
  /** Read by the mount effect, which must not re-run when openId changes. */
  const openIdRef = useRef<string | null>(ROLES[0].id);

  const registerBody = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (node) bodies.current.set(id, node);
      else bodies.current.delete(id);
    },
    [],
  );

  // Closed rows start collapsed. Done ONCE on mount rather than via an inline
  // style prop, which React would reapply on every toggle and clobber the
  // in-flight collapse tween.
  useLayoutEffect(() => {
    for (const [id, el] of bodies.current) {
      if (id !== openIdRef.current) gsap.set(el, { height: 0 });
    }
    // Mount only — later state changes are driven by toggle().
  }, []);

  /**
   * Animates height between 0 and auto. GSAP measures the natural height, then
   * tweens to it and clears the inline value so later layout changes (a resize,
   * a font swap) don't leave a stale pixel height behind.
   */
  const toggle = useCallback(
    (id: string) => {
      const next = openId === id ? null : id;
      const previous = openId;
      setOpenId(next);
      openIdRef.current = next;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      /**
       * Open and close are strict mirrors: same property, same duration, same
       * ease, both from an explicit pixel height.
       *
       * ⚠️ Do NOT put `autoAlpha` (or `visibility`) back in here. That was the
       * real desync Arnav kept seeing: `autoAlpha` flips `visibility` at the
       * START of a collapse but only at the END of an expand, so a closing row
       * blinked out instantly while an opening row faded in over the full
       * duration — the heights matched, the perceived motion did not.
       * Height alone, with overflow:hidden on .experience-body, is the reveal.
       */
      const collapse = (el: HTMLDivElement) => {
        if (reduced) {
          gsap.set(el, { height: 0 });
          return;
        }
        // Pin the current pixel height first so the tween has a real start —
        // "auto" is not an animatable value.
        gsap.set(el, { height: el.scrollHeight });
        // `overwrite: true` (not "auto"): kill any in-flight tween on THIS
        // element outright, so a fast open→close→open never leaves two tweens
        // fighting over the same height.
        gsap.to(el, {
          height: 0,
          duration: OPEN_DURATION,
          ease: OPEN_EASE,
          overwrite: true,
        });
      };

      const expand = (el: HTMLDivElement) => {
        if (reduced) {
          gsap.set(el, { height: "auto" });
          return;
        }
        gsap.fromTo(
          el,
          { height: 0 },
          {
            height: el.scrollHeight,
            duration: OPEN_DURATION,
            ease: OPEN_EASE,
            overwrite: true,
            // Release to auto so later reflows aren't locked to a stale pixel
            // height (a font swap or resize would otherwise clip the copy).
            onComplete: () => gsap.set(el, { height: "auto" }),
          },
        );
      };

      if (previous && previous !== next) {
        const el = bodies.current.get(previous);
        if (el) collapse(el);
      }

      if (next) {
        const el = bodies.current.get(next);
        if (el) expand(el);
      }
    },
    [openId],
  );

  return (
    <section id="experience" className="experience-section">
      <div className="experience-inner">
        <div className="experience-head">
          <div>
            <p className="type-label section-eyebrow text-muted">{EXPERIENCE_COPY.eyebrow}</p>
            <h2 className="experience-title">{EXPERIENCE_COPY.title}</h2>
          </div>

          {/* The list ⇄ timeline toggle was REMOVED 2026-07-31 (Arnav): the
              timeline view is gone, so there is nothing to switch between. */}
        </div>

        {/* 80ms between rows, per spec §0. */}
        <Reveal selector=".experience-row" stagger={0.08}>
          <ul className="experience-list">
            {ROLES.map((role) => {
              const isOpen = openId === role.id;
              return (
                <li key={role.id} className="experience-row" data-open={isOpen}>
                  <button
                    type="button"
                    data-cursor="pointer"
                    className="experience-row-head"
                    aria-expanded={isOpen}
                    onClick={() => toggle(role.id)}
                  >
                    <span className="experience-logo">
                      <Image
                        src={`/icons/companies/${role.logo}`}
                        alt=""
                        width={88}
                        height={88}
                        className="experience-logo-img"
                      />
                      {/* The green "current role" dot was removed 2026-07-31
                          (Arnav) — the duration column already says
                          "to present". */}
                    </span>

                    <span className="experience-id">
                      <span className="experience-company">{role.company}</span>
                      <span className="experience-role">{role.role}</span>
                    </span>

                    <span className="experience-duration">{role.duration}</span>

                    <span className="experience-chevron" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="14" height="14">
                        <path
                          d="M3 6l5 5 5-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>

                  {/* ⚠️ NO inline `style` here. React re-renders on every
                      toggle, and a `style={{height: 0}}` prop reapplied
                      mid-tween snapped the closing row shut instantly — that
                      was the "closing is awkward and quick" desync. GSAP owns
                      this element's height exclusively; the initial closed
                      state is set once, on mount, in the effect below. */}
                  <div
                    ref={registerBody(role.id)}
                    className="experience-body"
                  >
                    <div className="experience-body-inner">
                      <p className="experience-summary">{role.summary}</p>
                      <hr className="experience-rule" />
                      <ul className="experience-bullets">
                        {role.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
