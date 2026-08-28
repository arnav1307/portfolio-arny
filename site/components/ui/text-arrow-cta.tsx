import Link from "next/link";
import { useLayoutEffect, useRef, type CSSProperties } from "react";

/**
 * Text Arrow CTA — locked 2026-08-27 (Arnav, with a screenshot): rest =
 * "More on how I work →", hover = "→ More on how I work". The arrow FULLY
 * SWAPS from the right side of the label to the left side, sliding the whole
 * label width and passing behind the text glyphs mid-transit (z-index under
 * the label). It does not just nudge a few px — it ends up on the opposite
 * side. The label itself never moves; only the arrow's position animates,
 * between a right slot and a left slot that flank a fixed-width track so the
 * underline (spanning the whole track) never resizes.
 *
 * The arrow's travel distance is the label's width (it slides all the way
 * across). A FIXED transition-duration therefore makes short labels ("Back")
 * animate much faster-feeling than long ones ("More on how I work") even
 * though both use the same 320ms — Arnav caught this side-by-side. Duration
 * is instead derived from the measured label width at a constant speed
 * (px/ms), so every instance of this component moves at the same visual
 * speed regardless of copy length.
 */
const ARROW_SPEED_PX_PER_MS = 0.55;
const MIN_DURATION_MS = 120;
const MAX_DURATION_MS = 480;

type TextArrowCtaProps = {
  /** Internal or external URL. If omitted, renders as a non-navigating span with the same visuals. */
  href?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  className?: string;
  /** Rest state has the arrow on the left instead of the right, hover slides it further left — used for the about page's back link. */
  reverse?: boolean;
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: number | string;
  fontColor?: string;
  underlineColor?: string;
  arrowColor?: string;
  /** Arrow width/height in px. */
  arrowSize?: number;
  arrowStroke?: number;
  /** Gap between label and arrow at rest, in px. */
  arrowGap?: number;
};

export function TextArrowCta({
  href,
  children,
  onClick,
  onMouseEnter,
  onFocus,
  className,
  reverse = false,
  fontFamily,
  fontSize,
  fontWeight,
  fontColor,
  underlineColor,
  arrowColor,
  arrowSize = 18,
  arrowStroke = 1.5,
  arrowGap = 8,
}: TextArrowCtaProps) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLAnchorElement & HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const label = labelRef.current;
    const root = rootRef.current;
    if (!label || !root) return;
    // Travel distance = label width (the arrow slides across the whole
    // label). Duration is that distance at a constant px/ms speed, clamped
    // so a one-word label still animates and a very long one doesn't crawl.
    const distance = label.getBoundingClientRect().width;
    const duration = Math.min(
      MAX_DURATION_MS,
      Math.max(MIN_DURATION_MS, distance / ARROW_SPEED_PX_PER_MS),
    );
    root.style.setProperty("--arrow-duration", `${duration}ms`);
  }, [children]);

  const style = {
    "--arrow-gap": `${arrowGap}px`,
    "--arrow-size": `${arrowSize}px`,
    ...(fontFamily && { fontFamily }),
    ...(fontSize !== undefined && { fontSize }),
    ...(fontWeight !== undefined && { fontWeight }),
    ...(fontColor && { color: fontColor }),
    ...(underlineColor && { "--arrow-underline-color": underlineColor }),
  } as CSSProperties;

  const content = (
    <>
      <span ref={labelRef} className="text-arrow-cta-label">{children}</span>
      <svg
        className="text-arrow-cta-icon"
        viewBox="0 0 24 24"
        width={arrowSize}
        height={arrowSize}
        aria-hidden="true"
        style={arrowColor ? { color: arrowColor } : undefined}
      >
        <path
          d="M5 12h14M13 6l6 6-6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth={arrowStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );

  const classes = `text-arrow-cta ${reverse ? "text-arrow-cta--reverse" : ""} ${className ?? ""}`.trim();
  const ariaLabel = typeof children === "string" ? children : undefined;

  if (!href) {
    return (
      <span
        ref={rootRef}
        className={classes}
        style={style}
        role="link"
        aria-disabled="true"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      ref={rootRef}
      href={href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      data-cursor="pointer"
      aria-label={ariaLabel}
      className={classes}
      style={style}
    >
      {content}
    </Link>
  );
}
