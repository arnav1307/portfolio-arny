/**
 * PixelCrab — animated pixel-art crab for the footer sign band.
 *
 * Uses Arnav's OWN three SVG frames verbatim (design/moodboard/{right,left,
 * thinking}.svg) — every <rect> below is copied from those files, nothing is
 * redrawn. viewBox 48×48, body #D77757 (→ `--crab` token), eyes/"?" = ink.
 *
 * Shared static parts (body / arms / legs) are drawn once. Only the moving
 * parts differ per frame:
 *   - RIGHT    : eyes at x24 / x36
 *   - LEFT     : eyes at x9  / x21
 *   - THINKING : eyes centered (x13 / x32) + a "?" above the head
 * Each frame layer toggles opacity 0/1 on a hard-cut CSS `steps()` loop:
 * RIGHT → LEFT → THINKING → (loop). Keyframes live in globals.css.
 *
 * No hooks → safe as a server component.
 */

/**
 * ── Expression frames, added 2026-08-14 ──
 *
 * The icons8 "Clawd" set in design/moodboard/Claude/ turned out to be the SAME
 * creature as Arnav's crab, rect for rect: identical 48×48 viewBox, identical
 * torso (36×24 @ 6,18), identical legs (x9/15/30/36 @ y39) and claws (y33),
 * identical #d77757. Only the FACE rects differ. So those files are not a
 * different mascot to be imported, they are extra faces for the one that is
 * already here, and they drop straight into the layer-toggle setup below.
 *
 * Faces are stored as face-only fragments and composited over the shared shell,
 * exactly like `right`/`left`/`thinking` always were.
 *
 * ⚠️ icons8's free tier requires a link back. The footer carries it.
 * ⚠️ Frames that also move the CLAWS or add ARMS (surprised, hands-up) are
 * deliberately not ported — they need the shell rebuilt per frame, which is a
 * bigger change than the orb needs. Add them only with that in mind.
 */
export type TedFace =
  | "right"
  | "left"
  | "thinking"
  | "base"
  | "blink"
  | "happy"
  | "winking"
  | "coding"
  | "dizzy"
  | "sleeping";

/** Which legs are planted. Two frames is enough to read as walking at 30px. */
export type TedLegs = "stand" | "stepA" | "stepB";

type PixelCrabProps = {
  /** Rendered square size in px (default 32 — footer scale). */
  size?: number;
  className?: string;
  /** Show a single static frame instead of the loop. */
  still?: TedFace | false;
  /** Leg pose. Only meaningful with `still` — the loop always stands. */
  legs?: TedLegs;
};

// ── Shared silhouette (identical across right.svg / left.svg) ──
// thinking.svg trims the body to x7 w34; the 1px difference is imperceptible at
// footer scale, so the shared body is used for a stable outline across frames.
//
// Legs were split out of BODY so a walk cycle can swap them. `stand` reproduces
// the original four rects EXACTLY, so every existing use renders unchanged.
const LEGS: Record<TedLegs, React.ReactNode> = {
  stand: (
    <>
      <rect x="9" y="39" width="3" height="9" fill="var(--crab)" />
      <rect x="15" y="39" width="3" height="9" fill="var(--crab)" />
      <rect x="30" y="39" width="3" height="9" fill="var(--crab)" />
      <rect x="36" y="39" width="3" height="9" fill="var(--crab)" />
    </>
  ),
  // Diagonal gait: legs 1+3 planted, 2+4 lifted. Shortening the rect reads as a
  // lift at this scale and keeps every leg on the same baseline, which a y-offset
  // would break.
  stepA: (
    <>
      <rect x="9" y="39" width="3" height="9" fill="var(--crab)" />
      <rect x="15" y="39" width="3" height="6" fill="var(--crab)" />
      <rect x="30" y="39" width="3" height="9" fill="var(--crab)" />
      <rect x="36" y="39" width="3" height="6" fill="var(--crab)" />
    </>
  ),
  stepB: (
    <>
      <rect x="9" y="39" width="3" height="6" fill="var(--crab)" />
      <rect x="15" y="39" width="3" height="9" fill="var(--crab)" />
      <rect x="30" y="39" width="3" height="6" fill="var(--crab)" />
      <rect x="36" y="39" width="3" height="9" fill="var(--crab)" />
    </>
  ),
};

const SHELL = (
  <>
    <rect x="6" y="18" width="36" height="24" fill="var(--crab)" />
    <rect x="0" y="33" width="7.5" height="6" fill="var(--crab)" />
    <rect x="40.25" y="33" width="7.5" height="6" fill="var(--crab)" />
  </>
);

const BODY = (
  <>
    <rect x="6" y="18" width="36" height="24" fill="var(--crab)" />
    {LEGS.stand}
    <rect x="0" y="33" width="7.5" height="6" fill="var(--crab)" />
    <rect x="40.25" y="33" width="7.5" height="6" fill="var(--crab)" />
  </>
);

// ── Eyes per frame (verbatim from the SVGs) ──
const EYES_RIGHT = (
  <>
    <rect x="24" y="24" width="3" height="6" />
    <rect x="36" y="24" width="3" height="6" />
  </>
);
const EYES_LEFT = (
  <>
    <rect x="9" y="24" width="3" height="6" />
    <rect x="21" y="24" width="3" height="6" />
  </>
);
// thinking.svg: eyes centered (raised to y21) + the "?" pixels above the head.
const EYES_THINKING = (
  <>
    <rect x="13" y="21" width="3" height="6" />
    <rect x="32" y="21" width="3" height="6" />
    {/* "?" thinking mark (verbatim) */}
    <rect x="45" y="3" width="3" height="3" />
    <rect x="42" y="6" width="3" height="3" />
    <rect x="42" y="12" width="3" height="3" />
    <rect x="33" y="12" width="3" height="3" />
    <rect x="27" y="12" width="3" height="3" />
    <rect x="21" y="12" width="3" height="3" />
    <rect
      x="42"
      y="-3"
      width="3"
      height="9"
      transform="matrix(-1.836970e-16 1 -1 -1.836970e-16 45 -42)"
    />
  </>
);

// ── Ported faces (icons8 Clawd set) ──
// Rects are verbatim from the source files; only the hardcoded sparkle blue was
// swapped for --accent, because a raw hex would survive the eye-toggle and
// strand this frame in light mode (CLAUDE.md, tokens-only rule).

/** Forward-facing rest. The one face Arnav's own three didn't cover. */
const EYES_BASE = (
  <>
    <rect x="12" y="24" width="3" height="6" />
    <rect x="33" y="24" width="3" height="6" />
  </>
);

/** Both eyes arched — the "playing" beat. */
const EYES_HAPPY = (
  <>
    <rect x="30" y="27" width="3" height="3" transform="rotate(90 31.5 28.5)" />
    <rect x="33" y="24" width="3" height="3" transform="rotate(90 34.5 25.5)" />
    <rect x="33" y="30" width="3" height="3" transform="rotate(90 34.5 31.5)" />
    <rect x="15" y="27" width="3" height="3" transform="rotate(-90 16.5 28.5)" />
    <rect x="12" y="30" width="3" height="3" transform="rotate(-90 13.5 31.5)" />
    <rect x="12" y="24" width="3" height="3" transform="rotate(-90 13.5 25.5)" />
  </>
);

/**
 * Both eyes shut. AUTHORED HERE — the icons8 set has a wink but no blink, and a
 * wink used as a blink closes one eye, which on a loop reads as a facial tic
 * rather than a blink. That was the first version and it was rejected.
 */
const EYES_BLINK = (
  <>
    <rect x="10.5" y="27" width="6" height="3" />
    <rect x="31.5" y="27" width="6" height="3" />
  </>
);

/** Squinting at something. Not currently mounted; kept for a "thinking" beat. */
const EYES_CODING = (
  <>
    <rect x="36" y="27" width="3" height="3" transform="rotate(90 37.5 28.5)" />
    <rect x="33" y="24" width="3" height="3" transform="rotate(90 34.5 25.5)" />
    <rect x="33" y="30" width="3" height="3" transform="rotate(90 34.5 31.5)" />
    <rect x="19.5" y="27" width="3" height="3" transform="rotate(90 21 28.5)" />
    <rect x="25.5" y="27" width="3" height="3" transform="rotate(90 27 28.5)" />
    <rect x="9" y="27" width="3" height="3" transform="rotate(-90 10.5 28.5)" />
    <rect x="12" y="30" width="3" height="3" transform="rotate(-90 13.5 31.5)" />
    <rect x="12" y="24" width="3" height="3" transform="rotate(-90 13.5 25.5)" />
  </>
);

/** One eye shut. Used as the finish beat, then back to rest. */
const EYES_WINKING = (
  <>
    <rect x="12" y="24" width="3" height="6" />
    <rect x="30.75" y="24.75" width="3" height="7.5" transform="rotate(90 32.25 28.5)" />
    <rect x="36" y="30" width="3" height="3" transform="rotate(-90 37.5 31.5)" />
  </>
);

/**
 * ── OVERLAYS ──
 *
 * ⭐ These are drawn WITHOUT eyes, deliberately, and rendered as their own layer
 * on top of a face. That is what lets the blink keep running underneath them.
 *
 * The first version made `halo` and `sparkles` whole faces, so showing one froze
 * the face mid-blink — and it forced combination frames (halo-happy, halo-blink)
 * for every pairing. Composing instead removes both problems.
 */
const OVERLAY_SPARKLES = (
  // ⚠️ --sparkle, NOT --accent. --accent is terracotta (#b4552d) and rendered
  // these red. The icons8 source was #0091ff; --sparkle carries that blue and
  // has its own dark-mode value.
  <g fill="var(--sparkle)">
    <rect x="39" y="4" width="3" height="7" />
    <rect x="39" y="4" width="3" height="7" transform="rotate(90 40.5 7.5)" />
    <rect x="21" y="0" width="3" height="13" />
    <rect x="21" y="0" width="3" height="13" transform="rotate(90 22.5 6.5)" />
    <rect x="31" y="12" width="3" height="3" />
    <rect x="19" y="3" width="7" height="7" />
  </g>
);

/** The "I'm speaking" light. Gold is its own token so dark mode can retune it. */
const OVERLAY_HALO = (
  <g fill="var(--halo)">
    <rect x="22.5" y="-4.5" width="3" height="12" transform="rotate(90 24 1.5)" />
    <rect x="36" y="6" width="3" height="3" transform="rotate(90 37.5 7.5)" />
    <rect x="31.5" y="1.5" width="3" height="6" transform="rotate(90 33 4.5)" />
    <rect x="9" y="6" width="3" height="3" transform="rotate(90 10.5 7.5)" />
    <rect x="13.5" y="1.5" width="3" height="6" transform="rotate(90 15 4.5)" />
    <rect x="22.5" y="7.5" width="3" height="12" transform="rotate(-90 24 13.5)" />
    <rect x="13.5" y="7.5" width="3" height="6" transform="rotate(-90 15 10.5)" />
    <rect x="31.5" y="7.5" width="3" height="6" transform="rotate(-90 33 10.5)" />
  </g>
);

export type TedOverlay = "halo" | "sparkles";

const OVERLAYS: Record<TedOverlay, React.ReactNode> = {
  halo: OVERLAY_HALO,
  sparkles: OVERLAY_SPARKLES,
};

/**
 * Just the overlay marks, no body and no face. Stack this over a `PixelCrab` at
 * the same size and it lines up, because both use the 48×48 viewBox.
 */
export function TedOverlaySprite({
  name,
  size = 40,
  className,
}: {
  name: TedOverlay;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden
    >
      {OVERLAYS[name]}
    </svg>
  );
}

/** Spiral eyes. Reserved for the out-of-voice / error state. */
const EYES_DIZZY = (
  <>
    <rect x="32" y="27" width="3" height="3" transform="rotate(90 33.5 28.5)" />
    <rect x="35" y="24" width="3" height="3" transform="rotate(90 36.5 25.5)" />
    <rect x="35" y="30" width="3" height="3" transform="rotate(90 36.5 31.5)" />
    <rect x="29" y="24" width="3" height="3" transform="rotate(90 30.5 25.5)" />
    <rect x="29" y="30" width="3" height="3" transform="rotate(90 30.5 31.5)" />
    <rect x="13" y="27" width="3" height="3" transform="rotate(-90 14.5 28.5)" />
    <rect x="10" y="30" width="3" height="3" transform="rotate(-90 11.5 31.5)" />
    <rect x="10" y="24" width="3" height="3" transform="rotate(-90 11.5 25.5)" />
    <rect x="16" y="30" width="3" height="3" transform="rotate(-90 17.5 31.5)" />
    <rect x="16" y="24" width="3" height="3" transform="rotate(-90 17.5 25.5)" />
  </>
);

/** Closed eyes only. Z's used to be baked in (lab); TedOrb animates them as a
 *  separate rising layer so sleep reads as living, not a flat stamp. */
const EYES_SLEEPING = (
  <>
    <rect x="13.5" y="31.5" width="3" height="6" transform="rotate(90 15 34.5)" />
    <rect x="31.5" y="31.5" width="3" height="6" transform="rotate(90 33 34.5)" />
  </>
);

const FRAME: Record<TedFace, React.ReactNode> = {
  right: EYES_RIGHT,
  left: EYES_LEFT,
  thinking: EYES_THINKING,
  base: EYES_BASE,
  blink: EYES_BLINK,
  happy: EYES_HAPPY,
  winking: EYES_WINKING,
  coding: EYES_CODING,
  dizzy: EYES_DIZZY,
  sleeping: EYES_SLEEPING,
};

/**
 * Body + legs, NO face. Pair with `TedFaceSprite` when the legs and the face
 * need to change independently — a walk cycle steps far more often than it
 * changes expression, and stacking two full `PixelCrab`s would put the face
 * layer's standing legs on top of the moving ones.
 */
export function TedBodySprite({
  legs = "stand",
  size = 32,
  className,
}: {
  legs?: TedLegs;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden
    >
      {legs === "stand" ? BODY : (<>{SHELL}{LEGS[legs]}</>)}
    </svg>
  );
}

/** Just the eyes, no body. Stacks over `TedBodySprite` at the same size. */
export function TedFaceSprite({
  name,
  size = 32,
  className,
}: {
  name: TedFace;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden
    >
      <g fill="var(--ink)">{FRAME[name]}</g>
    </svg>
  );
}

export function PixelCrab({
  size = 32,
  className,
  still = false,
  legs = "stand",
}: PixelCrabProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label="Pixel crab"
    >
      {/* `legs === "stand"` renders the original BODY constant so the animated
          loop and every existing caller are byte-identical to before. */}
      {legs === "stand" ? (
        BODY
      ) : (
        <>
          {SHELL}
          {LEGS[legs]}
        </>
      )}
      {still ? (
        // single static frame
        <g fill="var(--ink)">{FRAME[still]}</g>
      ) : (
        // three frame layers, cross-toggled by the CSS loop
        <>
          <g className="crab-fr crab-fr--right" fill="var(--ink)">
            {EYES_RIGHT}
          </g>
          <g className="crab-fr crab-fr--left" fill="var(--ink)">
            {EYES_LEFT}
          </g>
          <g className="crab-fr crab-fr--think" fill="var(--ink)">
            {EYES_THINKING}
          </g>
        </>
      )}
    </svg>
  );
}
