import type { Metadata, Viewport } from "next";
import { displayFont, tabular, anekDevanagari } from "./fonts";
import { Providers } from "@/components/motion/providers";
import "./globals.css";

// Favicon is the emoji itself inside an SVG — no PNG/ICO bake step (that
// collapsed ❤️‍🔥 → ❤️ at tab size). Data URI so the glyph ships in the HTML
// and nothing can serve a stale /favicon.ico triangle/heart.
const FAVICON_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="55" text-anchor="middle" dominant-baseline="central" font-size="80">\u2764\uFE0F\u200D\u{1F525}</text></svg>`;

export const metadata: Metadata = {
  title: "Arny",
  description:
    "Arnav Gupta — builds AI-driven automation systems end-to-end, from messy enterprise data to working agents and executive dashboards.",
  icons: {
    icon: [
      {
        url: `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`,
        type: "image/svg+xml",
      },
      { url: "/icon.svg?v=4", type: "image/svg+xml" },
    ],
  },
};

/**
 * Explicit viewport (2026-08-01). Next supplies a sensible default, but the
 * site now has real mobile breakpoints, so this is stated rather than inherited.
 * `maximumScale` is deliberately left alone — capping zoom breaks pinch-to-zoom
 * for anyone who needs it.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Pre-paint theme + custom-cursor flags so there is no flash of the wrong
// theme on load. Runs before React hydrates. Theme is eye-toggle driven and
// persisted to localStorage under "theme" (default light).
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark") document.documentElement.setAttribute("data-theme","dark");
  } catch (e) {}
  if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
    document.documentElement.classList.add("has-custom-cursor");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${tabular.variable} ${anekDevanagari.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Pre-paint theme + cursor flags. dangerouslySetInnerHTML in <head> is
           the React 19 escape hatch — runs before hydration, no script-in-tree
           warning (unlike <script>{string}</script> or next/script in body). */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
