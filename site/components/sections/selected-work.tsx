"use client";

import { useRouter } from "next/navigation";
import { usePageTransition } from "@/components/motion/page-transition";
import { Reveal } from "@/components/motion/reveal";
import { TextArrowCta } from "@/components/ui/text-arrow-cta";
import { WORK_CARDS, WORK_COPY } from "@/lib/work-data";
import { USE_ROUTE_PREFETCH } from "@/lib/transition-flags";

/**
 * Lock icon, reused inside the NDA tooltip pill (Arnav 2026-08-26: "add a
 * lock sign beside 'this is under nda'"). Same glyph the badge itself already
 * used — see the inline SVG below in the .work-nda-icon span — duplicated
 * here rather than extracted into a shared component, since it's a 12-line
 * SVG used in exactly two places in one file.
 */
function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
      <path
        d="M4.5 7V5a3.5 3.5 0 017 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="3.25" y="7" width="9.5" height="6.25" rx="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Selected Work — 3 static project cards in one row (spec §5).
 *
 * ⚠️ Copy in lib/work-data.ts is a DRAFT pending Arnav's review.
 *
 * Only shahrozahmad.com's CONTENT SHAPE is borrowed (index/client header,
 * title, one-liner, problem/role rows, tag footer). Its visual style and motion
 * are explicitly NOT copied — Arnav: cards must be minimalist and static,
 * "people would be reading stuff so no weird animation."
 *
 * ⛔ The ONLY hover interaction in this entire section is the NDA lock →
 * dark pill tooltip reading "this is under nda" (locked 2026-07-30, do not
 * redesign the style or the text). No tilt, no 3D transform, no perspective,
 * no flip, no reveal-on-hover, nothing else moves. A quiet border shift on the
 * card is the one permitted affordance.
 *
 * The CTA routes through the existing page-transition curtain, the same way
 * every other internal link on the site does — no bespoke transition.
 */

export function SelectedWork() {
  const { navigate } = usePageTransition();
  const router = useRouter();

  const goAbout = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/how-i-work");
  };

  const prefetchAbout = () => {
    if (USE_ROUTE_PREFETCH) router.prefetch("/how-i-work");
  };

  /**
   * NDA tooltip follows the cursor anywhere over the card, rather than
   * sitting pinned to the badge's corner (Arnav 2026-08-26). Position is
   * written straight to the DOM via CSS custom properties on the card element
   * itself — no React state/re-render per mouse move, since a card can have
   * dozens of move events per second and re-rendering on each would be
   * needless work for a purely visual, non-layout-affecting position.
   *
   * ⚠️ Y is clamped, not just offset. The tooltip's CSS translates it UP and
   * OUT from the cursor point (so the pill sits above the pointer, not under
   * it) — near the top of the card that pushed the pill above the card's own
   * top edge. `.work-card` briefly got `overflow: hidden` to hide that, which
   * instead hid the tooltip ENTIRELY whenever the cursor was in the top ~30px
   * (Arnav: "the hover is gone"). Clamping the source coordinate is the right
   * fix — it keeps the tooltip visible and inside the card at every cursor
   * position, so overflow:hidden is no longer needed on the card at all.
   */
  const TOOLTIP_CLEARANCE_PX = 40;
  const positionTooltip = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = Math.max(TOOLTIP_CLEARANCE_PX, e.clientY - rect.top);
    card.style.setProperty("--work-nda-x", `${x}px`);
    card.style.setProperty("--work-nda-y", `${y}px`);
  };
  /**
   * ⚠️ onMouseEnter is required, not just onMouseMove. `:hover` (which drives
   * the tooltip's opacity) fires the instant the pointer enters the card —
   * but React's onMouseMove only fires on actual pointer movement, which
   * doesn't happen if someone enters the card and holds still. Without this,
   * that visitor saw the tooltip pop into view at the CSS fallback position
   * (the card's top-left corner, translated up-and-out of it) — reading as a
   * tooltip "detached" from the card entirely, floating in the page below it.
   * Seeding the position on enter closes that gap.
   */
  const handleCardMouseEnter = positionTooltip;
  const handleCardMouseMove = positionTooltip;

  return (
    <section id="work" className="work-section">
      <div className="work-inner">
        <p className="type-label section-eyebrow text-muted">{WORK_COPY.eyebrow}</p>
        <h2 className="work-title">{WORK_COPY.title}</h2>
        <p className="work-blurb">{WORK_COPY.blurb}</p>

        {/* 60ms between cards, per spec §0. */}
        <Reveal className="work-grid" selector=".work-card" stagger={0.06}>
          {WORK_CARDS.map((card) => (
            <article
              key={card.index}
              className="work-card"
              onMouseEnter={handleCardMouseEnter}
              onMouseMove={handleCardMouseMove}
            >
              <header className="work-card-head">
                <span className="work-index type-label">{card.index}</span>
                <span className="work-client type-label">{card.client}</span>
              </header>

              <h3 className="work-card-title">{card.title}</h3>

              <p className="work-oneliner">
                <span className="work-arrow" aria-hidden="true">
                  ↳
                </span>{" "}
                {card.oneLiner}
              </p>

              {/* <dl> mirrors the reference's structure — this part of the
                  content shape is deliberately kept. */}
              <dl className="work-rows">
                <div className="work-row">
                  <dt className="work-row-label type-label">problem</dt>
                  <dd className="work-row-value">{card.problem}</dd>
                </div>
                <div className="work-row">
                  <dt className="work-row-label type-label">role</dt>
                  <dd className="work-row-value">{card.role}</dd>
                </div>
              </dl>

              <footer className="work-card-foot">
                <span className="work-tags type-label">
                  {card.tagsBreakBefore != null ? (
                    <>
                      {card.tags.slice(0, card.tagsBreakBefore).join(" · ")}
                      <br />
                      {card.tags.slice(card.tagsBreakBefore).join(" · ")}
                    </>
                  ) : (
                    card.tags.join(" · ")
                  )}
                </span>

                {card.nda && (
                  <span className="work-nda" tabIndex={0}>
                    <span className="work-nda-icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="11" height="11">
                        <path
                          d="M4.5 7V5a3.5 3.5 0 017 0v2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                        <rect
                          x="3.25"
                          y="7"
                          width="9.5"
                          height="6.25"
                          rx="1.6"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span className="type-label">{WORK_COPY.ndaLabel}</span>
                    <span className="work-nda-tip" role="tooltip">
                      <LockGlyph /> {WORK_COPY.ndaTooltip}
                    </span>
                  </span>
                )}

                {!card.nda && card.badge && (
                  <span className="work-nda" tabIndex={0}>
                    <span className="type-label">{card.badge.label}</span>
                    <span className="work-nda-tip" role="tooltip">
                      {card.badge.tooltip}
                    </span>
                  </span>
                )}
              </footer>
            </article>
          ))}
        </Reveal>

        <TextArrowCta
          href="/how-i-work"
          className="work-cta"
          onClick={goAbout}
          onMouseEnter={prefetchAbout}
          onFocus={prefetchAbout}
        >
          {WORK_COPY.cta}
        </TextArrowCta>
      </div>
    </section>
  );
}
