"use client";

/**
 * TedWalk — Ted walks the horizontal rule above the closing quote on
 * /how-i-work, like a ledge.
 *
 * ── LOCKED SPEC (2026-08-15). Tuned in crab-preview.html, ported not re-derived.
 *   speed    timeScale(0.5). Final, tested against 0.3 / 0.75 / 1.
 *   facing   walking RIGHT shows the `right` frame. This matches the source
 *            geometry (right.svg eyes at x24/x36, right of the body's x24
 *            centre). It was briefly flipped on a misread and flipped back after
 *            an A/B in the lab. ⛔ Do not "fix" this again.
 *   legs     freeze whenever he is not travelling — BOTH turns and the whole
 *            dizzy beat. Legs still stepping while parked was the "stuck on the
 *            right" bug, and it is invisible in code review because it only
 *            shows at low timeScale.
 *   dizzy    a DEAD STOP. Spiral eyes ~1.15s, a blink, then on he goes.
 *            ⛔ No wobble, no rotation, no drift — all tried, all rejected. The
 *            stillness is the joke.
 *
 * Two structural notes:
 *  - The gait is a fixed 140ms interval, INDEPENDENT of travel distance, so the
 *    step rate stays constant no matter how wide the rule is.
 *  - Turns are their own sub-timeline rather than a bare empty tween, so the leg
 *    freeze and the face swap cannot drift apart.
 *
 * This is an ordinary in-page element, so it scrolls with Lenis and needs none
 * of the fixed-position handling the nav/cursor/widget need. The timeline is
 * INDEPENDENT and infinite, never scrub-driven — a scrubbed walk would rewind
 * when the visitor scrolls up.
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import {
  TedBodySprite,
  TedFaceSprite,
  type TedFace,
  type TedLegs,
} from "@/components/ui/pixel-crab";

/** Rendered crab size. Matches the hero crab so he reads as the same character. */
const SIZE = 30;
/** Step interval. Constant regardless of how far he has to travel. */
const GAIT_MS = 140;
/** Final, from the lab. */
const TIME_SCALE = 0.5;

export function TedWalk() {
  const laneRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const lane = laneRef.current;
    const walker = walkerRef.current;
    if (!lane || !walker) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const layer = (n: TedFace | TedLegs) =>
      walker.querySelector<HTMLElement>(`[data-w="${n}"]`);

    const setFace = (n: TedFace) => {
      (["right", "left", "dizzy", "blink"] as const).forEach((f) =>
        gsap.set(layer(f), { autoAlpha: f === n ? 1 : 0 }),
      );
    };
    const setLegs = (n: TedLegs) => {
      (["stand", "stepA", "stepB"] as const).forEach((l) =>
        gsap.set(layer(l), { autoAlpha: l === n ? 1 : 0 }),
      );
    };

    let step = 0;
    let gaitOn = false;
    let heading: "right" | "left" = "right";

    setFace("right");
    setLegs("stand");

    const gait = window.setInterval(() => {
      if (!gaitOn) return;
      step = 1 - step;
      setLegs(step ? "stepA" : "stepB");
      gsap.set(walker, { y: step ? -1 : 0 });
    }, GAIT_MS);

    /** Stop travelling AND stop stepping. Used by turns and the dizzy beat. */
    const park = () => {
      gaitOn = false;
      setLegs("stand");
      gsap.set(walker, { y: 0 });
    };

    const stumble = () =>
      gsap
        .timeline()
        .call(() => {
          park();
          setFace("dizzy");
        })
        .to({}, { duration: 1.15 })
        .call(() => setFace("blink"))
        .to({}, { duration: 0.14 })
        .call(() => {
          setFace(heading);
          gaitOn = true;
        });

    const turn = (to: "right" | "left") =>
      gsap
        .timeline()
        .call(() => {
          park();
          heading = to;
          setFace(to);
        })
        .to({}, { duration: 0.5 })
        .call(() => {
          gaitOn = true;
        });

    // Functional end values, so a resize is picked up on the next lap instead of
    // walking him off the end of a rule that got narrower.
    const span = () => Math.max(0, lane.clientWidth - SIZE);

    const tl = gsap
      .timeline({ repeat: -1 })
      .add(turn("right"))
      .to(walker, { x: () => span() * 0.45, duration: 3.4, ease: "none" })
      .add(stumble())
      .to(walker, { x: () => span(), duration: 4.0, ease: "none" })
      .add(turn("left"))
      .to(walker, { x: () => span() * 0.5, duration: 4.0, ease: "none" })
      .add(stumble())
      .to(walker, { x: 0, duration: 3.4, ease: "none" });

    tl.timeScale(TIME_SCALE);

    // Don't animate off-screen. The quote sits at the bottom of a long page, so
    // without this he walks for the entire read.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? tl.play() : tl.pause()),
      { threshold: 0 },
    );
    io.observe(lane);

    return () => {
      io.disconnect();
      window.clearInterval(gait);
      tl.kill();
      gsap.killTweensOf(walker);
    };
  }, []);

  return (
    <div ref={laneRef} className="ted-walk-lane" aria-hidden>
      <span ref={walkerRef} className="ted-walk-walker">
        {/* Body layers carry the legs and NO face; face layers carry the eyes
            and NO body. Both are opacity-flipped independently, so a step
            (every 140ms) never disturbs the current expression. */}
        {(["stand", "stepA", "stepB"] as const).map((l) => (
          <span key={l} className="ted-walk-layer" data-w={l}>
            <TedBodySprite size={SIZE} legs={l} />
          </span>
        ))}
        {(["right", "left", "dizzy", "blink"] as const).map((f) => (
          <span key={f} className="ted-walk-layer" data-w={f}>
            <TedFaceSprite size={SIZE} name={f} />
          </span>
        ))}
      </span>
    </div>
  );
}
