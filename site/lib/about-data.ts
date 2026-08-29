/**
 * Content for /about — the job-portal case study.
 * Right-column copy is Arnav's, locked verbatim in inspiration/notes.md:140-220.
 * Left-rail values extracted from Framer project "Arny" page /about (2026-07-27).
 * See CLAUDE.md §ABOUT = JOB-PORTAL CASE STUDY.
 */

// ── Terminal panel (components/ui/terminal-shot) ──
// Rendered in code, not a screenshot. Filenames are REAL files from this repo and
// the todos are this build's actual work, so the panel is a portrait of the
// session rather than set dressing. The cooking twist Arnav asked for lives in
// the spinner line — Claude Code's spinner really does use gerunds like this, so
// it reads native rather than bolted on.
// Line markers (⏺ ⎿ ☒ ▣ ☐) are NOT stored as characters — Departure Mono has no
// glyphs for them and the browser substitutes an identical dot for each, which
// erases the hierarchy. terminal-shot.tsx draws them as CSS shapes instead; the
// strings below are the text only.
export const TERMINAL_SESSION = {
  toolCall: "Update(components/sections/contact.tsx)",
  toolResult: {
    /** Cut off by the top edge fade — implies scrollback above the crop. */
    previous: "Updated globals.css with 3 additions",
    line: "Added 42 lines, removed 6 lines",
  },
  todoHeader: "Working on 4 to-dos",
  todos: [
    { state: "done", label: "Extract Framer about page", highlight: true },
    { state: "done", label: "Build sticky metadata rail", highlight: false },
    { state: "active", label: "Wire typewriter caret", highlight: false },
    { state: "todo", label: "Mount footer nav", highlight: true },
  ],
  spinner: "Sautéing components…",
  spinnerNote: "Reducing the sauce (47s · 12.4k tokens)",
  input: "Add a follow-up",
  status: "Claude Opus 5 · 23% context used · 2 files",
} as const;

// ── Left rail ──
export const ABOUT_TAGS = ["AI & EMERGING TECH", "SOLUTIONS", "DATA", "STRATEGY"] as const;

export const ABOUT_FACTS = [
  { label: "DURATION", value: "12 active days" },
  // `status: true` renders the pulsing green dot before the value.
  { label: "STATUS", value: "Shipped", status: true },
  {
    label: "IMPACT",
    value: "137 commits, 7 PRs, 8.4M tokens burned, Live deployed portfolio",
  },
  {
    label: "BEST FIT ROLES",
    // Four, not seven. Seven reads as undecided; four reads as a position.
    value: "Applied AI · Solution Design · Technical Pre-Sales · Data & Automation",
  },
] as const;

// ── Right column ──
// Broadened 2026-08-14. The old line ("FROM FRAMER TO DEPLOYED SITE WITH AI")
// anchored the whole page to the portfolio, which is the smallest thing on it.
// The Framer story didn't get cut — it got PROMOTED into the Outcome block,
// where it has room to be a real proof point instead of four words above the H1.
export const ABOUT_EYEBROW = "HOW I WORK WITH AI NOW";
// Page H1. Deliberately NOT the Overview block's heading — that one is
// "Can one person own the whole line…" (notes.md), and running both verbatim
// printed the same sentence twice, one under the other. This is the Framer title.
export const ABOUT_TITLE = "Can AI help engineers become builders?";

/**
 * The case-study body. `small` = eyebrow, `big` = heading, `body` = paragraphs,
 * `bullets` = list items. Copy is Arnav's own — do not rewrite it.
 */
export const ABOUT_SECTIONS = [
  {
    small: "Overview",
    big: "Can one person own the whole line, from idea to shipped?",
    body: [
      "For a long time the split was clean. Strategy sat with one group and the build with another. With AI, that separation is collapsing.",
      "This isn't a story about learning to code. It's about where my work now starts and stops:",
      "Can one person carry an idea from the first rough thought to something real and running, without waiting for a handoff at every step?",
      "That is how I've started to operate. I frame the problem, shape the solution, and direct AI to help me build it, end to end. This page is one example of that, built the same way I now build everything.",
    ],
  },
  {
    // Rewritten 2026-08-14. This block used to restate the Overview in different
    // words. It now carries the CAREER — the one thing the page was missing.
    // Nothing here names a client: "two enterprise systems", "engineered parts",
    // "the directors". The specifics are real, the identities are not in it.
    small: "Why it matters",
    big: "What one person can own now",
    body: [
      "Most conversations about AI stop at productivity, at doing the same work a little faster. I care about the other thing: what one person can own that used to need three roles and two handoffs.",
      "In my current work that meant a procurement process scattered across two enterprise systems and five thousand engineered parts. I ran the discovery, modelled the data, built the control tower leadership actually opens, and prototyped an agent that reads supplier email and checks readiness before a person sees it. Then I stood in front of the directors who had to approve it.",
    ],
    // The 38% finding pulled out of the paragraph run 2026-08-29. It is the only
    // real number on the page and it was buried mid-block; the "In other words:"
    // lead-in plus a ruled quote is the treatment Arnav picked from a reference.
    // Prose RESUMES underneath via `afterQuote` — the quote is a beat in the
    // block, not its ending.
    quote: {
      lead: "In other words:",
      text: "Only 38% of quotes were closing inside the agreed window. Nobody had been able to see that before.",
    },
    afterQuote: [
      "One person across all of it, because AI covered the parts that used to need more. Not a faster developer, a shorter distance between the problem and the thing that fixes it.",
    ],
  },
  {
    small: "My role",
    big: "Builder across strategy and execution, not just one slice",
    body: [
      "I own the direction and the delivery. I decide what is worth building and why, then I direct AI to help me build it and see it through.",
    ],
    bullets: [
      "Framed the problem and the goal before touching a tool",
      "Broke a large, ambiguous idea into a clear system of smaller parts",
      "Made the architecture and design calls that shaped how it worked",
      "Directed AI through the build, correcting course whenever it drifted from intent",
      "Took it all the way to something live and usable, not a document about it",
    ],
  },
  {
    // MERGED 2026-08-14 from the old "Workflow" + "Execution" blocks, which were
    // both saying "I frame, I direct, I review" in two different orders.
    // Each bullet now pairs my half with AI's half, which is the actual point and
    // reads in half the time. Also kills the duplicate "scaffolding" line.
    small: "How it works",
    big: "Where my time goes now",
    // Bullets became the SHIFT diagram 2026-08-29 (option B of three, picked by
    // Arnav). The six bullets are all still here, redistributed: the three that
    // described a handoff became the bar segments, the other three became the
    // Grew / Shrank / Did not move columns underneath.
    body: [
      "The division of labour is simple. I decide, it drafts, I check. What changed is not the hours, it is which hours.",
    ],
    shift: {
      // ⚠️ SEGMENTS ARE EQUAL WIDTH ON PURPOSE — locked 2026-08-29. An earlier
      // draft sized them 18/62/20 → 42/16/42 to look like a measured split.
      // Nothing measures how Arnav's time actually divides, and an unlabelled
      // proportional bar reads as data. Equal thirds make it a diagram of which
      // part of the work changed hands, which is the honest claim. Do not
      // "improve" this by restoring weights unless a real number turns up.
      before: {
        label: "Before",
        lead: "Most of a build was execution. The thinking was real, but it sat at the edges of the day, bracketed by hours of typing out something I had already worked out in my head.",
        segments: ["Deciding", "Doing the tasks, by hand", "Checking"],
      },
      now: {
        label: "Now",
        lead: "The middle stopped being mine. What sits on either side of it is where the work is now: deciding how something should behave before it exists, then reading what came back for whether it actually holds up.",
        segments: ["Framing and specifying", "Drafting, delegated", "Reviewing and re-specifying"],
      },
      close:
        "The work moved from doing the tasks to directing the agents that do them. It handles the groundwork I used to quietly dread, and never once complains about it.",
      columns: [
        {
          label: "Grew",
          body: "Breaking problems into parts small enough to specify, and writing the constraints down once so the agent stops rediscovering them.",
        },
        {
          label: "Shrank",
          body: "The groundwork I used to quietly dread. I now test three approaches in the time one used to take, then throw two away.",
        },
        {
          label: "Did not move",
          body: "Knowing when to stop and change the plan, because it is the plan that is wrong and not the code.",
        },
      ],
    },
  },
  {
    // Regrounded 2026-08-14. Every bullet here used to be true of anyone. They are
    // now drawn from real calls made on the procurement work — the prototype vs
    // production line, the closed network, the compliance framing for directors.
    // Specific enough to be real, generic enough to stay NDA-safe.
    small: "Decision-making",
    big: "My judgement is still the part that matters",
    // Bullets became PROSE + a highlight card 2026-08-29. The five calls read
    // better as two paragraphs than as a list — they are sentences, not items —
    // and the `after` line was promoted into the card's heading, which is the
    // treatment Arnav asked for from a reference screenshot.
    // ⚠️ The exclamation mark came off `big` deliberately: the card now carries
    // the emphasis, and a shouting heading above a shouting card is one too many.
    body: [
      "The highest-value calls never moved. Which problem was worth solving, when the one people complained about was not the one costing them time. That the honest answer was a prototype and an adoption plan, not a production system nobody had approved yet.",
      "Which approach survived a real constraint: an audit trail, a closed network, a habit someone had held for years. When to abandon something I had already built rather than patch it. How to present it to a director so the risk was the story and the technology was the footnote.",
    ],
    highlight: {
      icon: "star",
      tint: "blue",
      label: "Judgement",
      heading:
        "AI could not tell me any of it. Those came down to knowing what the work was actually for.",
      body: "Every one of these was a call about people, risk and timing rather than about code. They are the reason the prototype got approved, and the reason it stayed a prototype until it was ready to be more.",
    },
  },
  {
    // NEW 2026-08-14. Nobody writes this block, which is exactly why it works.
    // A page that only says AI is great reads like marketing; naming the failure
    // modes is what makes the rest of it credible. It also pairs with the closing
    // quote, and matches the "he names limits rather than hiding them" trait the
    // interview agent is already tuned for.
    small: "The honest part",
    big: "Where it still breaks",
    // Bullets became CARDS 2026-08-29. Same four failure modes, same order —
    // the copy was cut to a heading plus one line each so the grid stays light
    // (Arnav: the cards must not be heavily populated with content). The prose
    // below now carries the argument the bullets used to carry.
    body: [
      "It is not magic, and I would rather say so. Four ways it fails me, and none of them are edge cases. Which is fine. The parts it cannot do are the parts worth being paid for.",
    ],
    cards: [
      {
        icon: "target",
        tint: "terracotta",
        label: "Confidence",
        heading: "Confident, and wrong",
        body: "Anything it writes about a system it cannot see gets checked by hand.",
      },
      {
        icon: "trend",
        tint: "blue",
        label: "Optimisation",
        heading: "An answer, not the answer",
        body: "Different things, once compliance is in the room.",
      },
      {
        icon: "brief",
        tint: "sand",
        label: "No stake",
        heading: "Builds what I asked for",
        body: "Happily. Even when it is not the thing I needed.",
      },
      {
        icon: "clock",
        tint: "sage",
        label: "Context",
        heading: "Context comes back to me",
        body: "The more a problem carries, the more of the work comes back to me.",
      },
    ],
  },
  {
    small: "Outcome",
    big: "What this says about how I work",
    body: [
      "AI didn't replace the way I work, it extended it past where it used to stop. I can hold the whole line myself now, from the strategy to the thing that ships.",
      "This page is a small proof of it. I designed the entire site in Framer first, every section and every state, before a line of it existed as code. Then I rebuilt it in Next.js by directing AI: I set the direction, wrote the rules down once so the agent stayed on them, reviewed every output honestly, and re-specified whenever it drifted. The design was mine before the code was.",
      "The agents mostly did what I asked, occasionally what they thought I meant, and once in a while something I still can't explain. You can meet and talk to him as he's walking underneath and on the home page as well. I call him Ted.",
    ],
  },
] as const;

/**
 * Closing line, rendered above the ← BACK link in about-hero.tsx.
 * Arnav's favourite quote, and the sentence the whole page is arguing for:
 * the "honest part" block only works if you actually mean this one.
 */
export const ABOUT_QUOTE = "Be curious, not judgemental.";
