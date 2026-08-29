"use client";

import { ScrambleName } from "@/components/motion/scramble-name";
import { PixelCrab } from "@/components/ui/pixel-crab";
import { OWNERSHIP_STATEMENT } from "@/lib/data";

/**
 * The hero copy stack used by the mood-board `OpeningDP` A/B candidate.
 *
 * `Opening` (the DotField half-split) deliberately keeps its OWN inline copy
 * of this content rather than importing here — it is locked and untouched, so
 * this file is free to carry the DP-specific layout Arnav asked for:
 *   - "Hi, I'm Arnav" on ONE line at a larger size (2026-08-02), with only
 *     "Arnav" scrambling on hover.
 *   - Space, then the ownership statement, with the pixel crab sitting inline
 *     between "post" and "launch".
 *
 * The DATA·PRODUCT·AI caption row is not shown here: on the DP board that role
 * is played by the four mood-board captions.
 */

/* Reverted 2026-08-27 — split point moved back to right before "post launch,"
   (was " launch,", which put the crab between "post" and "launch" instead of
   between "to" and "post"). */
const [STATEMENT_HEAD, STATEMENT_TAIL] = OWNERSHIP_STATEMENT.split(" post launch,");

export function OpeningHeroContent() {
  return (
    <>
      {/* Greeting + name share a row on desktop; wrap allowed on phone via
          `.opening-hero-greet` in globals.css so narrow viewports don't overflow.
          Site's only true H1 — typography pass 2026-08-26. */}
      <h1
        className="opening-hero-greet flex items-baseline justify-center gap-[0.3em]"
        style={{ fontSize: "clamp(2rem, 5.2vw + 0.5rem, 5.5rem)", lineHeight: 1.02 }}
      >
        <span className="opening-name" style={{ fontSize: "inherit" }}>
          Hi,
        </span>
        <ScrambleName />
      </h1>

      {/* Mobile-only crab (Arnav 2026-08-29): the statement wraps to multiple
          lines below 900px (.opening-hero-statement in globals.css), so the
          desktop crab's absolute mid-sentence placement lands wherever that
          wrap happens to fall — reads as floating in the wrong spot. On
          mobile it sits as its own block above the statement instead; the
          inline desktop version is hidden there via .opening-hero-crab-inline. */}
      <span
        className="pixel-crab-hover pixel-crab-hover--mobile mt-6 hidden"
        tabIndex={0}
        data-cursor="pointer"
        aria-label="Pixel crab says: Hi, I'm Ted!"
      >
        <span aria-hidden className="pixel-crab-message">
          Hi, I&apos;m Ted!
        </span>
        <PixelCrab size={30} className="block" />
      </span>

      {/* Ownership statement — H2 (typography pass 2026-08-26). font-medium
          (500) = bit bolder than body 400; title stays optically heavier via
          size. Crab is absolute so it takes NO gap in the line. */}
      <h2 className="opening-hero-statement font-display mt-15 max-w-[540px] text-[21.25px] font-medium leading-relaxed tracking-[-0.03em] text-muted">
        {STATEMENT_HEAD}
        <span className="opening-hero-crab-inline relative inline-block w-0 align-baseline">
          <span
            className="pixel-crab-hover absolute bottom-full left-1/2 mb-5 -translate-x-1/2"
            tabIndex={0}
            data-cursor="pointer"
            aria-label="Pixel crab says: Hi, I'm Ted!"
          >
            <span aria-hidden className="pixel-crab-message">
              Hi, I&apos;m Ted!
            </span>
            <PixelCrab size={30} className="block" />
          </span>
        </span>{" "}
        post launch,{STATEMENT_TAIL}
      </h2>
    </>
  );
}
