/**
 * Experience — 4 roles, accordion + timeline (spec §1).
 *
 * ⚠️ COPY IS A DRAFT. The one-liners and bullets below were written from all 5
 * resume variants in `resume/` and are pending Arnav's review — dates and
 * company names are factual, the prose is not yet signed off (2026-07-30).
 *
 * Canon's start is JANUARY 2026 (Arnav confirmed 2026-07-30, resolving the
 * Feb-vs-Jan conflict across resume variants — 3 of 5 said Jan). The timeline
 * bar's left edge depends on this.
 */

export type Role = {
  id: string;
  company: string;
  role: string;
  /** Display string, lowercase, shown right-aligned in the row. */
  duration: string;
  /** Logo in public/icons/companies/, with extension. */
  logo: string;
  /** Inclusive start, as [year, month] with month 1-indexed. */
  start: [number, number];
  /** Exclusive end, or null for the current role. */
  end: [number, number] | null;
  /** One sentence, shown above the rule in the expanded body. */
  summary: string;
  /** Exactly 2, shown as dot-marked bullets below the rule. */
  bullets: readonly [string, string];
};

export const ROLES: readonly Role[] = [
  {
    id: "canon",
    company: "Canon Production Printing",
    role: "Business Process Intern",
    duration: "jan 2026 to present",
    logo: "canon.jpg",
    start: [2026, 1],
    end: null,
    summary: "owning procurement transformation end-to-end as the sole analyst.",
    bullets: [
      "unified Teamcenter and SAP into one auditable data model across 5,000+ engineered parts, replacing the spreadsheets the RFQ process ran on.",
      "built the Power BI control tower that exposed only 38% of quotes closing inside the 15-day SLA, then the Azure OpenAI agent that closes the gap.",
    ],
  },
  {
    id: "jerseystem",
    company: "JerseySTEM",
    role: "Data Analyst",
    duration: "sep 2024 to apr 2025",
    logo: "js.png",
    start: [2024, 9],
    end: [2025, 4],
    summary: "turned a manual reporting cycle into daily executive delivery.",
    bullets: [
      "automated the Python and SQL pipelines behind the Looker dashboards, cutting processing time 25%.",
      "built a predictive hiring model on historical capacity data that reduced time-to-fill 20%.",
    ],
  },
  {
    id: "globalbees",
    company: "GlobalBees",
    role: "Product Analyst",
    duration: "aug 2022 to jul 2023",
    logo: "gb.jpeg",
    start: [2022, 8],
    end: [2023, 7],
    summary: "pricing and product analytics across 10+ D2C brands.",
    bullets: [
      "lifted portfolio profitability 18% through pricing dashboards, and drove 25% higher feature adoption from A/B results.",
      "led the DynamoDB to S3 migration, accelerating the timeline 30% and cutting report defects 40%.",
    ],
  },
  {
    id: "dell",
    company: "Dell EMC",
    role: "Pre-Sales Engineer",
    duration: "jan 2022 to jul 2022",
    logo: "dell.png",
    start: [2022, 1],
    end: [2022, 7],
    summary: "the technical voice in enterprise deal cycles.",
    bullets: [
      "built ROI/TCO models and competitive positioning for 20+ enterprise proposals, contributing to a 40% regional win-rate improvement.",
      "designed HA/DR and cyber-recovery architectures that cut assessed downtime risk 25% and lifted CSAT 30%.",
    ],
  },
] as const;

export const EXPERIENCE_COPY = {
  eyebrow: "EXPERIENCE",
  title: "Where I have worked",
  /** Mono annotation pointing at the toggle. No drawn arrow — locked. */
  hint: "try this",
  listLabel: "list",
  timelineLabel: "timeline",
  /** Centred under the timeline chart. */
  dragHint: "drag sideways, the last 4 years are in here",
} as const;

/** Timeline axis, per spec: 2022 → 2027 inclusive. */
export const TIMELINE_YEARS = [2022, 2023, 2024, 2025, 2026, 2027] as const;

/**
 * Where an open-ended ("to present") bar STOPS.
 *
 * In ss8 the current role's bar ends just past the dashed `now` marker, not at
 * the right edge of the axis — running it to 2027 made Canon's bar swallow the
 * whole tail of the chart (Arnav 2026-07-31: "canon block is way too weird as
 * it is going out"). Expressed in months past today.
 */
export const PRESENT_OVERHANG_MONTHS = 3;
