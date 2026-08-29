"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DESK_OBJECTS } from "@/lib/data";
import { usePageTransition } from "@/components/motion/page-transition";

gsap.registerPlugin(ScrollTrigger);

/**
 * Interactive, zero-copy desk diorama. Framer remains a mood reference only;
 * the composition below is tuned as responsive web geometry.
 */

const STAGE_W = 1152;
const STAGE_H = 560;

const pct = (px: number, total: number) => `${(px / total) * 100}%`;

/**
 * ┌─ TUNE THE DESK HERE ───────────────────────────────────────────────────┐
 * Values live on a 1152×560 responsive coordinate plane. The objects cover
 * roughly 75% of its width, leaving deliberate breathing room at both edges.
 * └────────────────────────────────────────────────────────────────────────┘
 */
const STAGE = {
  figurine: { x: 411, y: 65, w: 330, label: "Me🧇", z: 4 },
  objects: {
    folder: {
      x: 235,
      y: 180,
      size: 205,
      rotate: -4,
      z: 2,
      ease: "tween" as const,
    },
    phone: {
      x: 700,
      y: 72,
      size: 185,
      rotate: 8,
      z: 3,
      ease: "spring" as const,
    },
    coffee: {
      x: 705,
      y: 300,
      size: 200,
      rotate: 7,
      z: 3,
      ease: "spring" as const,
    },
  },
  status: { x: 95, y: 15 },
} as const;

type ObjectId = keyof typeof STAGE.objects;

export function Desk() {
  const sectionRef = useRef<HTMLElement>(null);
  const { navigate } = usePageTransition();

  const goAbout = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/how-i-work");
  };

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { duration: 0.9, ease: "power3.out" },
        scrollTrigger: {
          trigger: section,
          start: "top 92%",
          end: "top 18%",
          scrub: 0.5,
        },
      });

      timeline
        .fromTo(
          "[data-desk-title]",
          { autoAlpha: 0, y: -10 },
          { autoAlpha: 1, y: 0, duration: 0.55 },
          0,
        )
        .fromTo(
          "[data-desk-plane]",
          {
            autoAlpha: 0,
            y: -90,
            scaleX: 0.82,
            scaleY: 2.6,
            rotationX: -68,
          },
          {
            autoAlpha: 1,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotationX: 0,
            duration: 1.15,
            ease: "power3.inOut",
          },
          0.05,
        )
        .fromTo(
          "[data-desk-status]",
          { autoAlpha: 0, x: -24 },
          { autoAlpha: 1, x: 0, duration: 0.65 },
          0.35,
        )
        .fromTo(
          '[data-desk-item="folder"]',
          { autoAlpha: 0, x: -80, y: 24, rotation: -4 },
          { autoAlpha: 1, x: 0, y: 0, rotation: 0 },
          0.48,
        )
        .fromTo(
          '[data-desk-item="figurine"]',
          { autoAlpha: 0, y: 50, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1 },
          0.56,
        )
        .fromTo(
          '[data-desk-item="phone"]',
          { autoAlpha: 0, x: 65, y: -35, rotation: 7 },
          { autoAlpha: 1, x: 0, y: 0, rotation: 0 },
          0.63,
        )
        .fromTo(
          '[data-desk-item="coffee"]',
          { autoAlpha: 0, x: 70, y: 45, rotation: -5 },
          { autoAlpha: 1, x: 0, y: 0, rotation: 0 },
          0.7,
        );

      const idle = {
        folder: { y: -4, rotation: 0.35, duration: 4.2 },
        figurine: { y: -3, rotation: 0, duration: 3.8 },
        phone: { y: 5, rotation: 0.8, duration: 4.6 },
        coffee: { y: -4, rotation: -0.65, duration: 5.1 },
      } as const;

      for (const [id, motion] of Object.entries(idle)) {
        gsap.to(`[data-desk-idle="${id}"]`, {
          ...motion,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="desk"
      // section-snap: own stacking context + paper backdrop + snap target, so
      // the opening's DotField canvas can't bleed over this section.
      className="section-snap flex w-full flex-col justify-center overflow-hidden py-[22px]"
    >
      {/* max-width 1000 + 28px inline padding, mx-auto — copied exactly from
          .stack-inner (Arnav 2026-08-28, screenshot: "copy the position of
          stack") rather than the stage's own 1152px box below. The stage and
          Stack's content column are two different width systems on this
          page; matching the header to STAGE_W landed it 76px right of
          Stack's eyebrow at 1280px viewport (measured live: stack left
          132.5px vs desk 56.5px) — this matches Stack's left edge exactly
          instead of approximating it. */}
      <h2
        data-desk-title
        className="type-label section-eyebrow relative mx-auto mb-4 w-full max-w-[1000px] px-7 text-muted -left-[10px]"
      >
        THE DESK
      </h2>

      <div
        className="desk-stage relative mx-auto w-full"
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, maxWidth: STAGE_W }}
      >
        <div
          data-desk-plane
          aria-hidden
          className="desk-plane absolute"
        />

        <div
          data-desk-status
          className="absolute z-[6] flex items-center gap-2.5"
          style={{
            left: pct(STAGE.status.x, STAGE_W),
            top: pct(STAGE.status.y, STAGE_H),
          }}
        >
          <span
            aria-hidden
            className="desk-status-dot size-2 rounded-full bg-[var(--status-green)]"
          />
          <span className="type-label desk-status-label whitespace-nowrap text-ink">
            Open to freelance and full-time opportunities.
          </span>
        </div>

        {DESK_OBJECTS.map((obj) => {
          const cfg = STAGE.objects[obj.id as ObjectId];
          if (!cfg) return null;

          const isExternal = obj.href.startsWith("http");
          // Objects with no destination yet stay non-interactive rather than
          // rendering a link to nowhere (Drive URL still pending).
          const Tag = obj.href ? "a" : "div";

          return (
            <div
              key={obj.id}
              data-desk-item={obj.id}
              className="desk-item-shell absolute"
              style={{
                left: pct(cfg.x, STAGE_W),
                top: pct(cfg.y, STAGE_H),
                width: pct(cfg.size, STAGE_W),
                zIndex: cfg.z,
              }}
            >
              <span aria-hidden className="desk-ground-shadow" />

              <div data-desk-idle={obj.id} className="relative z-[1]">
                <Tag
                  {...(obj.href
                    ? {
                        href: obj.href,
                        ...(isExternal
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {}),
                      }
                    : {})}
                  aria-label={obj.label}
                  data-cursor="pointer"
                  className={`desk-object desk-object--${cfg.ease} block aspect-square w-full`}
                  style={{
                    ["--rot" as string]: `${cfg.rotate}deg`,
                  }}
                >
                  <Image
                    src={obj.asset}
                    alt=""
                    width={cfg.size * 2}
                    height={cfg.size * 2}
                    loading="eager"
                    className="h-full w-full select-none object-contain"
                    draggable={false}
                  />
                </Tag>
              </div>

              <span
                className="type-label desk-status-label pointer-events-none mt-3 block text-center text-muted"
              >
                {obj.label}
              </span>
            </div>
          );
        })}

        <div
          data-desk-item="figurine"
          className="desk-item-shell desk-item-shell--figurine absolute"
          style={{
            left: pct(STAGE.figurine.x, STAGE_W),
            top: pct(STAGE.figurine.y, STAGE_H),
            width: pct(STAGE.figurine.w, STAGE_W),
            zIndex: STAGE.figurine.z,
          }}
        >
          <span
            aria-hidden
            className="desk-ground-shadow desk-ground-shadow--figurine"
          />

          <div data-desk-idle="figurine" className="relative z-[1]">
            <Link
              href="/how-i-work"
              onClick={goAbout}
              aria-label="About Arnav"
              data-cursor="pointer"
              className="desk-figurine block"
            >
              <div className="desk-figurine-art">
                <Image
                  src="/assets/desk/figurine-waving.png"
                  alt="Waving toy figurine of Arnav"
                  width={STAGE.figurine.w * 2}
                  height={Math.round(STAGE.figurine.w * 1.34) * 2}
                  loading="eager"
                  fetchPriority="high"
                  className="h-auto w-full select-none object-contain"
                  draggable={false}
                />
              </div>
            </Link>
          </div>

          <span className="type-label desk-status-label mt-3 block text-center text-muted">
            {STAGE.figurine.label}
          </span>
        </div>
      </div>
    </section>
  );
}
