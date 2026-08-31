"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { lenisRef } from "./smooth-provider";
import { USE_DIRECTIONAL_WIPE } from "@/lib/transition-flags";

/**
 * PageTransition — a curtain wipe between / and /about.
 *
 * Mounted as a SIBLING of SmoothProvider (see providers.tsx), never inside it:
 * #smooth-wrapper is `position: fixed; overflow: hidden` and ScrollSmoother
 * transforms #smooth-content, so a fixed overlay placed inside would be dragged
 * by that transform — the same trap that killed `position: sticky` on the about
 * rail.
 *
 * Built with GSAP, not framer-motion: declarative animation is broken in this
 * stack (see memory motion-unreliable-use-css), and the View Transitions API
 * needs React canary for `unstable_ViewTransition` (we're on 19.2.4 stable).
 *
 * Sequence: cover → navigate → wait for the new route's smoother → reveal. The
 * cover must complete BEFORE router.push, otherwise the new page flashes in
 * before the curtain hides it.
 *
 * Directional wipe (USE_DIRECTIONAL_WIPE): Home→About covers from the right,
 * About→Home from the left. Flip the flag false → classic vertical scaleY wipe.
 */

const COVER_MS = 0.42;
const REVEAL_MS = 0.62;

type WipeDir = "forward" | "back";

type TransitionApi = { navigate: (href: string) => void };
const TransitionContext = createContext<TransitionApi | null>(null);

/**
 * Links call this instead of pushing directly, so the curtain closes first.
 * Falls back to a plain push when the provider isn't mounted (e.g. /lab).
 */
export function usePageTransition(): TransitionApi {
  const ctx = useContext(TransitionContext);
  const router = useRouter();
  return ctx ?? { navigate: (href: string) => router.push(href) };
}

function directionFor(href: string): WipeDir {
  return href.includes("/how-i-work") ? "forward" : "back";
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  // Only reveal on pathnames we actually covered for — a first load or a
  // browser back/forward should not leave a curtain hanging.
  const pendingRef = useRef(false);
  const wipeDirRef = useRef<WipeDir>("forward");
  // Distinguishes true first paint (nothing to reveal) from a later
  // uncovered transition, i.e. browser back/forward (reveal it anyway).
  const hasMountedRef = useRef(false);

  const navigate = useCallback(
    (href: string) => {
      const panel = panelRef.current;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (!panel || reduced) {
        router.push(href);
        return;
      }

      pendingRef.current = true;
      const dir = directionFor(href);
      wipeDirRef.current = dir;

      if (USE_DIRECTIONAL_WIPE) {
        // Horizontal: forward covers from the right, back from the left.
        const coverOrigin = dir === "forward" ? "right center" : "left center";
        gsap.set(panel, {
          transformOrigin: coverOrigin,
          scaleX: 0,
          scaleY: 1,
        });
        gsap.to(panel, {
          scaleX: 1,
          duration: COVER_MS,
          ease: "power3.inOut",
          onComplete: () => {
            if (!href.includes("#")) {
              lenisRef.current?.scrollTo(0, { immediate: true });
              window.scrollTo(0, 0);
            }
            router.push(href);
          },
        });
        return;
      }

      // Classic vertical wipe.
      gsap.set(panel, { transformOrigin: "bottom center", scaleX: 1, scaleY: 0 });
      gsap.to(panel, {
        scaleY: 1,
        duration: COVER_MS,
        ease: "power3.inOut",
        onComplete: () => {
          // Reset scroll while the curtain is opaque, or the browser restores
          // the previous route's position and the new page lands mid-document.
          // A hash target is left alone — smooth-provider handles those.
          //
          // Both scrollers are reset: Lenis keeps its OWN animated position, so
          // a bare window.scrollTo would leave it out of sync and the next
          // wheel event would jump back to where Lenis still thought it was.
          if (!href.includes("#")) {
            lenisRef.current?.scrollTo(0, { immediate: true });
            window.scrollTo(0, 0);
          }
          router.push(href);
        },
      });
    },
    [router],
  );

  // Reveal once the new route has committed.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const isFirstPaint = !hasMountedRef.current;
    hasMountedRef.current = true;

    if (!pendingRef.current) {
      // Not a transition WE started via navigate() — either the very first
      // paint (nothing to reveal, no curtain was ever drawn) or a browser
      // back/forward (the URL already changed before we got a chance to
      // cover it). First paint: just make sure the panel is open, same as
      // before. Back/forward used to hit this exact same "silently snap
      // open" path — Arnav: "if I use the back or forward button... those
      // animations don't reflect, looks weird" — because a bare gsap.set
      // has no duration, so the page just jump-cut instead of transitioning.
      // Fixed by still playing the reveal wipe here, just without a cover
      // half (there's nothing to cover — the new route already painted).
      if (isFirstPaint) {
        if (USE_DIRECTIONAL_WIPE) {
          gsap.set(panel, { scaleX: 0, scaleY: 1 });
        } else {
          gsap.set(panel, { scaleY: 0, scaleX: 1 });
        }
        return;
      }

      // Cover instantly (no animation — the old page is already gone), then
      // run the normal reveal below. Direction doesn't matter without a
      // cover to be opposite of, so this always uses the vertical wipe's
      // reveal shape regardless of USE_DIRECTIONAL_WIPE, matching what a
      // forward navigation's reveal half looks like.
      gsap.set(panel, { transformOrigin: "top center", scaleX: 1, scaleY: 1 });
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          gsap.to(panel, {
            scaleY: 0,
            duration: REVEAL_MS,
            ease: "power3.inOut",
          });
        });
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    pendingRef.current = false;
    const dir = wipeDirRef.current;

    // Two frames: let the new route paint and its smoother rebuild before the
    // curtain lifts, so the user never sees layout settling or a pin snapping
    // into place.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (USE_DIRECTIONAL_WIPE) {
          // Exit opposite the cover so the wipe keeps traveling one direction.
          const revealOrigin =
            dir === "forward" ? "left center" : "right center";
          gsap.set(panel, { transformOrigin: revealOrigin });
          gsap.to(panel, {
            scaleX: 0,
            duration: REVEAL_MS,
            ease: "power3.inOut",
          });
          return;
        }

        gsap.set(panel, { transformOrigin: "top center" });
        gsap.to(panel, {
          scaleY: 0,
          duration: REVEAL_MS,
          ease: "power3.inOut",
        });
      });
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [pathname]);

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div ref={panelRef} aria-hidden className="page-curtain" />
    </TransitionContext.Provider>
  );
}
