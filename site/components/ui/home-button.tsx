/**
 * HomeButton — the /about nav's return-to-home control.
 *
 * Replaces the earlier hand-drawn pixel house, which read as crude next to the
 * rest of the chrome (Arnav 2026-07-28). Framer's Glassy Button was the
 * reference; it's a paid marketplace component and its code can't be shipped
 * here, so this is the same idea rebuilt from the site's own tokens: a soft
 * translucent pill with a blurred backdrop, a hairline border, and a clean
 * geometric house glyph.
 *
 * No hooks → server-safe.
 */

export function HomeButton({ size = 38 }: { size?: number }) {
  return (
    <span className="home-btn" style={{ width: size, height: size }}>
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
      >
        {/* Roof + walls as one path, then the door. */}
        <path d="M3 10.2 12 3.2l9 7v9.1a1.7 1.7 0 0 1-1.7 1.7H4.7A1.7 1.7 0 0 1 3 19.3z" />
        <path d="M9.3 21.3v-6.4h5.4v6.4" />
      </svg>
    </span>
  );
}
