/**
 * Icons for the /how-i-work insight cards and highlight card (2026-08-29).
 *
 * Stroke-only, 24px grid, 1.7 stroke — drawn rather than pulled from a set so
 * they match each other exactly. They inherit `currentColor`, and the chip sets
 * that to --ink, so the glyph stays near-black in light mode and near-white in
 * dark without any per-theme handling here.
 *
 * Keyed by the `icon` string in ABOUT_SECTIONS; adding a card means adding a
 * matching key here, or the chip renders empty.
 */

const COMMON = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const ABOUT_ICONS = {
  /** Confidence — a target, for aim rather than accuracy. */
  target: (
    <svg {...COMMON}>
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M5 12H3" />
      <path d="M21 12h-2" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  /** Optimisation — a line that climbs to the wrong peak. */
  trend: (
    <svg {...COMMON}>
      <path d="M4 18 L10 12 L14 15 L20 7" />
      <path d="M20 12V7h-5" />
    </svg>
  ),
  /** No stake — a brief handed over and built to the letter. */
  brief: (
    <svg {...COMMON}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
    </svg>
  ),
  /** Context — the clock, for the work that comes back. */
  clock: (
    <svg {...COMMON}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  /** Judgement — the highlight card's mark. */
  star: (
    <svg {...COMMON}>
      <path d="M12 3l2.4 5.4 5.6.6-4.2 3.9 1.2 5.6L12 15.6 6.9 18.5l1.2-5.6L4 9l5.6-.6z" />
    </svg>
  ),
} as const;

export type AboutIconName = keyof typeof ABOUT_ICONS;

/** Maps a card's `tint` to its token. Kept here so the data file stays copy-only. */
export const CHIP_TINTS = {
  terracotta: "var(--chip-terracotta)",
  blue: "var(--chip-blue)",
  sand: "var(--chip-sand)",
  sage: "var(--chip-sage)",
} as const;

export type ChipTint = keyof typeof CHIP_TINTS;
