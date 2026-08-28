/**
 * Single source of truth for site content — imported by nav + sections.
 * Copy locks come from CLAUDE.md content rules + inspiration/notes.md §v3.
 * Placeholders are flagged with TODO(pending) for items Arnav still owes.
 */

// ── Contact / socials ──
export const CONTACT = {
  email: "arnavg1320@gmail.com",
  linkedin: "https://linkedin.com/in/arnavgupta13",
  x: "https://x.com/arny_arnav",
  github: "https://github.com/arnav1307",
  // Folder (WORK) click → Drive resume. Which of 5 resume/ PDFs ships: Arnav's pick in Drive.
  resumeDrive:
    "https://drive.google.com/file/d/1W_K1xBegDfN6cmOhBBIoaC2jHOrUdGvs/view?usp=drive_link",
  // Nav clock. Amsterdam is the site's stated location, so the clock shows
  // Amsterdam time (CET/CEST). Framer's template printed "EST" — that was the
  // Framer account's own timezone, not the intended label.
  // Nav clock: real Amsterdam time. `label` is printed VERBATIM — Arnav wants
  // "CET" shown year-round (2026-07-26), not the DST-correct "CEST" that Intl
  // reports in summer.
  location: { city: "Amsterdam", tz: "Europe/Amsterdam", label: "CET" },
} as const;

// ── Stack: 8 tool chips (top-level names only, no service sprawl). CLAUDE.md §Content Rules ──
export const TOOLS = [
  "Python",
  "SQL",
  "Azure",
  "AWS",
  "Power BI",
  "AI Agents (LLM Orchestration)",
  "Automation (Power Automate / n8n)",
  "JavaScript",
] as const;

// ── Hero corner captions (clustered center). ──
export const HERO_CAPTIONS = ["DATA", "PRODUCT", "AI"] as const;

// ── Left-aligned statement above the sign band (verbatim v3 lock). ──
export const OWNERSHIP_STATEMENT =
  "Building with full ownership from discovery to post launch, shipping outcomes beyond the interface";

// ── Contact headline. Types forward → holds → deletes → loops, per Arnav's
//    screen recording (design/moodboard/Screen Recording 2026-07-27 …). The blue
//    block caret is the animation's only blue; the line itself is NOT a link. ──
/** Question mark dropped 2026-07-31 (Arnav) — the line is a statement. */
export const TYPEWRITER_HEADLINE =
  "Let's build something meaningful together.";

// ── Footer nav (dark bar below the contact section). Copy verbatim from the
//    Framer "Open To Work" section; capitalisation normalised. ──
// ── "Work With Me" block, sits under the typewriter with the Cal.com embed. ──
export const WORK_WITH_ME = {
  eyebrow: "WORK WITH ME",
  title: "Have a product that I can help with?",
  blurb:
    "Grab 15 minutes. bring the messy version, that is the fun part.",
  /** Wraps the email address in the plain line under the calendar. */
  fallback: "Calendars not your thing?",
  fallbackTail: "works just as well.",
} as const;

export const FOOTER_NAV = {
  name: "Arnav.",
  /** Second line under the name — ss7. Deliberately literal about the site. */
  tagline: "Made with zero em dashes",
  poweredBy: "Powered by Claude, Cursor & Caffeine 🧑🏻‍💻",
} as const;

// ── Desk objects (Scott method): object → label → target. ──
export const DESK_OBJECTS = [
  {
    id: "folder",
    label: "Work",
    asset: "/assets/desk/folder.png",
    href: CONTACT.resumeDrive,
  },
  {
    id: "phone",
    label: "Contact",
    asset: "/assets/desk/phone.png",
    href: `mailto:${CONTACT.email}`,
  },
  {
    id: "coffee",
    label: "LinkedIn",
    asset: "/assets/desk/coffee.png",
    href: CONTACT.linkedin,
  },
] as const;
