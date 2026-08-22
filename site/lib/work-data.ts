/**
 * Selected Work — 3 project cards (spec §5).
 *
 * ⚠️ COPY IS A DRAFT pending Arnav's review, same as the Experience copy.
 *
 * Cards 02 and 03 come from `Arnav_AIPlat_NL.pdf`'s PROJECTS section — they are
 * standalone projects, not tied to any of the 4 logged Experience roles.
 * Neither has a resume-given metric and NONE WAS INVENTED (spec §5): both stay
 * qualitative unless Arnav supplies real numbers.
 *
 * Card 01 (canon) deliberately has no NDA lock — it is the site's named
 * flagship everywhere else. Its footer-right slot ships empty; there is no
 * per-project "live" badge pattern in the codebase and one was not invented.
 */

export type WorkCard = {
  /** Displayed index, "01"–"03". */
  index: string;
  /** Client or company, lowercase, top-right of the card header. */
  client: string;
  title: string;
  /** Shown after the accent ↳ glyph. */
  oneLiner: string;
  problem: string;
  role: string;
  tags: readonly string[];
  /** Insert a line break before this tag index (0-based). Makes room for the lock. */
  tagsBreakBefore?: number;
  /** Shows the lock + "nda" badge, with the "this is under nda" tooltip. */
  nda: boolean;
  /**
   * Non-NDA badge text, for a card that still wants a footer-right mark and a
   * hover tooltip (stealth). Ignored when `nda` is true.
   */
  badge?: { label: string; tooltip: string };
};

export const WORK_CARDS: readonly WorkCard[] = [
  {
    index: "01",
    client: "canon",
    title: "procurement control tower",
    oneLiner: "5,000+ scattered parts, one auditable line.",
    problem: "rfq data lived in disconnected spreadsheets.",
    role: "built the control tower and the agent that closes the sla gap.",
    tags: ["azure openai", "power bi", "power automate"],
    nda: true,
  },
  {
    index: "02",
    client: "jerseystem",
    title: "hiring, forecast not reaction",
    oneLiner: "twenty percent faster to fill a role.",
    problem: "hiring was reactive, with no view of what was coming.",
    role: "built a predictive model on historical capacity data.",
    tags: ["python", "sql", "looker"],
    nda: true,
  },
  {
    index: "03",
    client: "stealth",
    title: "reporting on autopilot",
    oneLiner: "raw csvs in, finished reports out, no hands.",
    problem: "every reporting cycle waited on someone wrangling csvs.",
    role: "built an event-driven s3 to quicksight pipeline.",
    // "0 → 1" leads the tags here, matching ss7's "0 to 1 · product design".
    // quicksight wraps so the lock fits on the first tag row.
    tags: ["0 → 1", "aws lambda", "aws glue", "quicksight"],
    tagsBreakBefore: 3,
    nda: true,
  },
] as const;

export const WORK_COPY = {
  eyebrow: "SELECTED WORK",
  title: "Proof of shipped things",
  blurb:
    "recent work is under NDA, so here's the shape of it: problem, role, impact. details on a call.",
  /** Verbatim, locked 2026-07-30 — do not reword. */
  ndaTooltip: "this is under nda",
  ndaLabel: "nda",
  cta: "more on how i work",
} as const;
