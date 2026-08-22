/**
 * TerminalShot — the Claude Code session panel at the top of /about's right column.
 *
 * Built in CODE, not a generated screenshot (decided 2026-07-27). Reasons: image
 * models garble the box-drawing glyphs (⏺ ⎿ ☒ ▣) this UI is made of; a code panel
 * stays sharp at every DPI; and a page arguing "I build with AI end-to-end" should
 * not depict a fake of that workflow when it can render a real one.
 *
 * Effect matched to Arnav's reference (inspiration/screenshots/Screenshot
 * 2026-07-27 at 4.40.05 PM.png):
 *   - content is OVERSIZED and overflows the frame horizontally, so the panel
 *     reads as a window cropped out of a much larger terminal
 *   - the four edges fade to black (mask), never a hard cut
 *   - two brightness tiers: active lines bright, done/pending lines muted
 *   - scattered translucent highlight blocks over some cells
 *   - one green accent (the spinner dot), one block cursor in the input
 *
 * Deliberately dark in BOTH themes — it is a terminal. No hooks → server-safe.
 */

import Image from "next/image";
import { TERMINAL_SESSION } from "@/lib/about-data";

/**
 * Arnav is capturing a real Claude Code session on his own Mac. Drop that PNG at
 * site/public/assets/about-terminal.png and set this to true — the coded panel
 * below is the stand-in until then, and stays as the fallback.
 */
const USE_REAL_SCREENSHOT = true;
const SCREENSHOT_SRC = "/assets/about-terminal.png";

/**
 * ┌─ TUNE THE PANEL HERE ───────────────────────────────────────────────────┐
 * Type scale drives the whole composition. `fontSize` is intentionally large
 * relative to the frame — that oversizing IS the effect.
 * └─────────────────────────────────────────────────────────────────────────┘
 */
const PANEL = {
  /** Matches the real screenshot's crop (1500×640) so nothing is cut off. */
  aspect: "1500 / 640",
  /**
   * Real terminal typeface, NOT the site's Departure Mono (Arnav 2026-07-28:
   * "Departure mono inside the screenshot naah"). Departure is a pixel/bitmap
   * face — it reads as retro-game, not macOS terminal. This is the stack a Mac
   * terminal actually uses, so the panel renders in the same letterforms the
   * real app does.
   */
  fontFamily:
    'ui-monospace, "SF Mono", SFMono-Regular, Menlo, "JetBrains Mono", "Cascadia Mono", monospace',
  /**
   * Oversized mono. Deliberately sized against the PANEL's own width (cqw), not
   * the viewport — the container query unit is what makes the text overflow the
   * frame at every column width, which is the cropped-window effect. A vw-based
   * clamp collapsed to its floor here and fit neatly inside, killing the effect.
   */
  fontSize: "clamp(12px, 2.35cqw, 19px)",
  lineHeight: 1.72,
  /** Content is nudged off the left/top edges so it reads as mid-scrollback. */
  padLeft: "7%",
  padTop: "4%",
  /** Edge fade depth — how far the fade reaches in from each side. */
  fade: { top: "14%", bottom: "11%", left: "5%", right: "13%" },
} as const;

/** Palette is local to the terminal — it never follows the site theme. */
const C = {
  bg: "#0a0a0a",
  bright: "#f5f7fa",
  dim: "#8b929b",
  dimmer: "#6b7178",
  green: "#2fbf57",
  highlight: "rgba(255, 255, 255, 0.07)",
  inputBorder: "rgba(255, 255, 255, 0.22)",
} as const;

/**
 * Claude Code's line markers are box-drawing glyphs (⏺ ⎿) that Departure Mono
 * does not carry — the browser substitutes a generic dot for all of them, which
 * flattens the visual hierarchy and, worse, makes the plain markers
 * indistinguishable from the green spinner. Drawing them as small CSS shapes
 * keeps the exact look and stays sharp at any size.
 */
function Bullet({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "0.62em",
        height: "0.62em",
        marginRight: "0.55em",
        borderRadius: "50%",
        background: color,
        verticalAlign: "baseline",
      }}
    />
  );
}

/** The "⎿" elbow that prefixes a tool result. */
function Elbow() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "0.5em",
        height: "0.5em",
        marginRight: "0.55em",
        borderLeft: "1.5px solid currentColor",
        borderBottom: "1.5px solid currentColor",
        opacity: 0.75,
        // Hangs just above the baseline, as the real ⎿ glyph does.
        verticalAlign: "0.08em",
      }}
    />
  );
}

/** Todo checkbox: done (☒), in-progress (▣), pending (☐). */
function Checkbox({ state }: { state: "done" | "active" | "todo" }) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: "0.78em",
        height: "0.78em",
        marginRight: "0.5em",
        border: "1.5px solid currentColor",
        borderRadius: 2,
        verticalAlign: "-0.04em",
        opacity: state === "todo" ? 0.55 : 1,
      }}
    >
      {state === "done" && (
        // ✗ — two crossed strokes, drawn rather than typed.
        <>
          <span style={CROSS_BASE} />
          <span style={{ ...CROSS_BASE, transform: "rotate(-45deg)" }} />
        </>
      )}
      {state === "active" && (
        <span
          style={{
            position: "absolute",
            inset: "0.16em",
            background: "currentColor",
            borderRadius: 1,
          }}
        />
      )}
    </span>
  );
}

const CROSS_BASE: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "12%",
  width: "76%",
  height: "1.5px",
  background: "currentColor",
  transform: "rotate(45deg)",
};

/** Soft blocks scattered over cells, as in the reference. */
function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: C.highlight,
        borderRadius: 3,
        padding: "0.08em 0.22em",
        margin: "0 -0.22em",
      }}
    >
      {children}
    </span>
  );
}

export function TerminalShot() {
  const { toolCall, toolResult, todoHeader, todos, spinner, spinnerNote, input, status } =
    TERMINAL_SESSION;

  return (
    <div
      // Terminal stays dark in both themes; it is a screenshot-like artifact.
      className="relative w-full overflow-hidden rounded-2xl"
      // `container-type: inline-size` establishes the query context that the
      // cqw font-size above resolves against.
      style={{
        background: C.bg,
        aspectRatio: PANEL.aspect,
        containerType: "inline-size",
      }}
      // Decorative: the same session content is stated in the prose below.
      role="img"
      aria-label="A Claude Code session building this portfolio"
    >
      {USE_REAL_SCREENSHOT && (
        <Image
          src={SCREENSHOT_SRC}
          alt=""
          fill
          priority
          // `contain`, not `cover`: the frame's aspect already matches the
          // screenshot, so cover would only ever shave edges off the terminal.
          className="object-contain"
          sizes="(max-width: 900px) 100vw, 800px"
        />
      )}

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          display: USE_REAL_SCREENSHOT ? "none" : undefined,
          paddingLeft: PANEL.padLeft,
          paddingTop: PANEL.padTop,
          fontFamily: PANEL.fontFamily,
          fontSize: PANEL.fontSize,
          lineHeight: PANEL.lineHeight,
          color: C.dim,
          whiteSpace: "pre",
          // Edge fade — the crop reads as a window into a longer session rather
          // than a panel that happens to end. Doubling as -webkit- keeps Safari.
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, #000 ${PANEL.fade.top}, #000 calc(100% - ${PANEL.fade.bottom}), transparent 100%), linear-gradient(to right, transparent 0%, #000 ${PANEL.fade.left}, #000 calc(100% - ${PANEL.fade.right}), transparent 100%)`,
          maskImage: `linear-gradient(to bottom, transparent 0%, #000 ${PANEL.fade.top}, #000 calc(100% - ${PANEL.fade.bottom}), transparent 100%), linear-gradient(to right, transparent 0%, #000 ${PANEL.fade.left}, #000 calc(100% - ${PANEL.fade.right}), transparent 100%)`,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      >
        {/* Cut off at the top edge — implies scrollback above the crop. */}
        <div style={{ color: C.dimmer }}>
          <Elbow />
          {toolResult.previous}
        </div>

        <div style={{ height: "0.7em" }} />

        {/* Tool call + its result line */}
        <div style={{ color: C.bright }}>
          <Bullet color={C.bright} />
          {toolCall}
        </div>
        <div style={{ color: C.dimmer }}>
          <Elbow />
          {toolResult.line}
        </div>

        <div style={{ height: "0.7em" }} />

        {/* Todo list — mixed states, some cells highlighted. */}
        <div style={{ color: C.bright }}>
          <Bullet color={C.bright} />
          {todoHeader}
        </div>
        {todos.map((todo) => (
          <div key={todo.label} style={{ color: C.dim, paddingLeft: "1.2em" }}>
            <Checkbox state={todo.state} />
            {todo.highlight ? <Highlight>{todo.label}</Highlight> : todo.label}
          </div>
        ))}

        <div style={{ height: "0.7em" }} />

        {/* The one green accent in the whole panel. */}
        <div style={{ color: C.bright }}>
          <Bullet color={C.green} />
          {spinner}
        </div>
        <div style={{ color: C.dimmer }}>
          <Elbow />
          {spinnerNote}
        </div>

        <div style={{ height: "0.8em" }} />

        {/* Input box — block cursor sits over the first character. */}
        <div
          style={{
            display: "inline-block",
            minWidth: "78%",
            padding: "0.42em 0.7em",
            border: `1px solid ${C.inputBorder}`,
            borderRadius: 8,
            color: C.dim,
          }}
        >
          <span style={{ marginRight: "0.6em" }}>→</span>
          <span style={{ background: C.dim, color: C.bg }}>
            {input.charAt(0)}
          </span>
          {input.slice(1)}
        </div>

        <div style={{ height: "0.7em" }} />

        <div style={{ color: C.dimmer }}>{status}</div>
      </div>
    </div>
  );
}
