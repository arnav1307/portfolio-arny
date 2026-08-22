"use client";

import DotField from "@/components/vendor/DotField";
import { ScrambleName } from "@/components/motion/scramble-name";
import { PixelCrab } from "@/components/ui/pixel-crab";
import { HERO_CAPTIONS, OWNERSHIP_STATEMENT } from "@/lib/data";

/**
 * Opening — HALF-SPLIT. Geometry re-extracted from the Framer "Opening"
 * container (project Arny, node nTfRGo4it) on 2026-07-26 after Arnav's latest
 * design pass, and converted from Framer's 1200×560 desktop frame to
 * percentages of THIS half so it scales.
 *
 *   ├──────────── horizontal divider (sits under the nav) ────────────┤
 *   │  LEFT: "Hi," / "I'm Arnav" + captions + crab + statement │ DotField │
 *                                            vertical divider ↑
 */

/**
 * Arnav's exact reactbits config (given verbatim 2026-07-26). gradientFrom/To
 * colour the DOTS; the canvas background is CSS below.
 */
const DOTFIELD = {
  dotRadius: 4,
  dotSpacing: 5,
  cursorRadius: 600,
  cursorForce: 0.77,
  bulgeOnly: true,
  bulgeStrength: 50,
  glowRadius: 50,
  sparkle: false,
  waveAmplitude: 0,
  gradientFrom: "#eceef1",
  gradientTo: "#ffffff",
  glowColor: "#b6b1e1",
};

/** Blue canvas from the Framer screenshot; Arnav's dot colours ride on top. */
const FIELD_BG = "#1D0FD9";

/**
 * ┌─ TUNE THE LAYOUT HERE ─────────────────────────────────────────────────┐
 * Every position in this section lives in this one object. Edit these
 * numbers to move things; nothing below needs touching.
 *
 * Percentages are relative to the live left half. Framer is visual reference
 * only; these values are responsive web constraints, not frame coordinates.
 * └────────────────────────────────────────────────────────────────────────┘
 */
const LAYOUT = {
  /** Shared left inset for the whole copy stack. */
  contentLeft: "14.83%",

  /**
   * The copy is positioned as one flowing stack. Keeping only the stack's top
   * responsive prevents the Hi/name/captions spacing from changing with the
   * viewport's aspect ratio.
   */
  copyTop: "25.67%",

  /** "Hi," controls. */
  hi: { size: "clamp(5rem, 9vw, 5.9rem)", lineHeight: 0.86 },

  /** Optical left corrects the font's I/H side-bearing mismatch. */
  name: {
    size: "clamp(2.2rem, 5.4vw, 4rem)",
    opticalLeft: "2px",
  },

  /** Caption spacing below the name and between each label. */
  captions: {
    gap: "clamp(42px, 9vw, 90px)",
    marginTop: "28px",
    opticalLeft: "2px",
  },

  /**
   * The crab and statement share one bottom anchor. Move the crab with
   * offsetX/offsetY; its anchor remains tied to this group during resize.
   */
  signoff: {
    left: "13.33%",
    bottom: "clamp(20px, 5svh, 46px)",
    width: "min(500px, 72%)",
  },
  crab: {
    anchorLeft: "70.74%",
    offsetX: "0px",
    offsetY: "-32px",
    size: 38,
  },

} as const;

export function Opening() {
  return (
    <section
      id="opening"
      // Snap target marker only — layout/geometry below is Arnav's, untouched.
      className="relative w-full"
      style={{ height: "100svh" }}
    >
      {/* ── Horizontal divider: separates nav/title bar from the split ──
          Darkened past --line (Arnav 2026-07-31) — at the token's weight it
          barely registered, and the nav charm now hangs off it. */}
      <div
        aria-hidden
        className="nav-divider absolute inset-x-0 z-20"
        style={{ top: "var(--nav-h)" }}
      />

      {/* ── The split ── */}
      <div
        className="absolute inset-x-0 bottom-0 flex"
        style={{ top: "var(--nav-h)" }}
      >
        {/* LEFT HALF */}
        <div data-opening-half className="relative w-1/2">
          {/* Copy stack — its children stay in flow so resize cannot alter
              their spacing independently. */}
          <div
            className="absolute"
            style={{
              left: LAYOUT.contentLeft,
              top: LAYOUT.copyTop,
            }}
          >
            <div
              className="opening-name"
              style={{
                fontSize: LAYOUT.hi.size,
                lineHeight: LAYOUT.hi.lineHeight,
              }}
            >
              Hi,
            </div>

            {/* Only the word "Arnav" scrambles on hover. */}
            <div
              style={{
                fontSize: LAYOUT.name.size,
                marginLeft: LAYOUT.name.opticalLeft,
              }}
            >
              <ScrambleName />
            </div>

            <div
              className="flex"
              style={{
                gap: LAYOUT.captions.gap,
                marginTop: LAYOUT.captions.marginTop,
                marginLeft: LAYOUT.captions.opticalLeft,
              }}
            >
              {HERO_CAPTIONS.map((c) => (
                <span key={c} className="type-label text-muted">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Signoff group — one bottom anchor keeps the crab attached to the
              ownership line across viewport aspect ratios. */}
          <div
            className="absolute"
            style={{
              left: LAYOUT.signoff.left,
              bottom: LAYOUT.signoff.bottom,
              width: LAYOUT.signoff.width,
            }}
          >
            <div
              className="pixel-crab-hover absolute"
              tabIndex={0}
              data-cursor="pointer"
              aria-label="Pixel crab says: Hi, I'm Ted"
              style={{
                left: LAYOUT.crab.anchorLeft,
                top: 0,
                transform: `translate(${LAYOUT.crab.offsetX}, ${LAYOUT.crab.offsetY})`,
              }}
            >
              {/* Kept in sync with opening-hero-content.tsx (the DP opening that
                  currently ships). If the flag is ever flipped back, the crab
                  must still introduce itself as Ted — the /about page and the
                  agent greeting both name him. */}
              <span aria-hidden className="pixel-crab-message">
                HI! I&apos;M TED
              </span>
              <PixelCrab size={LAYOUT.crab.size} className="block" />
            </div>

            <p className="font-display text-[20px] leading-relaxed tracking-[-0.03em] text-muted">
              {OWNERSHIP_STATEMENT}
            </p>
          </div>

        </div>

        {/* ── Vertical divider between the halves ──
            z-20 keeps it above the DotField canvas, which would otherwise
            paint over the 1px line. */}
        <div
          aria-hidden
          className="relative z-20 w-px shrink-0 self-stretch bg-line"
        />

        {/* RIGHT HALF — DotField over the blue canvas.
            data-opening-field is the hook the responsive layer uses to drop
            this half on narrow viewports; don't rely on :last-child. */}
        <div
          data-opening-field
          className="relative w-1/2 overflow-hidden"
          style={{ background: FIELD_BG }}
        >
          <DotField {...DOTFIELD} />
        </div>
      </div>
    </section>
  );
}
