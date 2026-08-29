"use client";

/**
 * OpeningDP — A/B candidate for the home opening, alongside the DotField
 * half-split `Opening` (untouched, still the default — see app/page.tsx's
 * USE_DP_OPENING flag). A bounded mood-board that scroll-scrubs into the same
 * hero content `Opening` shows, plus two buttons.
 *
 * Provenance, NOT to be re-derived or "corrected":
 *   - Image positions + the 16 assets: Arnav's own Framer project "DP"
 *     (fS3xsxI0CbMppVHyQ1Nx), read-only inspection 2026-08-01. Exact px +
 *     centerAnchor values in design/moodboard/dp-opening-v2/node-map.json.
 *   - Caption wording IS DP's own text, verbatim, confirmed by Arnav
 *     2026-08-02. (An earlier pass paraphrased it; that was reverted on his
 *     instruction — do not paraphrase it again.)
 *   - Layout target is inspiration/ss13.png: ONE bounded board, grid texture
 *     only inside it, objects sitting directly on the grid at modest scale.
 *   - Scroll mechanism reverse-engineered from smritidesign.work via
 *     firecrawl-interact (mechanism only) — scroll-scrubbed, fully reversible.
 *
 * Pin uses ScrollTrigger, same as the /about rail. The section deliberately
 * sets NO height: pinSpacing inserts exactly the pin duration, and giving the
 * section its own height clipped that spacer, which killed the scrub.
 */

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DotField from "@/components/vendor/DotField";
import { useSmoother } from "@/components/motion/smooth-provider";
import { OpeningHeroContent } from "@/components/sections/opening-hero-content";
import { FolderWithTools } from "@/components/ui/folder-with-tools";

/**
 * Dither, confined to the board box (Arnav 2026-08-02: "I don't want the
 * dotted field on the whole section, just in the centre in the box"). Fine and
 * wide-spaced so it reads as ss13's airy grid rather than a grey slab.
 *
 * `bulgeStrength` is driven from React state rather than being constant:
 * DotField reads `propsRef.current` fresh every frame, so changing the prop on
 * image hover makes the field react without forking the vendored file. Needed
 * because DotField's own engagement is MOUSE-SPEED based — a still cursor
 * resting on an image decays to zero and the dots settle flat.
 */
const DITHER = {
  dotRadius: 3,
  dotSpacing: 8,
  cursorRadius: 100,
  cursorForce: 0.01,
  /* Bulge OFF (Arnav 2026-08-02). With bulgeOnly false the field uses
     velocity-based scatter instead of pushing dots away from the cursor. */
  bulgeOnly: false,
  glowRadius: 10,
  sparkle: false,
  waveAmplitude: 0,
  gradientFrom: "#9a9a9a",
  gradientTo: "#9a9a9a",
  glowColor: "#6a6a6a",
} as const;

/** Stage + caption plates follow the eye-toggle via tokens (not hardcoded white). */
const STAGE_BG = "var(--paper)";
const STAGE_FG = "var(--ink)";

/**
 * DP's frame. Every object position below is a percentage of THIS box, so it
 * is the one coordinate space the whole board shares.
 */
const BOX_W = 1500;
const BOX_H = 1102;

/**
 * The board's on-screen box, shared by the grid/dither layer and the object
 * layer. Must stay a single object — if the two layers ever get different
 * dimensions, every object slides off its grid cell.
 *
 * ss13's board is wider than tall and sits inset with clear margin on all
 * sides, so height is the binding constraint and width follows.
 */
const BOARD_BOX = {
  position: "absolute",
  left: "50%",
  top: "50%",
  height: "min(74svh, 760px)",
  width: "min(84vw, 1320px)",
  transform: "translate(-50%, -50%)",
} as const;

type GridItem = {
  file: string;
  left?: number;
  top?: number;
  bottom?: number;
  w: number;
  h: number;
  side: "left" | "right";
  /**
   * CLEAN-state slot, as a fraction of the STAGE (0 = top, 1 = bottom).
   * ss12 spreads the objects down both screen edges rather than letting them
   * pile up wherever the chaos layout happened to leave them, so each object
   * gets an explicit vertical slot instead of a derived offset.
   */
  slot: number;
  /** Clean-state rotation in degrees. ss12's objects all sit slightly askew. */
  tilt: number;
  /**
   * Marks the LCP candidate. Next.js flagged img-11.png specifically (it's
   * the largest object in the grid, 283×283) as the Largest Contentful Paint
   * element and asked for eager loading. `priority` is the one field to set
   * — it implies eager + adds a preload hint, and must NOT be combined with
   * `loading="eager"` (Next treats the two as conflicting). Only this one
   * item gets it; blanket-applying priority to all 16 images would defeat
   * lazy-loading for the other 15.
   */
  priority?: boolean;
};

/**
 * Sizes are DP's own, scaled down by SIZE_SCALE. DP's frame was a 1500px
 * artboard; on a real viewport those px make the objects huge enough to
 * collide with the type (Arnav 2026-08-02: "reduce the size of images to fit
 * inside the box"). ss13's objects read at roughly two-thirds.
 */
const SIZE_SCALE = 0.85;

/**
 * Chaos-state positions are DP's own (node-map.json). Clean-state `slot`/`tilt`
 * are authored to match ss12: eight objects down the left screen edge, eight
 * down the right, spread top-to-bottom, each rotated a few degrees and half
 * clipped by the edge.
 */
const GRID_ITEMS: GridItem[] = [
  { file: "img-15.png", left: 288, top: 114, w: 152, h: 151, side: "left", slot: 0.03, tilt: -8 },
  { file: "img-09.png", left: 130, top: 290, w: 144, h: 144, side: "left", slot: 0.22, tilt: 6 },
  { file: "img-03.png", left: 383, top: 285, w: 195, h: 195, side: "left", slot: 0.4, tilt: -5 },
  { file: "img-11.png", left: 160, bottom: 318, w: 283, h: 283, side: "left", slot: 0.55, tilt: 7, priority: true },
  { file: "img-07.png", left: 310, bottom: 122, w: 171, h: 171, side: "left", slot: 0.71, tilt: -9 },
  { file: "img-10.png", left: 629, top: 295, w: 210, h: 225, side: "left", slot: 0.86, tilt: 5 },
  { file: "img-14.png", left: 505, bottom: 225, w: 100, h: 100, side: "left", slot: 0.8, tilt: -6 },
  { file: "img-04.png", left: 634, bottom: 20, w: 207, h: 368, side: "left", slot: 0.14, tilt: 9 },

  { file: "img-16.png", left: 1100, top: 30, w: 143, h: 143, side: "right", slot: 0.08, tilt: 7 },
  { file: "img-13.png", left: 1210, top: 100, w: 196, h: 196, side: "right", slot: 0.14, tilt: -6 },
  { file: "img-08.png", left: 959, top: 177, w: 185, h: 232, side: "right", slot: 0.34, tilt: 8 },
  { file: "img-06-folder.png", left: 795, top: 124, w: 125, h: 125, side: "right", slot: 0.48, tilt: -7 },
  { file: "img-02.png", left: 1289, top: 380, w: 138, h: 316, side: "right", slot: 0.62, tilt: 5 },
  { file: "img-12.png", left: 1050, bottom: 300, w: 174, h: 172, side: "right", slot: 0.76, tilt: -8 },
  { file: "img-05.png", left: 850, bottom: 220, w: 151, h: 151, side: "right", slot: 0.88, tilt: 6 },
  { file: "img-01.png", left: 1270, bottom: 120, w: 170, h: 170, side: "right", slot: 0.93, tilt: -5 },
];

/** DP's four text slots, wording VERBATIM (Arnav confirmed 2026-08-02). */
const DP_TEXT = {
  intro: ["The world is", "full of"],
  midLeft: "thousands of stats",
  midRight: "& quiet insights",
  closing: ["I build the system", "that makes them speak"],
} as const;

const pct = (px: number, total: number) => `${(px / total) * 100}%`;

/**
 * Deterministic per-object drift, derived from resting geometry rather than
 * gsap.utils.random(). Random values would be re-rolled on every
 * ScrollTrigger.refresh() (smooth-provider fires one per debounced resize),
 * making the scrub non-reversible — scrolling back up would land the board in
 * a different arrangement than it started in.
 *
 * Each object travels only far enough to sit HALF IN, HALF OUT of the board's
 * edge (Arnav 2026-08-02: "they should hug the border of their side, half in
 * half out"), so the distance is measured from the object's own resting centre
 * to its side's edge — not a flat push.
 */
/**
 * Fraction of the object's own width that stays ON-stage past the viewport
 * edge in clean mode. 0.5 (the original spec) put the centre exactly on the
 * edge, cropping half of every object — Arnav 2026-08-27, screenshot
 * comparison against ss12: "nothing is visible... I need them to be visible
 * when they are moved aside." ss12's edge objects read almost fully intact
 * with only a sliver actually cut, so this pulls the target inward instead
 * of reversing the direction entirely (still reads as "hugging the edge",
 * just not eating half the artwork to do it).
 */
const EDGE_VISIBLE_FRACTION = 0.85;

/**
 * Clean-state target for one object, in px relative to its own chaos position.
 *
 * ss12 hugs the VIEWPORT edges, not the board's, so this measures against the
 * stage rect. Each object's centre lands near its screen edge (mostly
 * visible, only a sliver cropped) at its authored vertical slot.
 *
 * Measured at build time from live rects rather than derived from constants:
 * the board is a clamped `min()` box, so its on-screen size is not knowable
 * from BOX_W/BOX_H alone.
 */
function cleanTarget(el: HTMLElement, item: GridItem, stage: DOMRect) {
  const r = el.getBoundingClientRect();
  const restCentreX = r.left + r.width / 2 - stage.left;
  const restCentreY = r.top + r.height / 2 - stage.top;
  const inset = r.width * EDGE_VISIBLE_FRACTION;
  const edgeX = item.side === "left" ? inset : stage.width - inset;
  // Keep the object fully on-stage vertically even at the extreme slots.
  const targetY = item.slot * (stage.height - r.height) + r.height / 2;
  return {
    x: edgeX - restCentreX,
    y: targetY - restCentreY,
    rotation: item.tilt,
  };
}

export function OpeningDP() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gridLayerRef = useRef<HTMLDivElement>(null);
  const centerLayerRef = useRef<HTMLDivElement>(null);
  const ditherLayerRef = useRef<HTMLDivElement>(null);
  const smoother = useSmoother();
  const [imageHovered, setImageHovered] = useState(false);
  /** "chaos" = board scattered (rest). "clean" = objects to the edges, hero up. */
  const [mode, setMode] = useState<"chaos" | "clean">("chaos");
  /** Set once the timeline exists, so the buttons can drive it. */
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const gridLayer = gridLayerRef.current;
    const centerLayer = centerLayerRef.current;
    if (!section || !stage || !gridLayer || !centerLayer) return;

    /* All 16 GRID_ITEMS — tools now live inside FolderWithTools on the
       folder node, so they drift with it (no separate cluster selector). */
    const objects = gsap.utils.toArray<HTMLElement>(
      "[data-dp-item]",
      gridLayer,
    );
    const captions = gsap.utils.toArray<HTMLElement>(
      "[data-dp-caption]",
      gridLayer,
    );
    const dither = ditherLayerRef.current;

    const mm = gsap.matchMedia(section);

    /* Mobile (Arnav 2026-08-29, second pass — rewound the 8-item scroll-scrub
       from the same day): a static, always-populated collage instead of an
       interactive one. All 16 images sit in their normal chaos layout
       permanently — no pin, no scroll-jack, no scrub, no toggle buttons
       (nothing to toggle). The hero (Hi, I'm Arnav / crab / statement) is
       visible immediately rather than fading in on scroll progress, same as
       every other section on the page. Desktop is completely unaffected —
       this only gates the branch below it, which still owns the pin/scrub. */
    mm.add("(max-width: 900px)", () => {
      gsap.set(centerLayer, { opacity: 1, y: 0 });
      captions.forEach((el) => gsap.set(el, { opacity: 0 }));
    });

    mm.add(
      "(prefers-reduced-motion: no-preference) and (min-width: 900.01px)",
      () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          /* Explicit viewport-relative distance. "+=150%" is a percentage of
             the TRIGGER's height, and the section sets no height of its own
             (pinSpacing supplies it), so that form resolved to ~0 and the
             scrub never advanced even though the pin held. */
          end: () => `+=${window.innerHeight * 1.5}`,
          scrub: 0.6,
          pin: stage,
          pinSpacing: true,
          invalidateOnRefresh: true,
          /* Objects slide out from under a stationary cursor, which fires no
             pointerleave — without this the hover flag latches on and the
             dither stays at scatter forever. */
          onUpdate: (self) => {
            setImageHovered(false);
            setMode(self.progress > 0.5 ? "clean" : "chaos");
          },
        },
      });
      triggerRef.current = tl.scrollTrigger ?? null;
      timelineRef.current = tl;

      // Captions vanish on the way out and return on the way back (scrub).
      captions.forEach((el) => {
        tl.to(el, { opacity: 0, ease: "power1.in", duration: 0.45 }, 0);
      });

      /* Fully to 0, not 0.25 (Arnav 2026-08-27: "in clean mode there is
         still a line visible... making it look weird"). At 0.25 the grid's
         own bounded rectangle — visible as a seam/edge once every object has
         cleared away from the board's centre in clean mode — read as a
         stray line rather than texture. Chaos mode still shows the full grid
         via the timeline's reverse (this only affects the clean-mode end). */
      if (dither) tl.to(dither, { opacity: 0, ease: "power1.in" }, 0);

      tl.to(
        centerLayer,
        { opacity: 1, y: 0, ease: "power1.out", duration: 1.2 },
        0.2,
      );
      },
    );

    /* Object x/y targets are measured off `stage.getBoundingClientRect()`,
       but at this synchronous point in useLayoutEffect the pinned stage can
       still report a zero/degenerate box (the pin's own height/position
       rewrite hasn't settled yet). Rotation-only tweens (which only depend
       on `item.tilt`, never on the stage rect) applied fine while x/y stayed
       stuck at 0 — confirmed live, all 16 objects, before this fix. Deferring
       the rect read (and the tween creation that depends on it) to the same
       rAF that already calls ScrollTrigger.refresh() lets layout settle
       first. Adding tweens to `tl` after its own creation is fine — GSAP
       doesn't require every tween to exist before the timeline is used. */
    const refresh = requestAnimationFrame(() => {
      const stageRect = stage.getBoundingClientRect();
      const tl = timelineRef.current;
      // tl only exists on desktop now (see the mm.add branches above) — this
      // naturally no-ops on mobile without needing its own width check.
      if (tl) {
        objects.forEach((el, i) => {
          const item = GRID_ITEMS[i];
          if (!item) return;
          const target = cleanTarget(el, item, stageRect);
          tl.to(
            el,
            {
              x: target.x,
              y: target.y,
              rotation: target.rotation,
              ease: "power2.inOut",
            },
            0,
          );
        });
      }
      ScrollTrigger.refresh();
    });

    return () => {
      cancelAnimationFrame(refresh);
      mm.revert();
    };
  }, [smoother]);

  /**
   * Buttons drive the SAME scroll position the scrub reads, rather than
   * animating the timeline directly. Setting `progress` by hand would be
   * instantly overwritten by the next scroll event, and the two controls would
   * disagree; moving the scroller keeps button and wheel as one source of
   * truth.
   *
   * Same duration both directions (Arnav 2026-08-10: clean→chaos feel is the
   * reference; chaos→clean was reading faster — lock both to this).
   */
  const MODE_SCROLL_S = 3;

  const goToMode = (next: "chaos" | "clean") => {
    const st = triggerRef.current;
    if (!st) return;
    /* Stop just SHORT of st.end. Landing exactly on it releases the pin and
       scrolls past the section entirely (blank screen); 96% is far enough for
       the scrub to have fully resolved while the stage is still pinned. */
    const y = next === "clean" ? st.start + (st.end - st.start) * 0.96 : st.start;
    if (smoother) {
      smoother.scrollTo(y, {
        duration: MODE_SCROLL_S,
        /* Match Lenis's own glide curve so both directions feel identical. */
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  /**
   * Captions sit on a solid plate matching the stage so the line-grid +
   * DotField never read through the type (ss13 / smriti reference).
   * Padding only — left/top/bottom positions untouched.
   */
  const captionClass =
    "font-display absolute z-[2] whitespace-pre-line px-[0.45em] py-[0.2em] text-[clamp(1.15rem,1.9vw,1.6rem)] font-bold leading-[1.3] tracking-[-0.01em] text-ink";

  return (
    <section
      ref={sectionRef}
      id="opening-dp"
      className="relative w-full"
      /* No explicit height — ScrollTrigger's pinSpacing inserts a spacer as
         tall as the pin duration, and the section must be free to grow to it.
         Constraining it clipped the spacer and the scrub never ran. */
    >
      <div
        ref={stageRef}
        className="relative w-full overflow-hidden"
        style={{ height: "100svh", background: STAGE_BG }}
      >
        {/* ── One board: dither BEHIND objects via isolation + negative z ──
            Sibling BOARD_BOX layers fought stacking under GSAP pin; keep field
            + objects in the SAME stacking context so dots can't paint over art.
            Board itself is overflow:visible — clean-mode objects must escape
            the inset board to hug the STAGE edges (half in / half out). Only
            the dither layer clips, so the field stays inside the box. */}
        <div
          className="absolute overflow-visible"
          style={{ ...BOARD_BOX, isolation: "isolate" }}
        >
          <div
            ref={ditherLayerRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            style={{ opacity: 0.85 }}
          >
            {/* Line grid, per ss13 — a bounded rectangle of cells. */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, color-mix(in srgb, var(--ink) 10%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--ink) 10%, transparent) 1px, transparent 1px)",
                backgroundSize: "88px 88px",
              }}
            />
            {/* With bulge off the field is velocity-driven, so hover raises
                cursorForce rather than bulgeStrength. DotField reads
                propsRef.current every frame, so this reaches the canvas without
                forking the vendored file. */}
            <DotField
              {...DITHER}
              cursorForce={imageHovered ? 1.6 : DITHER.cursorForce}
              style={{ opacity: 0.3 }}
            />
          </div>

          {/* Objects + captions — always above the field in this board. */}
          <div
            ref={gridLayerRef}
            className="pointer-events-none absolute inset-0 z-0"
          >
            {GRID_ITEMS.map((item) => {
              return (
                <div
                  key={item.file}
                  data-dp-item
                  data-dp-side={item.side}
                  onPointerEnter={() => setImageHovered(true)}
                  onPointerLeave={() => setImageHovered(false)}
                  /* No card, no fill, no shadow — ss13 has the objects sitting
                     DIRECTLY on the grid. The layer is pointer-events-none so
                     it never eats button clicks; each object opts back in so it
                     can drive the dither on hover. */
                  className="dp-item pointer-events-auto absolute"
                  style={{
                    left:
                      item.left !== undefined ? pct(item.left, BOX_W) : undefined,
                    top: item.top !== undefined ? pct(item.top, BOX_H) : undefined,
                    bottom:
                      item.bottom !== undefined
                        ? pct(item.bottom, BOX_H)
                        : undefined,
                    // Base width times a CSS-controlled multiplier
                    // (--dp-item-scale, default 1) — mobile bumps this since
                    // the board itself shrinks far more than these items
                    // should (Arnav 2026-08-29: SVGs read too small on
                    // phone vs. web).
                    width: `calc(${pct(item.w * SIZE_SCALE, BOX_W)} * var(--dp-item-scale, 1))`,
                    aspectRatio: `${item.w} / ${item.h}`,
                  }}
                >
                  {item.file === "img-06-folder.png" ? (
                    <FolderWithTools />
                  ) : (
                    <Image
                      src={`/assets/opening-dp/${item.file}?v=5`}
                      alt=""
                      fill
                      sizes="18vw"
                      unoptimized
                      priority={item.priority === true}
                      className="object-contain"
                    />
                  )}
                </div>
              );
            })}

            {/* ── DP's four text slots, wording verbatim ── */}
            <span
              data-dp-caption
              className={captionClass}
              style={{
                left: pct(500, BOX_W),
                top: pct(141, BOX_H),
                background: STAGE_BG,
              }}
            >
              {`${DP_TEXT.intro[0]}\n${DP_TEXT.intro[1]}`}
            </span>

            <span
              data-dp-caption
              className={captionClass}
              style={{
                left: pct(870, BOX_W),
                top: pct(494, BOX_H),
                background: STAGE_BG,
              }}
            >
              {DP_TEXT.midLeft}
            </span>

            <span
              data-dp-caption
              className={captionClass}
              style={{
                left: pct(380, BOX_W),
                bottom: pct(449, BOX_H),
                background: STAGE_BG,
              }}
            >
              {DP_TEXT.midRight}
            </span>

            <span
              data-dp-caption
              className={captionClass}
              style={{
                left: pct(917, BOX_W),
                bottom: pct(127, BOX_H),
                background: STAGE_BG,
              }}
            >
              {`${DP_TEXT.closing[0]}\n${DP_TEXT.closing[1]}`}
            </span>
          </div>
        </div>

        {/* ── Centre: same hero content as Opening, + two buttons ── */}
        <div
          ref={centerLayerRef}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
          /* Follows eye-toggle via --ink/--paper (OpeningDP used to hardcode
             black-on-white and ignore the theme). */
          style={{ opacity: 0, transform: "translateY(24px)", color: STAGE_FG }}
        >
          <div className="flex flex-col items-center">
            <OpeningHeroContent />
          </div>

        </div>

        {/* ── Mode toggles: icon buttons (Arnav 2026-08-27, replacing the
            text-pill treatment) — puzzle = Chaos Mode, broom = Clean Mode,
            per inspiration/ss11.png. Hover reveals a dark tooltip pill
            reading "Chaos Mode on" / "Clean Mode on", same visual language
            as the NDA tooltip. Click behaviour (goToMode) is unchanged.
            Outside the centre layer so the scrub's opacity tween never hides
            them. ── */}
        <div className="opening-dp-modes absolute inset-x-0 bottom-8 z-20 flex items-center justify-center gap-3">
          {(
            [
              { id: "chaos" as const, label: "Chaos Mode on", icon: "puzzle.svg", scale: 1 },
              /* broom.png's actual artwork sits inside a wide transparent
                 margin on its 50×50 canvas (puzzle.svg's path fills nearly
                 the whole viewBox) — at the same mask-size the broom read
                 visibly smaller (Arnav 2026-08-27: "increase the size of the
                 broom... to match it with the size of the puzzle"). Scaling
                 the mask up compensates for the source padding difference. */
              { id: "clean" as const, label: "Clean Mode on", icon: "broom.png", scale: 1.55 },
            ] as const
          ).map(({ id, label, icon, scale }) => {
            const on = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => goToMode(id)}
                data-cursor="pointer"
                aria-label={label}
                aria-pressed={on}
                className="opening-dp-mode-btn relative flex size-11 items-center justify-center rounded-xl border transition-[background-color,border-color] duration-300"
                style={
                  on
                    ? {
                        /* Darker beige from paper↔muted — portfolio warm tone,
                           not charcoal (Arnav 2026-08-10). */
                        background:
                          "color-mix(in srgb, var(--paper) 40%, var(--muted))",
                        borderColor:
                          "color-mix(in srgb, var(--paper) 40%, var(--muted))",
                      }
                    : {
                        background: "var(--paper-raised)",
                        borderColor: "var(--line)",
                      }
                }
              >
                <span
                  aria-hidden="true"
                  className="opening-dp-mode-icon"
                  style={{
                    WebkitMaskImage: `url(/assets/opening-dp/${icon})`,
                    maskImage: `url(/assets/opening-dp/${icon})`,
                    WebkitMaskSize: `${scale * 100}%`,
                    maskSize: `${scale * 100}%`,
                  }}
                />
                <span className="opening-dp-mode-tip" role="tooltip">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
