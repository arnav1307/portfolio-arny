"use client";

/**
 * TedOrb — the per-answer speak control, replacing the gradient mesh ball.
 *
 * The audio path is UNCHANGED: same /api/speak, same ElevenLabs call, same
 * answer-ID lookup, same three AudioState values. Only the face is new.
 *
 * ── LOCKED SPEC, "Meter" (2026-08-15). Ported from crab-preview.html. ────────
 *   rest      completely still except the blink
 *   hover     face swaps to `happy` (idle only)
 *   thinking  `coding` face while Haiku writes — no overlay
 *   loading   blink + 3% breath only. ⛔ NO sparkles (Arnav 2026-08-19)
 *   playing   `halo` overlay + three CSS level bars. NO body motion, NO sparkles.
 *   finish    `happy` for 0.55s, then back to rest
 *   sleeping  eyes shut + rising Z's + slow breath. Hover does nothing —
 *             he stays asleep (Arnav 2026-08-19).
 *
 * 🚨 EXACTLY ONE face and ONE overlay visible at any instant. Hard cuts only —
 * halo and sparkles share the same pixels above his head, so a crossfade reads
 * as a gold-and-blue smear. Sparkles stay mounted for the sprite but are never
 * raised on the speak-click path.
 *
 * 🚨 EVERY gsap.delayedCall IS TRACKED AND KILLED.
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { PixelCrab, TedOverlaySprite, type TedFace } from "@/components/ui/pixel-crab";

export type TedOrbState = "idle" | "thinking" | "loading" | "playing" | "sleeping";

type TedOrbProps = {
  state: TedOrbState;
  size?: number;
};

const FACES = ["base", "blink", "happy", "sleeping", "coding"] as const satisfies readonly TedFace[];
const OVERLAYS = ["halo", "sparkles"] as const;

const BLINK_MIN = 3.6;
const BLINK_MAX = 6;
const BLINK_HOLD = 0.09;
const FINISH_HOLD = 0.55;

export function TedOrb({ state, size = 40 }: TedOrbProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const prev = useRef<TedOrbState>(state);
  const hoveredRef = useRef(false);
  /** True during the post-playback happy beat — hover effect must not clobber it. */
  const finishingRef = useRef(false);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  // ── Audio / cap state. Never keyed on hovered. ───────────────────────────
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const face = (n: string) => root.querySelector<HTMLElement>(`[data-face="${n}"]`);
    const ov = (n: string) => root.querySelector<HTMLElement>(`[data-ov="${n}"]`);
    const faces = FACES.map((n) => face(n)).filter(Boolean) as HTMLElement[];
    const overlays = OVERLAYS.map((n) => ov(n)).filter(Boolean) as HTMLElement[];
    const bars = root.querySelector<HTMLElement>("[data-bars]");
    const zzz = root.querySelector<HTMLElement>("[data-zzz]");
    if (faces.length !== FACES.length || !bars) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: gsap.core.Tween[] = [];
    const live: gsap.core.Animation[] = [];

    const showFace = (n: string) => {
      gsap.killTweensOf(faces);
      gsap.set(faces, { autoAlpha: 0 });
      const el = face(n);
      if (el) gsap.set(el, { autoAlpha: 1 });
    };

    const showOverlay = (n: string | null) => {
      gsap.killTweensOf(overlays);
      gsap.set(overlays, { autoAlpha: 0 });
      if (n) {
        const el = ov(n);
        if (el) gsap.set(el, { autoAlpha: 1 });
      }
    };

    const setZzz = (on: boolean) => {
      if (!zzz) return;
      gsap.killTweensOf(zzz);
      gsap.set(zzz, { autoAlpha: on ? 1 : 0 });
    };

    const blinkLoop = () => {
      let gap = gsap.utils.random(BLINK_MIN, BLINK_MAX);
      return gsap
        .timeline({
          repeat: -1,
          onRepeat: () => {
            gap = gsap.utils.random(BLINK_MIN, BLINK_MAX);
          },
        })
        .to(face("blink"), { autoAlpha: 1, duration: 0, delay: () => gap })
        .to(face("base"), { autoAlpha: 0, duration: 0 }, "<")
        .to(face("blink"), { autoAlpha: 0, duration: 0, delay: BLINK_HOLD })
        .to(face("base"), { autoAlpha: 1, duration: 0 }, "<");
    };

    gsap.killTweensOf([...faces, ...overlays, root, bars]);
    if (zzz) gsap.killTweensOf(zzz);
    gsap.set(root, { scale: 1, scaleX: 1, scaleY: 1, y: 0 });
    gsap.set(bars, { autoAlpha: 0 });
    showOverlay(null);
    setZzz(false);
    finishingRef.current = false;

    const wasPlaying = prev.current === "playing";
    prev.current = state;

    if (state === "thinking") {
      // Coding face while the answer is still baking. No overlay, no hover swap.
      showFace("coding");
      if (!reduced) {
        live.push(
          gsap.to(root, {
            scale: 1.02,
            duration: 0.7,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          }),
        );
      }
    } else if (state === "loading") {
      // Fetching TTS. Blink + breath only — sparkles were reading as a second
      // "speaking" cue and fighting the halo that follows.
      showFace("base");
      if (!reduced) {
        live.push(blinkLoop());
        live.push(
          gsap.to(root, {
            scale: 1.03,
            duration: 0.6,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          }),
        );
      }
    } else if (state === "playing") {
      // Halo + meter only. No sparkles.
      showFace("base");
      showOverlay("halo");
      gsap.set(bars, { autoAlpha: 1 });
      if (!reduced) live.push(blinkLoop());
    } else if (state === "sleeping") {
      // Always asleep — no hover face swap (Arnav 2026-08-19).
      showFace("sleeping");
      setZzz(true);
      if (!reduced) {
        live.push(
          gsap.to(root, {
            scaleY: 0.94,
            y: 1.5,
            duration: 2.2,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          }),
        );
      }
    } else if (wasPlaying && !reduced) {
      finishingRef.current = true;
      showFace("happy");
      const t = gsap.delayedCall(FINISH_HOLD, () => {
        finishingRef.current = false;
        if (hoveredRef.current) return;
        showFace("base");
        live.push(blinkLoop());
      });
      timers.push(t);
    } else {
      // Idle seed. Blink / hover ownership is shared with the hover effect —
      // if already hovered, happy; otherwise base + blink.
      if (hoveredRef.current) {
        showFace("happy");
      } else {
        showFace("base");
        if (!reduced) live.push(blinkLoop());
      }
    }

    return () => {
      timers.forEach((t) => t.kill());
      live.forEach((t) => t.kill());
      gsap.killTweensOf([...faces, ...overlays, root, bars]);
      if (zzz) gsap.killTweensOf(zzz);
      finishingRef.current = false;
    };
  }, [state]);

  // ── Pointer — idle only. Sleeping stays asleep; busy states own the face. ─
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (
      state === "loading" ||
      state === "playing" ||
      state === "thinking" ||
      state === "sleeping"
    ) {
      return;
    }

    const face = (n: string) => root.querySelector<HTMLElement>(`[data-face="${n}"]`);
    const faces = FACES.map((n) => face(n)).filter(Boolean) as HTMLElement[];
    if (faces.length !== FACES.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const live: gsap.core.Animation[] = [];

    const showFace = (n: string) => {
      gsap.killTweensOf(faces);
      gsap.set(faces, { autoAlpha: 0 });
      const el = face(n);
      if (el) gsap.set(el, { autoAlpha: 1 });
    };

    // Idle. Don't clobber the post-playback finish beat.
    if (finishingRef.current) {
      if (hovered) showFace("happy");
      return;
    }

    if (hovered) {
      showFace("happy");
    } else {
      showFace("base");
      if (!reduced) {
        let gap = gsap.utils.random(BLINK_MIN, BLINK_MAX);
        live.push(
          gsap
            .timeline({
              repeat: -1,
              onRepeat: () => {
                gap = gsap.utils.random(BLINK_MIN, BLINK_MAX);
              },
            })
            .to(face("blink"), { autoAlpha: 1, duration: 0, delay: () => gap })
            .to(face("base"), { autoAlpha: 0, duration: 0 }, "<")
            .to(face("blink"), { autoAlpha: 0, duration: 0, delay: BLINK_HOLD })
            .to(face("base"), { autoAlpha: 1, duration: 0 }, "<"),
        );
      }
    }

    return () => live.forEach((t) => t.kill());
  }, [hovered, state]);

  return (
    <span
      ref={rootRef}
      className="ted-orb"
      data-state={state}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="ted-bars" data-bars aria-hidden>
        <i />
        <i />
        <i />
      </span>

      {FACES.map((f) => (
        <span key={f} className="ted-orb-layer" data-face={f} aria-hidden>
          <PixelCrab size={size} still={f} />
        </span>
      ))}

      {OVERLAYS.map((o) => (
        <span key={o} className="ted-orb-layer" data-ov={o} aria-hidden>
          <TedOverlaySprite name={o} size={size} />
        </span>
      ))}

      <span className="ted-zzz" data-zzz aria-hidden>
        <i>z</i>
        <i>z</i>
        <i>z</i>
      </span>
    </span>
  );
}
