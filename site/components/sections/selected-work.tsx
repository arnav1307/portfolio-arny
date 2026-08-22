"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePageTransition } from "@/components/motion/page-transition";
import { Reveal } from "@/components/motion/reveal";
import { WORK_CARDS, WORK_COPY } from "@/lib/work-data";
import { USE_ROUTE_PREFETCH } from "@/lib/transition-flags";

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

  return (
    <section id="work" className="work-section">
      <div className="work-inner">
        <h2 className="type-label text-muted">{WORK_COPY.eyebrow}</h2>
        <p className="work-title">{WORK_COPY.title}</p>
        <p className="work-blurb">{WORK_COPY.blurb}</p>

        {/* 60ms between cards, per spec §0. */}
        <Reveal className="work-grid" selector=".work-card" stagger={0.06}>
          {WORK_CARDS.map((card) => (
            <article key={card.index} className="work-card">
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
                      {WORK_COPY.ndaTooltip}
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

        <Link
          href="/how-i-work"
          onClick={goAbout}
          onMouseEnter={prefetchAbout}
          onFocus={prefetchAbout}
          data-cursor="pointer"
          className="work-cta type-label"
        >
          {WORK_COPY.cta} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
