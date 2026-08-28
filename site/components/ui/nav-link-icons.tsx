/**
 * Nav link icons — Work/Stack/Contact/Approach, ss12 reference (2026-08-27).
 *
 * ⚠️ Outline SVGs only, `stroke="currentColor"`, no fill — Arnav was explicit
 * these must NOT be coloured platform emoji ("not apple colorful emoji").
 * Emoji characters (📁🔧📞🙂) render full-color on most platforms regardless
 * of any CSS applied to them, so they can't satisfy "not coloured" — these
 * are hand-drawn glyphs instead, same pattern as HomeButton/LockGlyph/
 * social-icons.tsx in this codebase (inherit currentColor, flip with theme).
 *
 * No hooks → server-safe.
 */

type IconProps = { size?: number; className?: string };

const common = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
};

/* Path sat low in its own viewBox (folder body y7–18.5 vs. wrench/phone/face
   which read closer to true-centred) — Arnav 2026-08-28, screenshot: "folder
   is down a bit than the word". Shifted up ~1.4 to visually match the other
   three icons' optical centre, not just their identical bounding box (all
   four already shared one — confirmed via getBoundingClientRect, box-level
   alignment was never the bug). */
export function WorkIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...common}>
      <path d="M3 7.1a1.5 1.5 0 0 1 1.5-1.5h4.4l1.6 2h9a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.6z" />
    </svg>
  );
}

/* Tools glyph — a wrench (Arnav 2026-08-27: "use the tools emoji something
   like that, not what is there right now" — the old diamond/pencil shape
   didn't read as tools at all).
   Measured via path.getBBox() against all 4 nav icons (Arnav 2026-08-28,
   after fixing Work's low folder): this one's optical midY was 13.14 in a
   0–24 viewBox (target 12, Work/Approach/Contact all land within 0.4 of it)
   — worst-aligned of the four. Shifted up ~1.1 to match. */
export function StackIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...common}>
      <path d="M14.5 5.4a3.5 3.5 0 0 0-4.6 4.2L4 15.5V18.9h3.4l5.9-5.9a3.5 3.5 0 0 0 4.2-4.6l-2.6 2.6-2-2z" />
    </svg>
  );
}

export function ContactIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...common}>
      <path d="M6.6 10.8c1.3 2.6 3.4 4.7 6 6l2-2a1 1 0 0 1 1-.25 8 8 0 0 0 2.6.42 1 1 0 0 1 1 1V19a1 1 0 0 1-1 1A15.5 15.5 0 0 1 3.3 5.8a1 1 0 0 1 1-1H7a1 1 0 0 1 1 1 8 8 0 0 0 .42 2.6 1 1 0 0 1-.25 1z" />
    </svg>
  );
}

export function ApproachIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14.5c.8 1 1.9 1.6 3.5 1.6s2.7-.6 3.5-1.6" />
      <path d="M9 10h.01M15 10h.01" strokeWidth={2.2} />
    </svg>
  );
}
