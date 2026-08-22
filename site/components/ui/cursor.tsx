"use client";

import { useEffect, useRef, useState } from "react";

// One-shot, SSR-safe: does this device have a fine (mouse) pointer?
function hasFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

/**
 * den.cool-style cursor. The arrow + pointing-hand pixel cursors are pure
 * native CSS (cursor: url(...) in globals.css) — no JS follow, pixel-perfect.
 *
 * This component renders ONLY the black pill tooltip that trails the mouse
 * while it's over a `data-cursor="copy"` element (label from
 * data-cursor-label), e.g. "COPY EMAIL TO CLIPBOARD". Everything else about
 * the cursor is CSS.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasFinePointer()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);

    let raf = 0;
    let px = -200;
    let py = -200;

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (pillRef.current) {
            // Pill sits to the lower-left of the hand's fingertip, like den.cool.
            pillRef.current.style.transform = `translate(${px + 18}px, ${py + 8}px)`;
          }
        });
      }
      const target = (e.target as HTMLElement)?.closest<HTMLElement>(
        '[data-cursor="copy"]',
      );
      setLabel(target ? (target.dataset.cursorLabel ?? "") : null);
    };

    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={pillRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      style={{ willChange: "transform" }}
    >
      {label && (
        <span
          className="type-label whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-paper"
          style={{ fontSize: 10, letterSpacing: "0.08em" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
