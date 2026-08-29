"use client";

/**
 * AboutHero — /about, the job-portal case study.
 *
 * Two columns: a PINNED left metadata rail (Arnav: "1/3 of the screen is static")
 * and a normally-scrolling right long-form column. Modelled on
 * smritidesign.work/experiments/cursor-github; spec in CLAUDE.md
 * §ABOUT = JOB-PORTAL CASE STUDY.
 *
 * Three constraints worth keeping in mind when editing:
 *   1. Colours come from tokens only. Framer's raw hexes (#F0F4FA etc.) would
 *      survive the eye-toggle and strand this page in light mode.
 *   2. The rail is pinned with ScrollTrigger, NOT `position: sticky`.
 *      Historically sticky was impossible: ScrollSmoother's #smooth-wrapper was
 *      fixed with overflow:hidden and never actually scrolled, so sticky
 *      silently did nothing. Since the Lenis swap (2026-07-31) the document
 *      scrolls natively and sticky WOULD resolve — but the pin is kept because
 *      it already handles the endTrigger/pinSpacing behaviour this layout needs,
 *      and swapping it is a separate change with its own regression risk.
 */

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoother } from "@/components/motion/smooth-provider";
import { usePageTransition } from "@/components/motion/page-transition";
import { TerminalShot } from "@/components/ui/terminal-shot";
import { TedWalk } from "@/components/ui/ted-walk";
import { OPEN_AGENT_EVENT } from "@/components/ui/interview-agent";
import { TextArrowCta } from "@/components/ui/text-arrow-cta";
import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/ui/social-icons";
import {
  ABOUT_ICONS,
  CHIP_TINTS,
  type AboutIconName,
  type ChipTint,
} from "@/components/ui/about-icons";
import { CONTACT } from "@/lib/data";
import {
  ABOUT_EYEBROW,
  ABOUT_FACTS,
  ABOUT_QUOTE,
  ABOUT_SECTIONS,
  ABOUT_TAGS,
  ABOUT_TITLE,
} from "@/lib/about-data";
import { USE_ABOUT_ENTRANCE } from "@/lib/transition-flags";

/**
 * ┌─ TUNE THE LAYOUT HERE ──────────────────────────────────────────────────┐
 * Mirrors Framer's "About Content" frame: max 1136, gap 48, rail 260.
 * └─────────────────────────────────────────────────────────────────────────┘
 */
const LAYOUT = {
  maxWidth: 1136,
  gap: "48px",
  railWidth: "260px",
  /** Space between case-study blocks. */
  sectionGap: "clamp(48px, 7vh, 76px)",
  /** Clears the fixed nav. */
  topPad: "calc(var(--nav-h) + 48px)",
} as const;

export function AboutHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  // The pin is built AFTER the scroller exists so ScrollTrigger measures once
  // Lenis is driving the page; depending on the instance re-runs this effect
  // when it mounts.
  const smoother = useSmoother();
  const { navigate } = usePageTransition();

  useLayoutEffect(() => {
    const rail = railRef.current;
    const column = columnRef.current;
    if (!rail || !column) return;

    // gsap.matchMedia is used rather than a one-shot matchMedia read: it creates
    // the pin when the query becomes true and reverts it when it stops being
    // true, so a resize across the breakpoint is handled, and a viewport that
    // reports 0 width at mount (a backgrounded tab does this) recovers instead of
    // being stuck unpinned for the life of the page.
    const mm = gsap.matchMedia(sectionRef.current ?? undefined);

    mm.add(
      // Reduced motion → no pin; the provider also skips the smoother and the
      // CSS sticky fallback in globals.css takes over.
      // Below 901px the layout is one column, where pinning would strand the
      // rail over the copy. Matches the .about-rail breakpoint.
      "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
      () => {
        ScrollTrigger.create({
          trigger: rail,
          // Rest the rail below the fixed nav.
          start: "top top+=96",
          // Release when the scrolling column runs out, so the rail never
          // overshoots past the end of the case study.
          endTrigger: column,
          end: "bottom bottom",
          pin: rail,
          // The pin must not add scroll length — the right column governs the
          // page height on its own.
          pinSpacing: false,
          invalidateOnRefresh: true,
        });
      },
    );

    // Fonts and the terminal panel settle after first paint; without a refresh
    // the pin's start/end are measured against a shorter page.
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());

    // Entrance stagger after the curtain lifts (USE_ABOUT_ENTRANCE). Flip the
    // flag false to skip — content paints fully opaque with no y offset.
    let entrance: gsap.core.Tween | null = null;
    if (
      USE_ABOUT_ENTRANCE &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const pieces = gsap.utils.toArray<HTMLElement>(
        "[data-about-enter]",
        sectionRef.current ?? undefined,
      );
      if (pieces.length) {
        gsap.set(pieces, { autoAlpha: 0, y: 20 });
        entrance = gsap.to(pieces, {
          autoAlpha: 1,
          y: 0,
          duration: 0.62,
          stagger: 0.07,
          ease: "power2.out",
          // Curtain reveal is ~0.62s — land as it clears, not under it.
          delay: 0.28,
          onComplete: () => ScrollTrigger.refresh(),
        });
      }
    }

    return () => {
      cancelAnimationFrame(refresh);
      entrance?.kill();
      mm.revert();
    };
  }, [smoother]);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="w-full"
      style={{ paddingTop: LAYOUT.topPad, paddingBottom: "clamp(80px, 14vh, 160px)" }}
    >
      {/* Grid, not flex-wrap: a fixed rail track + one fluid track can't fight
          each other the way `basis-full` + `flex-1` did (the rail was claiming a
          whole row, stranding the column narrow with a large gap beside it).
          The single-column stack is a media query on .about-grid, not wrapping. */}
      <div
        className="about-grid mx-auto w-full px-4 sm:px-7"
        style={{ maxWidth: LAYOUT.maxWidth, gap: LAYOUT.gap }}
      >
        {/* ───────────────── LEFT RAIL (pinned) ───────────────── */}
        <aside
          ref={railRef}
          data-about-rail
          data-about-enter
          className="about-rail flex flex-col gap-6"
        >
          {/* Category chips — sized down 2026-08-26 (Arnav: "reduce the size
              and match the aesthetics" of the facts card text below it).
              Smaller padding + a slightly reduced font-size than the shared
              .type-label default, scoped to this chip row only. */}
          <div className="flex flex-wrap gap-2">
            {ABOUT_TAGS.map((tag) => (
              <span
                key={tag}
                className="type-label rounded-md bg-[var(--tint-rect)] px-2.5 py-1.5 text-[10.5px] text-ink-soft"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Facts card */}
          <div className="flex flex-col gap-[34px] rounded-2xl border border-line bg-paper-raised px-6 py-[30px]">
            {ABOUT_FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-2">
                <span className="about-fact-label">{fact.label}</span>
                <span className="about-fact-value flex items-start gap-2">
                  {"status" in fact && fact.status && (
                    <span
                      aria-hidden
                      // Same pulsing dot as the desk's OPEN TO WORK status.
                      className="desk-status-dot mt-[7px] size-2 shrink-0 rounded-full bg-[var(--status-green)]"
                    />
                  )}
                  {fact.value}
                </span>
              </div>
            ))}

            {/* Socials */}
            <div className="flex flex-col gap-3">
              <span className="about-fact-label">SOCIALS</span>
              <div className="flex items-center gap-4">
                <a
                  href={CONTACT.linkedin}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-cursor="pointer"
                  aria-label="LinkedIn"
                  className="text-ink transition-opacity hover:opacity-60"
                >
                  <LinkedInIcon />
                </a>
                <a
                  href={CONTACT.x}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-cursor="pointer"
                  aria-label="X"
                  className="text-ink transition-opacity hover:opacity-60"
                >
                  <XIcon />
                </a>
                <a
                  href={CONTACT.github}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-cursor="pointer"
                  aria-label="GitHub"
                  className="text-ink transition-opacity hover:opacity-60"
                >
                  <GitHubIcon />
                </a>
              </div>
            </div>
          </div>
        </aside>

        {/* ───────────────── RIGHT COLUMN (scrolls) ───────────────── */}
        <div ref={columnRef} data-about-column className="min-w-0 flex-1">
          <div data-about-enter>
            <TerminalShot />
          </div>

          <header
            data-about-enter
            className="mt-11 flex flex-col gap-4"
          >
            <span className="about-eyebrow">{ABOUT_EYEBROW}</span>
            <h1 className="about-heading">
              {ABOUT_TITLE}
            </h1>
          </header>

          <div
            className="mt-12 flex flex-col"
            style={{ gap: LAYOUT.sectionGap }}
          >
            {ABOUT_SECTIONS.map((section) => (
              <article
                key={section.small}
                data-about-enter
                className="flex flex-col gap-4"
              >
                <span className="about-eyebrow">{section.small}</span>
                <h2 className="about-heading">{section.big}</h2>

                {section.body.map((paragraph) => (
                  <p key={paragraph} className="about-body">
                    {paragraph.endsWith("I call him Ted.") ? (
                      <>
                        {paragraph.slice(0, -"Ted.".length)}
                        <u
                          role="button"
                          tabIndex={0}
                          data-cursor="pointer"
                          aria-label="Open the Ted interview widget"
                          onClick={() =>
                            window.dispatchEvent(new CustomEvent(OPEN_AGENT_EVENT))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              window.dispatchEvent(new CustomEvent(OPEN_AGENT_EVENT));
                            }
                          }}
                        >
                          Ted
                        </u>
                        .
                      </>
                    ) : (
                      paragraph
                    )}
                  </p>
                ))}

                {/* Simple dot bullets, cherry red (Arnav 2026-08-28: "the
                    arrows are weird" — replaces the ↳ glyph tried
                    2026-08-27). Plain circle reads as a bullet at a glance;
                    the arrow read as a stray direction cue instead. */}
                {"bullets" in section && section.bullets && (
                  <ul className="about-body flex flex-col gap-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-baseline gap-2">
                        <span
                          aria-hidden="true"
                          className="about-bullet-dot shrink-0"
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Pull-quote — the "In other words:" beat. Renders BETWEEN the
                    body and `afterQuote`, so prose resumes underneath it rather
                    than the quote closing the block. */}
                {"quote" in section && section.quote && (
                  <>
                    <p className="about-body">{section.quote.lead}</p>
                    <blockquote className="about-quote">
                      {section.quote.text}
                    </blockquote>
                  </>
                )}

                {/* `afterQuote` exists on exactly one section, so the const
                    assertion narrows it to {} on every other member of the
                    union — hence the explicit cast, same shape as the reads
                    above it. */}
                {"afterQuote" in section &&
                  (section.afterQuote as readonly string[]).map((paragraph) => (
                    <p key={paragraph} className="about-body mt-3.5">
                      {paragraph}
                    </p>
                  ))}

                {/* Insight cards — 2 above, 2 below. */}
                {"cards" in section && section.cards && (
                  <div className="about-cards">
                    {section.cards.map((card) => (
                      <div key={card.heading} className="about-card">
                        <span
                          className="about-card-chip"
                          style={
                            {
                              "--chip": CHIP_TINTS[card.tint as ChipTint],
                            } as React.CSSProperties
                          }
                        >
                          {ABOUT_ICONS[card.icon as AboutIconName]}
                        </span>
                        <span className="flex flex-col gap-2">
                          <span className="about-card-label">{card.label}</span>
                          <h3 className="about-card-heading">{card.heading}</h3>
                        </span>
                        <p className="about-card-body">{card.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Shift diagram — before / now, equal-width segments. */}
                {"shift" in section && section.shift && (
                  <div className="about-shift">
                    {[section.shift.before, section.shift.now].map((bar, i) => (
                      <div key={bar.label} className="about-shift-group">
                        <span
                          className={`about-shift-label${
                            i === 1 ? " about-shift-label--now" : ""
                          }`}
                        >
                          {bar.label}
                        </span>
                        <p className="about-body">{bar.lead}</p>
                        <div className="about-shift-bar">
                          {bar.segments.map((seg, j) => (
                            <span
                              key={seg}
                              className="about-shift-seg"
                              style={
                                {
                                  // Middle segment is the neutral fill in both
                                  // bars — it's the part that changed hands.
                                  "--seg":
                                    j === 1
                                      ? "var(--shift-neutral)"
                                      : i === 1
                                        ? j === 0
                                          ? "var(--chip-terracotta)"
                                          : "var(--chip-blue)"
                                        : "var(--paper-raised)",
                                } as React.CSSProperties
                              }
                            >
                              {seg}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="about-shift-foot">
                      <p className="about-body">{section.shift.close}</p>
                      <div className="about-shift-cols">
                        {section.shift.columns.map((col) => (
                          <div key={col.label} className="flex flex-col gap-1.5">
                            <span className="about-shift-col-label">
                              {col.label}
                            </span>
                            <span className="about-shift-col-body">{col.body}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Highlight card — the statement carried as a heading. */}
                {"highlight" in section && section.highlight && (
                  <div className="about-highlight">
                    <span
                      className="about-card-chip"
                      style={
                        {
                          "--chip":
                            CHIP_TINTS[section.highlight.tint as ChipTint],
                        } as React.CSSProperties
                      }
                    >
                      {ABOUT_ICONS[section.highlight.icon as AboutIconName]}
                    </span>
                    <span className="flex flex-col gap-3">
                      <span className="about-card-label">
                        {section.highlight.label}
                      </span>
                      <h3 className="about-highlight-heading">
                        {section.highlight.heading}
                      </h3>
                    </span>
                    <p className="about-highlight-body">
                      {section.highlight.body}
                    </p>
                  </div>
                )}

                {/* Only one section still carries `after` now that three blocks
                    became cards/diagram/highlight, so the const assertion
                    narrows it to {} elsewhere in the union — same cast as
                    `afterQuote` above. */}
                {"after" in section &&
                  (section.after as readonly string[]).map((paragraph) => (
                    <p key={paragraph} className="about-body">
                      {paragraph}
                    </p>
                  ))}
              </article>
            ))}
          </div>

          {/* Closing quote. Sits above ← BACK so it is the last thing read, not
              the last thing clicked. Uses the existing tokens only (--line for
              the rule, text-muted for the ink) so the eye-toggle still flips it.
              Purely presentational, no hooks, no layout risk to the pinned rail. */}
          <figure
            data-about-enter
            className="relative mt-20 border-t border-line pt-10 text-center"
          >
            {/* Walks the rule above the quote like a ledge. Purely decorative and
                aria-hidden; the border it stands on is the <figure>'s own
                border-top, so he can never drift off the line. */}
            <TedWalk />

            <blockquote
              className="font-display text-muted"
              style={{
                fontSize: "clamp(1.25rem, 2.2vw, 1.75rem)",
                fontWeight: 300,
                letterSpacing: "-0.02em",
              }}
            >
              {ABOUT_QUOTE}
            </blockquote>
          </figure>

          {/* Back to home — the nav has no "back", so the page ends with one.
              Reverse Text Arrow CTA (Arnav 2026-08-26: same component as
              Selected Work's CTA, mirrored). */}
          <TextArrowCta
            href="/"
            reverse
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
            className="mt-16"
          >
            Back
          </TextArrowCta>
        </div>
      </div>
    </section>
  );
}
