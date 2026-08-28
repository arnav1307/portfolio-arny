import localFont from "next/font/local";
import { Raleway } from "next/font/google";

// ── FINAL FONT SET (typography pass 2026-08-26) ──
// Display = Open Sauce One (self-hosted — NOT available via next/font/google,
//   it isn't a Google Fonts family; Arnav downloaded the OFL-licensed .ttf
//   files into design/open-sauce/, 5 weights copied into public/fonts/).
//   Arnav's heading system: H1 black (900→800, see note below), H2
//   medium-black (700), H3 regular (400).
// Secondary = Raleway (Google Fonts, available directly). Replaces Tabular —
//   body copy at regular weight, plus a medium (500) weight for H3-adjacent
//   labels.
// Devanagari = Anek (नमस्कार only), untouched by this pass.
//
// Both new faces keep the SAME CSS variable names (--font-display,
// --font-mono) as the fonts they replace, so every existing call site across
// globals.css and every component keeps working — only the underlying
// font-family changes.

// Open Sauce One — display face: "Hi," / "I'm Arnav", all H1/H2/H3 headings.
// The family's heaviest static weight is 800 (Black) — there is no 900; the
// old Satoshi-era `font-weight: 1000` literal in .opening-name/.name-line
// (globals.css) is now out of range and clamps to 800 in practice.
export const displayFont = localFont({
  src: [
    { path: "../public/fonts/OpenSauceOne-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/OpenSauceOne-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/OpenSauceOne-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/OpenSauceOne-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "../public/fonts/OpenSauceOne-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Raleway — secondary/body face: paragraph copy, labels, time widget, section
// eyebrows, cursor tooltip, annotations. The var is still called --font-mono
// so every existing call site keeps working; only the file behind it changed.
export const tabular = Raleway({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Anek Devanagari — subset to नमस्कार glyphs ONLY (greeting cycle). weight 600 per tokens.md.
export const anekDevanagari = localFont({
  src: [{ path: "../public/fonts/AnekDevanagari-namaskar.woff2", weight: "600", style: "normal" }],
  variable: "--font-devanagari",
  display: "swap",
});
