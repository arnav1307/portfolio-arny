import Link from "next/link";

/**
 * Text Arrow CTA — rebuilt 2026-08-28 (Arnav, pasted a reference component
 * and said "delete the old cta code and replace it with the code down
 * below"). The reference used `styled-components`, which isn't in this
 * stack (Tailwind 4 CSS-first + GSAP is the whole story per CLAUDE.md) —
 * ported the same mechanic into a plain CSS block in globals.css instead of
 * adding a new styling library for one component. Reference also hardcoded
 * `--primary-color: #111` / `--hovered-color: #c84747` as raw hex; mapped to
 * this site's own tokens (`--ink`, `--accent-red`) so dark mode and the
 * eye-toggle keep working — hardcoded hex here breaks that flip, a repeat
 * bug class this codebase has hit before.
 *
 * Mechanic (from the reference, kept): label text is duplicated into a
 * `::before` overlay in the hover colour, clipped to 0% width at rest;
 * hover animates that clip to 100%, so the label appears to recolour
 * left-to-right rather than snapping. A thin underline grows the same way.
 * The arrow translates on hover and swaps to the hover colour.
 *
 * `reverse` (about page's "Back" link) mirrors the arrow horizontally and
 * flips which side of the label it sits on — same two call sites as before
 * (selected-work.tsx's "More on how I work", about-hero.tsx's "Back").
 */

type TextArrowCtaProps = {
  /** Internal or external URL. If omitted, renders as a non-navigating span with the same visuals. */
  href?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  className?: string;
  /** Arrow sits before the label and mirrors horizontally — used for the about page's back link. */
  reverse?: boolean;
};

export function TextArrowCta({
  href,
  children,
  onClick,
  onMouseEnter,
  onFocus,
  className,
  reverse = false,
}: TextArrowCtaProps) {
  const label = typeof children === "string" ? children : undefined;

  const content = (
    <>
      {reverse && <ArrowIcon reverse />}
      <span
        className="text-arrow-cta-label"
        data-text={label}
      >
        {children}
      </span>
      {!reverse && <ArrowIcon />}
    </>
  );

  const classes = `text-arrow-cta ${reverse ? "text-arrow-cta--reverse" : ""} ${className ?? ""}`.trim();
  const ariaLabel = label;

  if (!href) {
    return (
      <span
        className={classes}
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
      href={href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      data-cursor="pointer"
      aria-label={ariaLabel}
      className={classes}
    >
      {content}
    </Link>
  );
}

function ArrowIcon({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg
      className="text-arrow-cta-icon"
      viewBox="0 0 24 24"
      width={15}
      height={15}
      aria-hidden="true"
      style={reverse ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
