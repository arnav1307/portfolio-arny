import localFont from "next/font/local";

// ── FINAL FONT SET (display switched to Satoshi 2026-07-26) ──
// Display = Satoshi (Fontshare, free). Replaces Geist, which was the earlier
//   lock; Arnav confirmed Satoshi is the primary face. Framer's Opening used
//   General Sans — same foundry/feel — but Satoshi is what ships.
// Secondary = Tabular (Fontshare). Replaced Departure Mono 2026-07-30 —
//   Arnav: "remove the robotic font … Satoshi primary, Tabular secondary."
//   Departure's pixel face read retro-game; Tabular is a real mono-ish grotesk.
// Devanagari = Anek (नमस्कार only).

// Satoshi — display face: "Hi," / "I'm Arnav", section headers.
// Variable woff2 carries the 300–900 weight axis, so Medium (500) is exact
// rather than synthesised. Self-hosted, no Fontshare CDN call at runtime.
export const displayFont = localFont({
  src: [{ path: "../public/fonts/Satoshi-Variable.woff2", weight: "300 900", style: "normal" }],
  variable: "--font-display",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Tabular — secondary face: labels, time widget, section eyebrows, cursor
// tooltip, annotations. Variable woff2 carries a 300–700 axis; call sites use
// REGULAR (400) — Light read too thin at 12–13px (Arnav 2026-07-30).
// The var is still called --font-mono so every existing call site keeps working;
// only the file behind it changed.
export const tabular = localFont({
  src: [{ path: "../public/fonts/Tabular-Variable.woff2", weight: "300 700", style: "normal" }],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

// Anek Devanagari — subset to नमस्कार glyphs ONLY (greeting cycle). weight 600 per tokens.md.
export const anekDevanagari = localFont({
  src: [{ path: "../public/fonts/AnekDevanagari-namaskar.woff2", weight: "600", style: "normal" }],
  variable: "--font-devanagari",
  display: "swap",
});
