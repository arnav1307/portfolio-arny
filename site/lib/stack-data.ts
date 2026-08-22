/**
 * Stack grid — 4 groups, 18 tools (spec §2).
 *
 * Replaces the old TOOLS chip row. Icons are the SVGs Arnav already downloaded
 * into design/moodboard/, copied to public/icons/tools/ — no icon package.
 *
 * `rest` picks how each icon is neutralised at rest, because the source SVGs
 * are not uniform. See .stack-icon in globals.css for the implementations.
 */

/**
 * - `fill`  — artwork is a single flat brand colour, so `fill: currentColor`
 *             neutralises it exactly (azure, spotify, claude, databricks…).
 * - `flat`  — gradients or multi-path colour on a transparent ground; a
 *             grayscale + darken filter flattens it to ink (python, sql, aws…).
 * - `plate` — artwork is a brand-coloured PLATE with a knocked-out white glyph
 *             (typescript, zapier, codex, framer, cursor, playstation,
 *             github). Darkening those gives a black box with an invisible
 *             glyph, so they are inverted instead: the plate drops to the page
 *             colour and the glyph becomes ink.
 */
/**
 * - `solid` — flatten the whole mark to ONE ink silhouette, knocked-out glyph
 *             included, so it reads like codex/spotify (sql, typescript).
 */
export type StackRest = "fill" | "flat" | "plate" | "solid";

export type StackTool = {
  /** Lowercase display name, shown in the hover tooltip. */
  name: string;
  /** File in public/icons/tools/, without the extension. */
  icon: string;
  /** How the rest state neutralises this icon's artwork. */
  rest: StackRest;
  /**
   * Hold the rest-state treatment on hover instead of restoring brand colour.
   * Framer's mark is pure white, so "restoring the brand colour" makes it
   * vanish into the paper (Arnav 2026-07-30).
   */
  holdOnHover?: boolean;
  /** Optional outbound link (only Spotify has one — Arnav's playlist). */
  href?: string;
};

export type StackGroup = {
  label: string;
  tools: readonly StackTool[];
};

export const STACK_GROUPS: readonly StackGroup[] = [
  {
    label: "PROGRAMMING",
    tools: [
      { name: "python", icon: "python", rest: "flat" },
      // sql + typescript render as solid ink marks at rest so they read like
      // codex and spotify rather than as coloured chips (Arnav 2026-07-31).
      { name: "sql", icon: "sql", rest: "solid" },
      { name: "typescript", icon: "typescript", rest: "solid" },
      { name: "r", icon: "r-lang", rest: "flat" },
    ],
  },
  {
    label: "CLOUD AND PLATFORM",
    tools: [
      { name: "aws", icon: "amazon-web-services", rest: "flat" },
      { name: "azure", icon: "azure", rest: "fill" },
      { name: "databricks", icon: "databricks", rest: "fill" },
      { name: "power automate", icon: "power-platform", rest: "flat" },
      { name: "git", icon: "github", rest: "fill" },
      { name: "power bi", icon: "power-bi-embedded", rest: "flat" },
    ],
  },
  {
    label: "AI AND PRODUCTIVITY",
    tools: [
      { name: "claude code", icon: "claude-ai", rest: "fill" },
      { name: "codex", icon: "codex", rest: "fill" },
      // Same as framer: cursor's mark is near-white (#edecec) on transparent.
      { name: "cursor", icon: "cursor-code", rest: "plate", holdOnHover: true },
      { name: "zapier", icon: "zapier", rest: "plate" },
      // Framer's mark is solid white on a transparent ground, so it is inverted
      // to ink at rest AND held there on hover — letting the "brand colour"
      // back would render white-on-paper, i.e. invisible.
      { name: "framer", icon: "framer", rest: "plate", holdOnHover: true },
    ],
  },
  {
    label: "AFTER HOURS",
    tools: [
      {
        name: "spotify",
        icon: "spotify",
        rest: "fill",
        href: "https://open.spotify.com/playlist/6DRObsRTbaniCSqMDEHoxe?si=7Ng5w7z-SnibI0dfqnEFvQ",
      },
      { name: "playstation", icon: "playstation", rest: "fill" },
      { name: "premier league fantasy", icon: "premier-league", rest: "fill" },
    ],
  },
] as const;

/** Trailing note after the last group, in the secondary face. */
export const STACK_MORE = "+ more…";

export const STACK_COPY = {
  eyebrow: "STACK",
  title: "What I make things with",
  /** One line, the two halves joined by a comma (Arnav 2026-07-30). */
  blurb:
    "Half coding tools, half productivity tools, hover for names and check out my playlist.",
} as const;
