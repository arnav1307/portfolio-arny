"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { lenisRef } from "@/components/motion/smooth-provider";
import { TedOrb, type TedOrbState } from "@/components/ui/ted-orb";
import { DotmSquare5 } from "@/components/vendor/dotmatrix/dotm-square-5";
import { usePageTransition } from "@/components/motion/page-transition";
import {
  CAP_CTA,
  CAP_MESSAGE,
  RESET_MS,
  capResetLine,
  GREETING,
  type Language,
  LANGUAGES,
  OPEN_TO_WORK_PARTS,
  OPEN_TO_WORK_SHORT,
  OUT_OF_VOICE,
  QUESTION_LIMIT,
  SUGGESTED_QUESTIONS,
} from "@/lib/agent-prompt";

gsap.registerPlugin(CustomEase);
if (!CustomEase.get("agentSignature")) {
  CustomEase.create("agentSignature", "0.16, 1, 0.3, 1");
}

/**
 * Ask-about-me widget — bottom-right. Recruiter types, Claude Haiku answers,
 * a gradient orb plays ElevenLabs audio for that answer.
 *
 * Full spec: design/interview-agent-spec.md. Constraints that bite:
 *
 * 1. This is `position: fixed`, so it MUST mount outside <SmoothProvider>.
 *    Lenis transforms #smooth-content and drags any fixed chrome inside it.
 *    It sits in providers.tsx next to Nav / NavCharm / Cursor.
 * 2. The transcript scrolls on its own, hence data-lenis-prevent. Same pattern
 *    as components/ui/cal-embed.tsx.
 * 3. GSAP for panel open/close; CSS keyframes for orb/caret. framer-motion is
 *    installed but its declarative animation is broken in this stack and
 *    freezes at the initial state.
 * 3b. Because of (1) this component is OUTSIDE SmoothProvider, so useSmoother()
 *    would always return null here. It uses the module-level `lenisRef`
 *    singleton instead, which smooth-provider.tsx exports for exactly this case
 *    (PageTransition has the same problem and the same solution).
 * 4. The three-question counter is UX, not security. It is trivially bypassed by
 *    a refresh, and that is fine: someone who clears it costs a third of a cent
 *    and is by definition interested. The real limits live server-side in
 *    lib/agent-guard.ts, and the actual guarantee is the Anthropic Console spend
 *    limit. See spec §7 before "hardening" anything here.
 */

type Turn = {
  role: "user" | "assistant";
  content: string;
  /** Server-issued. Present once the answer finishes; the orb needs it. */
  answerId?: string;
};

type AudioState = "idle" | "loading" | "playing";

const STORAGE_KEY = "arnav-agent-asked";

/**
 * Fired by any component that wants to open the panel from outside this
 * widget — currently just the underlined "Ted" in about-hero.tsx. A plain
 * window event rather than context/props: InterviewAgent mounts once in
 * providers.tsx, outside the routed tree, so there is no shared ancestor
 * with about-hero.tsx to thread a prop through.
 */
export const OPEN_AGENT_EVENT = "arnav-agent-open";

/**
 * Persisted counter. Was a bare number, which never expired — a capped visitor
 * stayed capped forever on that browser. Now it carries the timestamp of the
 * FIRST question so the 72h window (RESET_MS, agent-prompt.ts) can be measured.
 */
type Asked = { n: number; at: number };

/**
 * Reads the counter, resetting it if the window has passed.
 *
 * Anything unparseable is treated as a fresh visitor, which quietly migrates the
 * old bare-number format: `Number.parseInt` would have "worked" and stranded
 * those visitors with no timestamp and therefore no reset.
 */
function readAsked(): Asked | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const saved: unknown = JSON.parse(raw);
    if (
      typeof saved !== "object" ||
      saved === null ||
      typeof (saved as Asked).n !== "number" ||
      typeof (saved as Asked).at !== "number"
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const { n, at } = saved as Asked;
    if (Date.now() - at > RESET_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { n, at };
  } catch {
    // Private mode, disabled storage, or malformed JSON. Fresh visitor.
    return null;
  }
}

function writeAsked(n: number, at: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ n, at }));
  } catch {
    // Private mode, or storage disabled. The counter just won't persist,
    // which costs a third of a cent. Not worth handling further.
  }
}
/** Steady reveal rate — reading feels human; raw chunks feel robotic. */
const CHARS_PER_SEC = 36;
/** Open/close — 850 felt slow once answers stream in. 660 rises clean. */
const PANEL_MS = 660;
/** Soft status while Haiku thinks — shuffled per ask, then cycled. */
const THINKING_PHRASES = ["Baking...", "Vibing...", "Manifesting..."] as const;
/** Slowed from 1400 (Arnav 2026-08-15): the words changed faster than they could
 *  be read, which made it feel frantic rather than playful. */
const THINKING_CYCLE_MS = 2400;

/**
 * Minimum time the thinking line stays on screen (Arnav 2026-08-29: "it hardly
 * shows, the time is too quick and it passes by real quick").
 *
 * Haiku's first token usually lands in a few hundred milliseconds, so the status
 * was being replaced before it could be read — the phrase never even reached its
 * first cycle. Holding the first chunk back until this elapses means the line is
 * always legible, and the answer then streams normally from wherever it has
 * buffered to.
 *
 * ⚠️ This delays the ANSWER, so it is a real cost paid for a legible state. 1.1s
 * is about the shortest that still reads as a beat rather than a flicker; going
 * much past 1.5s starts to feel like the agent is slow rather than thinking.
 */
const THINKING_MIN_MS = 1100;

function shuffleThinking(): string[] {
  const next = [...THINKING_PHRASES];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

/**
 * Default box for the dot-matrix spinner, mirroring what globals.css declares.
 *
 * The spinner was a `*` glyph until 2026-08-30 (Arnav: the animation "looks too
 * plastic", replaced with the dot matrix from inspiration/changes.md). The glyph
 * was chosen originally because it shares the baseline and metrics of the word
 * beside it, where an earlier SVG star read as a sticker on top of the
 * transcript — so the matrix is deliberately kept SMALL and baseline-aligned
 * (.agent-thinking-matrix) rather than sized to the reference's 32px, which is
 * roughly double the text and would reintroduce exactly that problem.
 */
const MATRIX_FALLBACK = { size: 15, dot: 2 } as const;

/**
 * Reads the matrix's box off the `.agent-*` tuning block in globals.css, so it
 * retunes in the same place as every other agent measurement rather than here.
 *
 * ⚠️ `DotmSquare5` takes NUMBERS, not CSS lengths, so the custom properties
 * have to be resolved in JS. Lazy initializer, NOT an effect: this is a
 * synchronous one-shot read, and setState in an effect body is both a
 * cascading render and an eslint error in this repo. The SSR branch returns
 * the same values the stylesheet declares, so the first client render matches
 * the server.
 */
function useMatrixSize() {
  const [box] = useState(() => {
    if (typeof window === "undefined") return MATRIX_FALLBACK;
    const css = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: number) => {
      const n = Number.parseFloat(css.getPropertyValue(name));
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    return {
      size: read("--agent-dot-matrix", MATRIX_FALLBACK.size),
      dot: read("--agent-dot-size", MATRIX_FALLBACK.dot),
    };
  });
  return box;
}

/**
 * Only ever rendered beside Ted, never in the composer.
 *
 * The spinner and the gerund, and nothing else.
 *
 * ⛔ NO ELAPSED COUNTER (Arnav 2026-08-31: "remove the time because the agent
 * does not actually take like 6 seconds, it flashes answer immediately"). The
 * line used to end with "(6s)", copying Claude Code's own spinner. That works
 * in a terminal where the work really does run for seconds; here Haiku's first
 * token lands in a few hundred milliseconds and THINKING_MIN_MS holds the line
 * up artificially, so the number was mostly measuring our own deliberate
 * delay. A counter that reports the UI's padding rather than real work is a
 * fake number, which is the same reason there is no token count here.
 */
function ThinkingStatus({ phrase }: { phrase: string }) {
  const { size, dot } = useMatrixSize();

  return (
    <span
      className="agent-thinking"
      aria-live="polite"
      aria-label="thinking"
    >
      <DotmSquare5
        className="agent-thinking-matrix"
        size={size}
        dotSize={dot}
        speed={1.4}
        opacityBase={0.1}
        opacityMid={0.4}
        opacityPeak={0.95}
      />
      <span key={phrase} className="agent-thinking-phrase">
        {phrase}
      </span>
    </span>
  );
}

/** Lead character → uppercase. Keeps streaming answers + typed questions on-brand. */
function capitalizeLead(value: string) {
  const i = value.search(/\S/);
  if (i < 0) return value;
  return value.slice(0, i) + value.charAt(i).toUpperCase() + value.slice(i + 1);
}

type InterviewAgentProps = {
  /** Fires when the header language dropdown changes. Wire to API separately. */
  onLanguageChange?: (lang: Language) => void;
};

export function InterviewAgent({ onLanguageChange }: InterviewAgentProps = {}) {
  const { navigate } = usePageTransition();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  /**
   * Set when /api/ask answers 429 — Claude's daily ceiling or the per-IP wall.
   * The copy itself streams in as a normal assistant turn (the route sends error
   * text in the same `{t}` shape), so this flag exists only to render the
   * booking CTA underneath it. Same button the cap message uses; the whole point
   * of the change is that every dead end offers the call (Arnav 2026-08-29).
   */
  const [outOfAnswers, setOutOfAnswers] = useState(false);
  const [thinkIdx, setThinkIdx] = useState(0);
  const [thinkQueue, setThinkQueue] = useState<string[]>(() => [...THINKING_PHRASES]);
  const [asked, setAsked] = useState(0);
  /** Timestamp of this visitor's FIRST question. Drives the reset day in the cap. */
  const [askedAt, setAskedAt] = useState<number | null>(null);
  /**
   * Visibility of the whole widget. Arnav: it must not appear over the hero.
   *
   * ⚠️ DERIVED, never stored. This component is mounted in providers.tsx, which
   * sits OUTSIDE the routed tree — so it does not unmount on navigation. A
   * stored `revealed` therefore carried the home page's value across a route
   * change, and a visitor who opened /how-i-work from the hero found the
   * launcher missing with nothing to bring it back. Deriving it means the route
   * half of the answer is always current and there is no stale flag to reset.
   *
   * `heroCleared` is the only piece that needs state, and it is only ever
   * written from the observer callback below.
   */
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [heroCleared, setHeroCleared] = useState(false);
  /** Off-home there is no hero to hide behind, so the launcher is always shown. */
  const revealed = !isHome || heroCleared;
  /** The panel follows the launcher: over the hero, neither is on screen. */
  const panelShown = open && revealed;
  const [token, setToken] = useState<string | null>(null);
  const [voiceGone, setVoiceGone] = useState(false);
  const [audio, setAudio] = useState<{ id: string; state: AudioState } | null>(null);
  /** Response language for copy + /api/ask (not inferred from typed text). */
  const [lang, setLang] = useState<Language>("en");
  const [langOpen, setLangOpen] = useState(false);

  const synced = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  /** Cached blobs, so replaying an answer never costs characters again. */
  const clips = useRef<Map<string, string>>(new Map());
  const revealRaf = useRef(0);
  /** Cancels the in-flight /api/ask fetch + stream reader on unmount (2026-08-28
      code review finding: neither had any cancellation before this). */
  const askAbort = useRef<AbortController | null>(null);

  const capped = asked >= QUESTION_LIMIT;
  const suggestions = SUGGESTED_QUESTIONS[lang];
  const remaining = Math.max(0, QUESTION_LIMIT - asked);
  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? "English";
  /* Wraps here rather than in the interval's updater, which no longer knows the
     queue length — see the cycle effect for why that dependency was removed. */
  const thinkingPhrase =
    thinkQueue[thinkIdx % thinkQueue.length] ?? THINKING_PHRASES[0];
  /** Status only until the first token paints — not over a visible answer. */
  const waitingOnAnswer =
    busy && turns.some((t) => t.role === "assistant" && t.content.length === 0);
  const dotsTip =
    lang === "nl"
      ? remaining === 0
        ? "geen vragen over"
        : remaining === 1
          ? "1 vraag over"
          : `${remaining} vragen over`
      : remaining === 0
        ? "no questions left"
        : remaining === 1
          ? "1 question left"
          : `${remaining} questions left`;

  /**
   * Sync the counter from localStorage the first time the panel opens.
   *
   * Not on mount, and deliberately not in an effect. The server has no
   * localStorage, so seeding state during render desyncs hydration, and doing it
   * in an effect is a cascading render (react-hooks/set-state-in-effect, and the
   * rule is right). An event handler is the correct place: setState there is
   * plain and synchronous.
   *
   * It also means a visitor who never opens the panel does no work at all, which
   * is the same reasoning as fetching the session token lazily below.
   *
   * The matching WRITE lives in ask(). Writing from an effect would fire once
   * with the pre-hydration value and clobber the saved count.
   */
  const syncAskedOnce = useCallback(() => {
    if (synced.current) return;
    synced.current = true;
    // readAsked() also clears an expired entry, so a returning visitor past
    // the 72h window lands here with three fresh questions and no stale date.
    const saved = readAsked();
    if (saved && saved.n > 0) {
      setAsked(Math.min(saved.n, QUESTION_LIMIT));
      setAskedAt(saved.at);
    }
  }, []);

  const toggle = useCallback(() => {
    syncAskedOnce();
    setOpen((v) => !v);
  }, [syncAskedOnce]);

  /**
   * External open trigger — see OPEN_AGENT_EVENT above. Unconditionally opens
   * (not a toggle) so a second click on "Ted" while the panel is already open
   * doesn't close it.
   */
  useEffect(() => {
    const onExternalOpen = () => {
      syncAskedOnce();
      setOpen(true);
    };
    window.addEventListener(OPEN_AGENT_EVENT, onExternalOpen);
    return () => window.removeEventListener(OPEN_AGENT_EVENT, onExternalOpen);
  }, [syncAskedOnce]);

  /**
   * Reveal the launcher once the hero is out of the way.
   *
   * IntersectionObserver rather than ScrollTrigger on purpose: this component
   * mounts OUTSIDE SmoothProvider (see the header notes), so it has no smoother
   * to hang a trigger on, and IO needs neither. It also survives the pinned,
   * scrubbed OpeningDP without any refresh handling, because IO reports real
   * viewport geometry rather than scroll progress.
   *
   * ⚠️ BOTH opening ids are checked. `USE_DP_OPENING` in app/page.tsx decides
   * which hero mounts, and they carry DIFFERENT ids (`#opening-dp` vs
   * `#opening`). Watching only one means the launcher sits over the hero on
   * whichever opening isn't listed, with no error to reveal it. `#opening-dp`
   * is first because it is the one currently shipping.
   *
   * setState happens ONLY in the observer callback, which is the "subscribe to
   * an external system" case the react-hooks rule explicitly allows.
   *
   * ⚠️ `isHome` MUST stay in the deps. With `[]` the observer kept watching a
   * hero that had been unmounted by a route change, so the flag froze at its
   * home-page value and the launcher vanished on /how-i-work.
   */
  useEffect(() => {
    if (!isHome) return;

    const hero =
      document.getElementById("opening-dp") ?? document.getElementById("opening");
    if (!hero) return;

    const io = new IntersectionObserver(
      ([entry]) => setHeroCleared(!entry.isIntersecting),
      // A sliver of hero still on screen counts as "on the hero" — the button
      // should be gone before the visitor is out of it, not appear at the seam.
      { threshold: 0, rootMargin: "-12% 0px 0px 0px" },
    );

    io.observe(hero);
    return () => io.disconnect();
  }, [isHome]);

  const changeLang = useCallback(
    (next: Language) => {
      setLang(next);
      setLangOpen(false);
      onLanguageChange?.(next);
    },
    [onLanguageChange],
  );

  // Cycle the shuffled thinking sticker while waiting on the first token.
  // ⚠️ Depends on `waitingOnAnswer` ALONE. Including thinkQueue.length re-ran
  // the effect on each shuffle, tearing down and rebuilding the interval so the
  // phrase changed far faster than THINKING_CYCLE_MS (measured at ~200ms, not
  // 2400ms). The length is read inside the updater, where it is always current.
  useEffect(() => {
    if (!waitingOnAnswer) return;
    const id = window.setInterval(() => {
      setThinkIdx((i) => i + 1);
    }, THINKING_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [waitingOnAnswer]);

  // Custom lang menu — native <select> paints the OS chrome (dark + blue tick
  // on macOS) and fights the paper panel. Close on outside click.
  useEffect(() => {
    if (!langOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!langRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [langOpen]);

  // Panel open/close — GSAP owns opacity + scale. CSS transition was 200ms and
  // felt abrupt; signature ease + bottom-right origin matches the site motion.
  //
  // ⚠️ Driven by `panelShown`, NOT `open`. GSAP writes opacity and visibility as
  // INLINE styles, so the `data-revealed` CSS that hides the trigger cannot
  // touch the panel — an open panel stayed sitting over the hero on scroll-up.
  // Gating the tween is the only thing that works, and it reuses the existing
  // close animation instead of snapping.
  //
  // `open` itself is deliberately NOT cleared: the panel reopens exactly as the
  // visitor left it when they scroll back down, transcript and counter intact.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0.01 : PANEL_MS / 1000;

    gsap.killTweensOf(el);
    const parts = el.querySelectorAll<HTMLElement>("[data-agent-part]");
    gsap.killTweensOf(parts);

    if (panelShown) {
      gsap.set(el, {
        visibility: "visible",
        pointerEvents: "auto",
        transformOrigin: "100% 100%",
      });
      // Rise + scale, then a 50ms stagger so header → body → compose assemble
      // rather than pasting in as one block.
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.96, y: 8 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration,
          ease: "agentSignature",
          overwrite: true,
        },
      );
      if (!reduced && parts.length) {
        gsap.fromTo(
          parts,
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: Math.min(0.35, duration),
            stagger: 0.05,
            ease: "agentSignature",
            delay: 0.04,
            overwrite: true,
          },
        );
      } else {
        gsap.set(parts, { opacity: 1, y: 0 });
      }
    } else {
      gsap.to(el, {
        opacity: 0,
        scale: 0.96,
        y: 8,
        duration,
        ease: "agentSignature",
        transformOrigin: "100% 100%",
        overwrite: true,
        onComplete: () => {
          gsap.set(el, { visibility: "hidden", pointerEvents: "none", y: 0 });
          gsap.set(parts, { opacity: 1, y: 0 });
        },
      });
    }
  }, [panelShown]);

  // Token is fetched on first open, not on page load: most visitors never open
  // the panel and shouldn't cost a request.
  useEffect(() => {
    if (!open || token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/session", { method: "POST" });
        const data = await res.json();
        if (!cancelled) setToken(data.token ?? null);
      } catch {
        /* /api/ask will surface it if this failed. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  /* Scroll to the newest turn — but NOT on first open. With no turns yet there
     is nothing below the greeting to scroll to, and on a phone (where the panel
     is short and the greeting is three lines) this scrolled straight past the
     first two lines, so the widget opened mid-sentence (Arnav 2026-08-30,
     iOS-width check). Only follow the conversation once there is one. */
  useEffect(() => {
    if (turns.length === 0) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, capped]);

  /**
   * Park the fixed pill/panel just above `.footer-band` when the footer
   * enters the viewport. Resting bottom is `--agent-bottom`; `--agent-lift`
   * grows as the footer rises so the chrome never sits on the copy.
   *
   * Window scroll is enough under Lenis (it scrolls the real document). Also
   * bind lenisRef once it exists — this component mounts before SmoothProvider
   * finishes creating Lenis.
   */
  useEffect(() => {
    const GAP = 16; // air between pill bottom and footer top
    const BASE = 28; // matches --agent-bottom
    let raf = 0;
    let bound: typeof lenisRef.current = null;

    const update = () => {
      raf = 0;
      const footer = document.querySelector<HTMLElement>(".footer-band");
      if (!footer) {
        document.documentElement.style.setProperty("--agent-lift", "0px");
        return;
      }
      const top = footer.getBoundingClientRect().top;
      const needed = Math.max(0, window.innerHeight - top + GAP);
      const lift = Math.max(0, needed - BASE);
      document.documentElement.style.setProperty("--agent-lift", `${lift}px`);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });

    const bindLenis = () => {
      const instance = lenisRef.current;
      if (!instance || instance === bound) return;
      bound = instance;
      instance.on("scroll", onScroll);
    };
    bindLenis();
    const retry = window.setTimeout(bindLenis, 120);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(retry);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll);
      bound?.off("scroll", onScroll);
      document.documentElement.style.setProperty("--agent-lift", "0px");
    };
  }, []);

  // Escape closes, which is the one keyboard affordance people actually try.
  // Lang menu first — don't collapse the whole panel for a menu dismiss.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (langOpen) {
        setLangOpen(false);
        return;
      }
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, langOpen]);

  useEffect(() => {
    const player = playerRef.current;
    const cached = clips.current;
    return () => {
      player?.pause();
      cached.forEach((url) => URL.revokeObjectURL(url));
      if (revealRaf.current) cancelAnimationFrame(revealRaf.current);
      // Stops the in-flight /api/ask fetch + stream reader rather than
      // leaking them past unmount (2026-08-28 code review finding — this
      // effect already cancelled everything else, the ask() request was the
      // one thing it missed).
      askAbort.current?.abort();
    };
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const text = capitalizeLead(question.trim());
      if (!text || busy || capped) return;

      setDraft("");
      setBusy(true);
      setThinkQueue(shuffleThinking());
      setThinkIdx(0);

      const history = [...turns, { role: "user" as const, content: text }];
      setTurns([...history, { role: "assistant", content: "" }]);

      setThinkIdx(0);

      const controller = new AbortController();
      askAbort.current = controller;

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token,
            lang,
            messages: history.map(({ role, content }) => ({ role, content })),
          }),
          signal: controller.signal,
        });

        // Two walls end the conversation and both are flagged by header:
        // "global" (our own daily counter, resets at midnight) and "credit"
        // (the Anthropic account is actually out of money). The per-IP wall
        // also answers 429 but sends NO header, because it lifts in about a
        // minute — a wait, not a dead end.
        if (res.headers.get("X-Agent-Wall")) setOutOfAnswers(true);

        if (!res.body) throw new Error("no body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let lineBuf = "";
        let network = "";
        let answerId: string | undefined;
        let revealed = 0;
        let streamDone = false;
        let lastTick = performance.now();

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const rate = reduced ? 10_000 : CHARS_PER_SEC;
        /* Nothing paints before this, so the thinking line is guaranteed to be
           readable. Reduced motion skips the hold: someone who has asked for
           less movement wants the answer, not a staged pause. */
        const revealFrom = performance.now() + (reduced ? 0 : THINKING_MIN_MS);

        const paint = (content: string, id?: string) => {
          setTurns((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content,
              answerId: id,
            };
            return next;
          });
        };

        const tickReveal = (now: number) => {
          // Hold the whole reveal until the thinking beat has been seen. The
          // stream keeps buffering into `network` meanwhile, so nothing is lost
          // and the answer starts from whatever has arrived.
          if (now < revealFrom) {
            lastTick = now;
            revealRaf.current = requestAnimationFrame(tickReveal);
            return;
          }

          const elapsed = now - lastTick;
          const add = Math.floor((elapsed / 1000) * rate);
          if (add > 0) {
            lastTick = now;
            revealed = Math.min(revealed + add, network.length);
            // Attach answerId only once reveal has caught the finished stream —
            // otherwise the orb pops in mid-sentence.
            const id =
              streamDone && revealed >= network.length ? answerId : undefined;
            paint(network.slice(0, revealed), id);
          }

          if (!streamDone || revealed < network.length) {
            revealRaf.current = requestAnimationFrame(tickReveal);
          } else {
            revealRaf.current = 0;
          }
        };

        revealRaf.current = requestAnimationFrame(tickReveal);

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuf += decoder.decode(value, { stream: true });
          const lines = lineBuf.split("\n");
          lineBuf = lines.pop() ?? "";

          for (const raw of lines) {
            if (!raw.trim()) continue;
            try {
              const event = JSON.parse(raw);
              if (typeof event.t === "string") network += event.t;
              if (typeof event.id === "string") answerId = event.id;
            } catch {
              /* partial or malformed line; skip it */
            }
          }
        }

        streamDone = true;

        // Flush anything still buffered in the reveal loop, then wait for it
        // to catch up before unlocking the composer.
        await new Promise<void>((resolve) => {
          const wait = () => {
            if (revealed >= network.length) {
              if (revealRaf.current) {
                cancelAnimationFrame(revealRaf.current);
                revealRaf.current = 0;
              }
              paint(network, answerId);
              resolve();
              return;
            }
            // If the raf loop died, dump the rest rather than hang busy forever.
            if (!revealRaf.current) {
              revealed = network.length;
              paint(network, answerId);
              resolve();
              return;
            }
            requestAnimationFrame(wait);
          };
          wait();
        });

        // Only a real answer burns a question. /api/ask streams error copy as
        // the same `{t}` shape with NO `{id}`, so status 401/429/502 must not
        // count — answerId is the only proof Haiku finished a real turn.
        if (answerId && network.trim()) {
          const next = asked + 1;
          setAsked(next);
          // Stamp on the FIRST question only. Re-stamping each time would slide
          // the window forward and effectively never let anyone back in.
          const at = askedAt ?? Date.now();
          if (askedAt === null) setAskedAt(at);
          writeAsked(next, at);
        }
      } catch {
        if (revealRaf.current) {
          cancelAnimationFrame(revealRaf.current);
          revealRaf.current = 0;
        }
        // An aborted fetch (component unmounted mid-stream, see the cleanup
        // effect below) throws the same way a real network error does — but
        // there's no one left to show an error message to, and painting one
        // would be a setState-after-unmount warning.
        if (controller.signal.aborted) return;
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: "Something broke on my end. Email Arnav at arnavg1320@gmail.com.",
          };
          return next;
        });
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    },
    [asked, askedAt, busy, capped, lang, token, turns],
  );

  const play = useCallback(
    async (answerId: string) => {
      if (voiceGone) return;

      if (audio?.id === answerId && audio.state === "playing") {
        playerRef.current?.pause();
        setAudio(null);
        return;
      }

      // A click while the SAME answer is already loading must be ignored, not
      // just one while playing. Without this a second click before the first
      // /api/speak fetch resolves fires a second fetch, and the second
      // player.src write while the first play() is still pending throws
      // AbortError — swallowed below, so the orb silently snaps back to idle
      // and looks like the first click "didn't work" (Arnav, 2026-08-29).
      if (audio?.id === answerId && audio.state === "loading") return;

      playerRef.current?.pause();
      setAudio({ id: answerId, state: "loading" });

      try {
        let url = clips.current.get(answerId);

        if (!url) {
          const res = await fetch("/api/speak", {
            method: "POST",
            headers: { "content-type": "application/json" },
            // lang matters here too: it drives both the compression prompt and
            // the TTS language_code. Without it a Dutch answer gets compressed
            // by an English instruction and spoken as English.
            body: JSON.stringify({ id: answerId, token, lang }),
          });

          if (res.status === 429) {
            // Free quota is gone for the month. Not an error, just a note.
            setVoiceGone(true);
            setAudio(null);
            return;
          }
          if (!res.ok) throw new Error("tts failed");

          url = URL.createObjectURL(await res.blob());
          clips.current.set(answerId, url);
        }

        const player = playerRef.current ?? new Audio();
        playerRef.current = player;
        player.src = url;
        player.onended = () => setAudio(null);
        await player.play();
        setAudio({ id: answerId, state: "playing" });
      } catch {
        setAudio(null);
      }
    },
    [audio, lang, token, voiceGone],
  );

  /**
   * Cap CTA → Cal.com. Closes the panel first so it isn't sitting on the
   * calendar. On home this is an in-page Lenis scroll (no curtain). On /about
   * `#contact` does not exist — same bug the nav CONTACT link already solved —
   * so we curtain-route to `/#contact` and smooth-provider honors the hash.
   */
  const goToContact = useCallback(() => {
    setOpen(false);
    const contact = document.getElementById("contact");
    if (contact) {
      window.setTimeout(() => {
        const lenis = lenisRef.current;
        if (lenis) lenis.scrollTo(contact);
        else contact.scrollIntoView({ behavior: "smooth" });
      }, PANEL_MS + 20);
      return;
    }
    // Cross-page: wait out the close tween, then curtain. navigate() itself
    // covers → push → reveal; hash scroll runs after SmoothProvider remounts.
    window.setTimeout(() => {
      navigate("/#contact");
    }, PANEL_MS + 20);
  }, [navigate]);

  /**
   * What the speak control should be showing.
   *
   * Audio always wins — a capped visitor can still replay an answer, and Ted
   * should wake up to do it. Only when nothing is playing does the cap put him
   * to sleep. This is the ONLY sleeping Ted; the cap box deliberately has none.
   */
  /**
   * ONE Ted on screen at a time, and once capped he belongs to the cap message
   * (Arnav 2026-08-29). The cap now always renders a sleeping Ted beside it, so
   * the speak control on the last answer has to go — otherwise the final answer
   * and the cap sit stacked with a crab each, which is the "two messages
   * displaying in one go" problem.
   *
   * The audio itself is unaffected: a clip already playing keeps playing, it
   * just loses its button once the conversation is over.
   */
  const showSpeakControls = !capped;

  const orbState = (answerId: string): TedOrbState => {
    if (audio?.id === answerId) return audio.state;
    return "idle";
  };

  return (
    <>
      <button
        type="button"
        className="agent-trigger"
        data-cursor="pointer"
        aria-expanded={open}
        aria-label={open ? "Minimise" : "Ask about Arnav"}
        onClick={toggle}
        data-open={open}
        // Hidden over the hero so it doesn't compete with the opening moment.
        // HIDDEN, not unmounted: unmounting would throw away the session token,
        // the question counter and any transcript, so a visitor who scrolled up
        // would silently start over.
        data-revealed={revealed}
        // Keyboard and screen readers skip it while it's invisible, otherwise
        // it's a focusable control nobody can see.
        aria-hidden={!revealed}
        tabIndex={revealed ? 0 : -1}
      >
        <span className="agent-trigger-glow" aria-hidden />
        Ask about me
      </button>

      <div
        ref={panelRef}
        className="agent-panel"
        data-lenis-prevent
        role="dialog"
        aria-label="Ask about Arnav"
        aria-hidden={!panelShown}
      >
        <header className="agent-head" data-agent-part>
          <div className="agent-lang" ref={langRef}>
            <button
              type="button"
              className="agent-lang-btn"
              data-cursor="pointer"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label="Answer language"
              onClick={() => setLangOpen((v) => !v)}
            >
              {langLabel}
              <svg
                className="agent-lang-chevron"
                width="8"
                height="5"
                viewBox="0 0 8 5"
                fill="none"
                aria-hidden
              >
                <path
                  d="M1 1l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <ul
              className="agent-lang-menu"
              role="listbox"
              aria-label="Language"
              data-open={langOpen ? "true" : "false"}
              hidden={!langOpen}
            >
              {LANGUAGES.map(({ code, label }) => (
                <li key={code} role="option" aria-selected={code === lang}>
                  <button
                    type="button"
                    data-cursor="pointer"
                    data-active={code === lang ? "true" : "false"}
                    onClick={() => changeLang(code)}
                  >
                    <span>{label}</span>
                    {code === lang && (
                      <span className="agent-lang-check" aria-hidden>
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="agent-head-copy">
            <span className="agent-title">
              <span className="agent-live" aria-hidden />
              Ask about me
            </span>
          </div>

          <div
            className="agent-dots"
            role="status"
            aria-label={dotsTip}
            tabIndex={0}
          >
            {Array.from({ length: QUESTION_LIMIT }, (_, i) => (
              <span
                key={i}
                className="agent-dot-q"
                data-used={i < asked ? "true" : "false"}
                aria-hidden
              />
            ))}
            <span className="agent-dots-tip" aria-hidden>
              {dotsTip}
            </span>
          </div>

          <button
            type="button"
            className="agent-minimise"
            data-cursor="pointer"
            onClick={() => setOpen(false)}
            aria-label="Minimise"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M5.5 8.5 L1.5 12.5 M1.5 9.2 V12.5 H4.8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 5.5 L12.5 1.5 M9.2 1.5 H12.5 V4.8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        <div className="agent-scroll" ref={scrollRef} data-agent-part>
          <p className="agent-greeting">{GREETING[lang]}</p>

          {turns.length === 0 && !capped && (
            <ul className="agent-suggestions">
              {suggestions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    data-cursor="pointer"
                    onClick={() => void ask(q)}
                    disabled={busy}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {turns.map((turn, i) => (
            <div key={i} className="agent-turn" data-role={turn.role}>
              {/* A <div>, not a <p>, ONLY while the thinking line is showing.
                  The dot-matrix spinner renders <div>s internally (it is
                  vendored verbatim from the registry and deliberately not
                  patched), and a <div> inside a <p> is invalid HTML — the
                  browser closes the paragraph early, which React reports as a
                  hydration error. The finished answer stays a <p>, so the
                  bubble's own styles are unchanged for every other state;
                  globals.css matches both element names for the assistant
                  bubble. */}
              {turn.role === "assistant" && !turn.content ? (
                <div>
                  <ThinkingStatus phrase={thinkingPhrase} />
                </div>
              ) : (
                <p>{capitalizeLead(turn.content)}</p>
              )}

              {/* Ted rides beside every assistant turn:
                  thinking → coding face
                  answer ready → blink (hover = happy)
                  click → loading (no sparkles) → playing (halo + meter) */}
              {turn.role === "assistant" && !turn.content && (
                <span className="agent-orb agent-orb--thinking" aria-hidden>
                  <TedOrb state="thinking" />
                </span>
              )}
              {turn.role === "assistant" &&
                Boolean(turn.content) &&
                !voiceGone &&
                showSpeakControls &&
                lang === "en" &&
                (turn.answerId ? (
                  <button
                    type="button"
                    className="agent-orb"
                    data-cursor="pointer"
                    onClick={() => void play(turn.answerId!)}
                    aria-label={
                      orbState(turn.answerId) === "playing"
                        ? "Stop audio"
                        : "Hear Ted read this answer"
                    }
                    data-state={orbState(turn.answerId)}
                    disabled={orbState(turn.answerId) === "loading"}
                  >
                    <TedOrb state={orbState(turn.answerId)} />
                  </button>
                ) : (
                  <span className="agent-orb" aria-hidden>
                    <TedOrb state="idle" />
                  </span>
                ))}
            </div>
          ))}

          {/* Voice quota gone. The visitor can still TYPE, so this stays a note
              rather than a dead end — but it does carry the open-to-work line,
              because running out of a paid resource is exactly the moment to
              mention a call is available (Arnav 2026-08-29). No CTA button: the
              conversation is still live, and a button here would compete with
              the composer directly below it. */}
          {voiceGone && (
            <p className="agent-note">
              {OUT_OF_VOICE[lang]} {OPEN_TO_WORK_SHORT[lang]}
            </p>
          )}

          {/* Ran out of API budget rather than questions. The wall copy and the
              open-to-work line already streamed in as the assistant turn above
              (see /api/ask's guard branch), so this only adds the CTA — and
              only when the cap box is not already showing one. */}
          {outOfAnswers && !capped && (
            <div className="agent-cap agent-cap--quota">
              {/* A real <a href="/#contact">, not a button (Arnav 2026-08-29).
                  It still scrolls to the embedded calendar — preventDefault +
                  goToContact — but being an anchor means it can be copied,
                  middle-clicked or opened in a tab, and it lands on the Cal
                  embed rather than an external page. No separate link line. */}
              <Link
                href="/#contact"
                data-cursor="pointer"
                onClick={(e) => {
                  e.preventDefault();
                  goToContact();
                }}
              >
                <span>{CAP_CTA[lang]}</span>
                <span className="agent-cap-arrow" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          )}

          {capped && (
            /* Laid out like an assistant turn — copy left, Ted right — so the
               cap reads as Ted's last message rather than a separate panel
               that appeared underneath one (Arnav 2026-08-29). */
            <div className="agent-turn agent-turn--cap" data-role="assistant">
              <div className="agent-cap">
                <p>{CAP_MESSAGE[lang]}</p>
                {askedAt !== null && (
                  <p className="agent-cap-reset">
                    {capResetLine(lang, askedAt + RESET_MS)}
                  </p>
                )}
                {/* "slot" IS the link — no CTA row underneath. A sentence that
                    already contains the action does not need a button below it
                    repeating the same thing. */}
                <p className="agent-cap-open">
                  {OPEN_TO_WORK_PARTS[lang].before}
                  <Link
                    href="/#contact"
                    className="agent-cap-inline"
                    data-cursor="pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      goToContact();
                    }}
                  >
                    {OPEN_TO_WORK_PARTS[lang].link}
                  </Link>
                  {OPEN_TO_WORK_PARTS[lang].after}
                </p>
              </div>

              {/* Sleeping Ted rides beside the cap exactly like the orb rides
                  beside every other assistant turn. Previously he only appeared
                  when no speakable answer existed, which left the cap as the one
                  message on the page with nothing next to it. */}
              <span className="agent-orb agent-orb--sleeping" aria-hidden>
                <TedOrb state="sleeping" />
              </span>
            </div>
          )}
        </div>

        {!capped && (
          <form
            className="agent-compose"
            data-agent-part
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
            }}
          >
            <div className="agent-compose-field">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={(e) => {
                  // iOS Safari doesn't shrink the layout viewport for the
                  // keyboard, only the visual one — a position:fixed panel
                  // pinned near the bottom (.agent-panel) can end up partly
                  // or fully behind the keyboard with no native scroll to
                  // reveal it (Arnav 2026-08-29: "check... able to type into
                  // my agent easily... they will be using a phone"). The
                  // timeout waits for the keyboard's own open animation, so
                  // the browser measures the POST-keyboard visible area
                  // before scrolling — scrolling immediately would target
                  // the pre-keyboard layout and undershoot.
                  const target = e.currentTarget;
                  window.setTimeout(() => {
                    target.scrollIntoView({ block: "center", behavior: "smooth" });
                  }, 300);
                }}
                placeholder={
                  waitingOnAnswer
                    ? ""
                    : lang === "nl"
                      ? "Stel een vraag"
                      : "Ask me something"
                }
                disabled={busy}
                maxLength={1000}
                aria-label="Your question"
                data-busy={waitingOnAnswer ? "true" : "false"}
              />
              {/* ⛔ The thinking sticker used to render here too, so "Baking..."
                  appeared in the composer AND next to Ted at the same time.
                  It belongs to Ted only — this is where the visitor is typing. */}
            </div>
            <button
              type="submit"
              data-cursor="pointer"
              disabled={busy || !draft.trim()}
              aria-label="Send"
            >
              →
            </button>
          </form>
        )}
      </div>
    </>
  );
}
