"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/motion/theme-provider";

/**
 * Eye-follow theme toggle (Framer "Eye-Follow-Button" reimplemented in code).
 * Two pixel-ish eyes whose pupils track the cursor; clicking flips the theme
 * (light ⇄ dark, both pages). Label "Hit Me" per v3 spec; a separate "CLICK"
 * mono label sits beside it in the nav.
 *
 * Pupils are moved imperatively via refs on pointermove (no re-render per move).
 *
 * Colours are ink/paper ONLY — no blue ring/fill (Arnav 2026-08-10).
 */
export function EyeToggle() {
  const { toggle } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const wrapRef = useRef<HTMLButtonElement>(null);
  const leftPupil = useRef<SVGCircleElement>(null);
  const rightPupil = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        movePupils(e.clientX, e.clientY);
      });
    };
    const movePupils = (mx: number, my: number) => {
      for (const p of [leftPupil.current, rightPupil.current]) {
        if (!p) continue;
        const socket = p.parentElement as SVGGElement | null;
        const r = (socket ?? p).getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const angle = Math.atan2(my - cy, mx - cx);
        const max = 1.6; // px of travel inside the (slimmed) socket
        p.style.transform = `translate(${Math.cos(angle) * max}px, ${Math.sin(angle) * max}px)`;
      }
    };

    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <button
      ref={wrapRef}
      onClick={toggle}
      data-cursor="pointer"
      aria-label="Toggle dark mode"
      // Slimmed 2026-07-26: the pill sat close enough to the DotField edge to
      // read as overlapping it. Smaller sockets + tighter padding shrink the
      // whole control without changing the eye-follow mechanic.
      //
      // bg-paper + ink border only — kills the blue focus/halo look. Hover
      // flips to ink fill / paper strokes (same language as stack chips).
      className="group flex items-center gap-1.7 rounded-full border border-ink bg-paper px-2.5 py-1 text-ink outline-none ring-0 transition-colors hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
    >
      <svg width="26" height="13" viewBox="0 0 26 13" aria-hidden>
        {/* two eye sockets */}
        {[6.5, 19].map((cx, i) => (
          <g key={cx}>
            <circle
              cx={cx}
              cy={6.5}
              r={5.4}
              className="fill-paper stroke-ink group-hover:fill-ink group-hover:stroke-paper"
              strokeWidth={1.2}
            />
            <circle
              ref={i === 0 ? leftPupil : rightPupil}
              cx={cx}
              cy={6.5}
              r={enabled ? 1.9 : 1.9}
              className="fill-ink group-hover:fill-paper"
              style={{ transition: "transform 60ms linear" }}
            />
          </g>
        ))}
      </svg>
    </button>
  );
}
