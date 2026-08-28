"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { Parallax } from "@/components/motion/reveal";

/**
 * "Right now" — two dots on a globe (spec: inspiration/globe-weather-mechanism.md).
 *
 * Dot 1: Arnav, fixed at Amsterdam.
 * Dot 2: the visitor, resolved from IP — city-level, never the browser
 *        Geolocation API, so there is no permission prompt and the position is
 *        approximate by design (Arnav: "don't get the exact geolocation, get
 *        the nearest one").
 *
 * Both APIs are keyless:
 *   ipapi.co/json/          → approximate lat/lon + city
 *   api.open-meteo.com      → current temperature at a lat/lon
 *
 * A 7-city carousel cycles behind the two dots, each city pulsing in turn with
 * its own gradient, so the globe always has something moving on it.
 *
 * Drag to spin — pointer delta feeds `phi`, and the idle rotation resumes on
 * release (cobe's documented `pointerInteracting` pattern).
 */

type Place = { city: string; lat: number; lon: number };

const HOME: Place = { city: "Amsterdam", lat: 52.37, lon: 4.9 };

/** Cycling regions — Arnav's list, 2026-07-31. */
const REGIONS: readonly Place[] = [
  { city: "Gurgaon", lat: 28.46, lon: 77.03 },
  { city: "Bangalore", lat: 12.97, lon: 77.59 },
  { city: "New York", lat: 40.71, lon: -74.01 },
  { city: "Amsterdam", lat: 52.37, lon: 4.9 },
  { city: "Dubai", lat: 25.2, lon: 55.27 },
  { city: "Istanbul", lat: 41.01, lon: 28.98 },
  { city: "Prague", lat: 50.08, lon: 14.44 },
];

const CYCLE_MS = 2600;
/**
 * Auto-rotate, per the CORRECTED mechanism doc (2026-07-31). The 0.01/frame
 * value documented earlier was cobe's generic public example, not the reference
 * site's real value — 0.0032 is ~3x slower and reads as a drift, not a spin.
 */
const IDLE_SPEED = 0.0032;
/** Marker pulse — its own ~550ms sine clock, independent of the other two. */
const PULSE_MS = 550;

/** Per-city marker colours, so each cycles in with its own hue. */
const CITY_COLORS: Record<string, [number, number, number]> = {
  Gurgaon: [0.85, 0.45, 0.12],
  Bangalore: [0.96, 0.62, 0.04],
  "New York": [0.22, 0.55, 0.85],
  Amsterdam: [0.85, 0.28, 0.22],
  Dubai: [0.55, 0.4, 0.85],
  Istanbul: [0.2, 0.7, 0.55],
  Prague: [0.9, 0.35, 0.55],
};
/** cos/sin of the globe's fixed axial tilt (~14.3°), from the reference. */
const TILT_COS = 0.9689124217106447;
const TILT_SIN = 0.24740395925452294;

/** Title Case, so "amsterdam" from the API renders as "Amsterdam". */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchJSON(url: string, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function currentTemp(lat: number, lon: number): Promise<number | null> {
  const data = await fetchJSON(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`,
  );
  const t = data?.current?.temperature_2m;
  return typeof t === "number" ? Math.round(t) : null;
}

export function RightNow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** The single floating city pill that tracks the carousel (ss10). */
  const cityRef = useRef<HTMLDivElement>(null);

  const [visitor, setVisitor] = useState<Place | null>(null);
  const [visitorTemp, setVisitorTemp] = useState<number | null>(null);
  const [homeTemp, setHomeTemp] = useState<number | null>(null);
  const [regionIndex, setRegionIndex] = useState(0);
  /**
   * Mirror of regionIndex for the rAF loop.
   *
   * ⚠️ The render loop must NOT depend on regionIndex as an effect dep: that
   * tore down and re-created the whole WebGL globe every 2.6s, which is the
   * stutter/glitch Arnav caught on video. The loop reads this ref instead, so
   * the globe is created ONCE and the carousel just updates its markers.
   */
  const regionRef = useRef(0);
  /**
   * Mirror of visitor for the rAF loop, same reasoning as regionRef above.
   *
   * ⚠️ The globe-setup effect must NOT depend on `visitor`: it resolves once,
   * asynchronously, a few hundred ms after mount (once the IP geolocation
   * fetch returns), which tore down and recreated the whole WebGL canvas
   * right after first paint — a visible glitch identical in cause to the one
   * regionRef was already introduced to fix. The render loop reads this ref
   * instead, so the globe is created ONCE regardless of when visitor resolves.
   */
  const visitorRef = useRef<Place | null>(null);
  // No theme state here: the render loop reads data-theme directly each frame
  // and re-colours the sphere through globe.update(). Rebuilding the globe on a
  // theme change crashed React (see the note on the <canvas> element).

  // Visitor location + both temperatures.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const home = await currentTemp(HOME.lat, HOME.lon);
      if (!cancelled && home !== null) setHomeTemp(home);

      const geo = await fetchJSON("https://ipapi.co/json/");
      if (cancelled || typeof geo?.latitude !== "number") return;
      const place: Place = {
        city: geo.city ? titleCase(geo.city) : "somewhere",
        lat: geo.latitude,
        lon: geo.longitude,
      };
      visitorRef.current = place;
      setVisitor(place);

      const t = await currentTemp(place.lat, place.lon);
      if (!cancelled && t !== null) setVisitorTemp(t);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Region carousel — pauses under reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setRegionIndex((i) => {
        const next = (i + 1) % REGIONS.length;
        // Kept in sync here rather than during render — the rAF loop reads the
        // ref so it never needs regionIndex as an effect dependency.
        regionRef.current = next;
        return next;
      });
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let phi = 0;
    let width = 0;
    let interacting: number | null = null;
    let dragDelta = 0;

    const onResize = () => {
      width = canvas.offsetWidth;
    };
    onResize();
    window.addEventListener("resize", onResize);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /**
     * cobe paints into WebGL and cannot read CSS tokens, so the sphere's own
     * colours are handed to it explicitly — otherwise it stays a bright light
     * globe on the near-black dark page (Arnav 2026-07-31).
     *
     * These are pushed EVERY FRAME via globe.update() rather than only at
     * creation, so the eye-toggle re-themes the sphere without the canvas ever
     * being remounted (see the note on the <canvas> element).
     */
    const themeFor = (dark: boolean) =>
      dark
        ? {
            dark: 1,
            baseColor: [0.28, 0.27, 0.26] as [number, number, number],
            glowColor: [0.12, 0.11, 0.1] as [number, number, number],
            mapBrightness: 8,
          }
        : {
            dark: 0,
            baseColor: [0.88, 0.87, 0.85] as [number, number, number],
            glowColor: [0.97, 0.96, 0.94] as [number, number, number],
            mapBrightness: 5.5,
          };

    const isDark = document.documentElement.dataset.theme === "dark";
    const theme = themeFor(isDark);

    // Initial markers only — the render loop replaces these every frame.
    const markers: { location: [number, number]; size: number }[] = [
      { location: [HOME.lat, HOME.lon], size: 0.075 },
    ];

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.28,
      dark: theme.dark,
      diffuse: 1.1,
      scale: 1,
      mapSamples: 16000,
      mapBrightness: theme.mapBrightness,
      // Dotted sphere with AMBER markers, matching ss10 — the blue was never in
      // the reference. Base/glow follow the site theme (see above).
      baseColor: theme.baseColor,
      markerColor: [0.85, 0.45, 0.12],
      glowColor: theme.glowColor,
      offset: [0, 0],
      markers,
    });

    /** Projects a lat/lon onto the canvas for the DOM label overlay. */
    const project = (lat: number, lon: number, rotation: number) => {
      const latRad = (lat * Math.PI) / 180;
      const lonRad = (lon * Math.PI) / 180 - Math.PI;
      const cosLat = Math.cos(latRad);
      const x = -cosLat * Math.cos(lonRad) * 0.85;
      const y = Math.sin(latRad) * 0.85;
      const z = cosLat * Math.sin(lonRad) * 0.85;
      const cosPhi = Math.cos(rotation);
      const sinPhi = Math.sin(rotation);
      return {
        front:
          -(TILT_COS * sinPhi) * x + TILT_SIN * y + TILT_COS * cosPhi * z >= 0,
        fx: (cosPhi * x + sinPhi * z + 1) / 2,
        fy:
          (-(TILT_SIN * sinPhi * x + TILT_COS * y - TILT_SIN * cosPhi * z) + 1) /
          2,
      };
    };

    const place = (
      el: HTMLDivElement | null,
      loc: Place | null,
      rotation: number,
    ) => {
      if (!el || !loc) return;
      const { fx, fy, front } = project(loc.lat, loc.lon, rotation);
      el.style.transform = `translate(${fx * width}px, ${fy * width}px) translate(-50%, -100%)`;
      el.style.opacity = front ? "1" : "0";
    };

    let frame = 0;
    const started = performance.now();

    const tick = () => {
      // Rotation pauses under reduced motion AND mid-drag (per the corrected
      // mechanism doc) — three independent clocks: rotation, the 550ms marker
      // pulse below, and the 2.6s carousel in its own effect.
      if (!reduced && interacting === null) phi += IDLE_SPEED;
      const rotation = phi + dragDelta;

      // Marker pulse on its own sine clock, 0.045 ↔ 0.075.
      const pulse =
        0.06 + Math.sin(((performance.now() - started) / PULSE_MS) * Math.PI) * 0.015;

      const active = REGIONS[regionRef.current];
      // Re-read the theme each frame so the eye-toggle re-colours the sphere
      // in place, with no remount.
      const frameTheme = themeFor(
        document.documentElement.dataset.theme === "dark",
      );
      globe.update({
        phi: rotation,
        width: width * 2,
        height: width * 2,
        dark: frameTheme.dark,
        baseColor: frameTheme.baseColor,
        glowColor: frameTheme.glowColor,
        mapBrightness: frameTheme.mapBrightness,
        // Markers are updated LIVE rather than by re-creating the globe, which
        // is what caused the visible glitch.
        markers: [
          { location: [HOME.lat, HOME.lon], size: 0.075 },
          ...(visitorRef.current
            ? [
                {
                  location: [visitorRef.current.lat, visitorRef.current.lon] as [
                    number,
                    number,
                  ],
                  size: 0.075,
                },
              ]
            : []),
          // The currently-cycling city pulses and takes its own colour.
          { location: [active.lat, active.lon], size: pulse },
        ],
        markerColor: CITY_COLORS[active.city] ?? [0.85, 0.45, 0.12],
      });

      // Only the cycling city carries a label (ss10) — the home/visitor dots
      // are markers on the sphere, not permanently labelled pins.
      place(cityRef.current, active, rotation);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const down = (e: PointerEvent) => {
      interacting = e.clientX - dragDelta * 200;
      canvas.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (interacting === null) return;
      dragDelta = (e.clientX - interacting) / 200;
    };
    const up = () => {
      if (interacting === null) return;
      phi += dragDelta;
      dragDelta = 0;
      interacting = null;
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    return () => {
      cancelAnimationFrame(frame);
      globe.destroy();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // regionIndex, visitor, and the theme are DELIBERATELY not deps — all three
    // are read from refs/the DOM inside the render loop, so the globe is
    // created ONCE regardless of when the async geolocation fetch resolves.
  }, []);

  return (
    <section id="right-now" className="rightnow-section">
      <div className="rightnow-inner">
        <div className="rightnow-copy">
          <p className="type-label section-eyebrow text-muted">RIGHT NOW</p>
          <h2 className="rightnow-title">two dots on a globe</h2>

          <p className="rightnow-blurb">
            you are reading this from somewhere near{" "}
            <span className="rightnow-strong">
              {visitor?.city ?? "…"}
            </span>
            {visitorTemp !== null && (
              <>
                , where it is{" "}
                <span className="rightnow-strong">{visitorTemp}°C</span> right
                now
              </>
            )}
            .
          </p>

          <p className="rightnow-blurb">
            I am in <span className="rightnow-strong">{HOME.city}</span>
            {homeTemp !== null && (
              <>
                , where it is{" "}
                <span className="rightnow-strong">{homeTemp}°C</span>
              </>
            )}
            . small world.
          </p>

          {/* The city name lives on the globe's own pill (ss10), so the
              duplicate text line that used to sit here was removed. */}
          <p className="rightnow-hint type-label">give it a spin →</p>
        </div>

        {/* Gentle lag against the copy — the site's first use of differential
            scroll (CLAUDE.md open item #4). */}
        <Parallax className="rightnow-globe" speed={0.92}>
          {/* ⚠️ Do NOT key this on the theme. cobe detaches and replaces the
              canvas internally, so forcing React to remount it makes React try
              to removeChild a node that is no longer its child — a
              NotFoundError that crashes the whole tree and blanks the page.
              Re-theming is done through globe.update() in the render loop. */}
          <canvas ref={canvasRef} className="rightnow-canvas" />

          {/* One floating pill, tracking whichever city is currently up
              (ss10) — a coloured dot, the name, and a small chevron. */}
          <div ref={cityRef} className="rightnow-city">
            <span
              className="rightnow-city-dot"
              aria-hidden="true"
              /* Matches the marker colour the globe is currently drawing. */
              style={{
                background: `rgb(${(CITY_COLORS[REGIONS[regionIndex].city] ?? [0.85, 0.45, 0.12])
                  .map((c) => Math.round(c * 255))
                  .join(",")})`,
              }}
            />
            <span
              key={REGIONS[regionIndex].city}
              className="rightnow-city-name"
            >
              {REGIONS[regionIndex].city}
            </span>
            <span className="rightnow-city-chevron" aria-hidden="true">
              ›
            </span>
          </div>
        </Parallax>
      </div>
    </section>
  );
}
