"use client";

import { useScramble } from "use-scramble";

/**
 * Name block — renders "I'm Arnav" ("Hi," is a separate node in the section, per
 * Framer). Only the word "Arnav" scrambles on hover;
 * it resolves back to "Arnav" (no content change).
 *
 * Library is `use-scramble` (MIT) — deliberately NOT motion.dev's paywalled
 * Motion+ ScrambleText. Config below is Arnav's, verbatim from
 * design/opening-section-spec.md.
 */
const SCRAMBLE_CONFIG = {
  text: "Arnav",
  // false = DO play on mount (the prop reads inverted upstream: "when true, the
  // animation will not play the first time a text input is provided"). Playing
  // it once is what writes "Arnav" into the empty span.
  playOnMount: false,
  range: [65, 125] as [number, number],
  speed: 1,
  tick: 1,
  step: 4,
  scramble: 38,
  seed: 2,
  chance: 0.93,
  overdrive: false,
  overflow: false,
};

export function ScrambleName() {
  const { ref, replay } = useScramble(SCRAMBLE_CONFIG);

  return (
    <div className="flex flex-col leading-[0.92]">
      {/* font-size is inherited from the section (not .type-display's own
          clamp) so the half-split can scale the block as one unit. */}
      <span className="name-line text-ink">
        {/* Static — NOT part of the scramble. The hook's ref is on the inner
            span alone, so only "Arnav" ever gets rewritten. */}
        I&rsquo;m{" "}
        <span
          ref={ref}
          onMouseEnter={replay}
          onFocus={replay}
          tabIndex={0}
          data-cursor="pointer"
          // Fixed width stops the layout jittering while chars swap.
          className="scramble-word inline-block cursor-pointer outline-none"
        />
      </span>
    </div>
  );
}
