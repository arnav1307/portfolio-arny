"use client";

import { useEffect, useRef } from "react";
import type { Body as MatterBody, Mouse as MatterMouse } from "matter-js";

/**
 * FooterGravity — physics stage behind the footer's name/nav-sub row.
 *
 * Extracted and adapted from Framer's own Gravity Component (source-map
 * pulled from the published bundle, ground-truth constants: wallThickness
 * 100, velocity/position iterations 8, mouse constraint stiffness 0.2,
 * gravity {x:0, y:0.5}, body defaults {friction:0.5, restitution:0.2,
 * density:0.001}). Tuned from there for this footer, not copied 1:1 — the
 * Framer usage is a near-full-height hero column, this is a short band.
 *
 * Built as a standalone mockup first (gravity-footer-v5.html) and iterated
 * there before being wired in here, per the "show me separately, don't
 * touch the real component yet" instruction — this file is the approved
 * result of that process, not a first draft.
 */

// Single knob for overall sticker size, independent of the responsive
// density scale below. Applied to every sticker's base w/h before density
// scale multiplies on top. Lower this if stickers crowd the name/nav-sub
// row or push it down; raise it if the stage reads too empty.
const SIZE_SCALE = 0.65;

const SVG_FILES: Record<string, { file: string; w: number; h: number }> = {
  flash: { file: "/assets/footers/flash.svg", w: 97, h: 163 },
  "curvy-line": { file: "/assets/footers/curvy-line.svg", w: 156, h: 29 },
  spin: { file: "/assets/footers/spin.svg", w: 125.25, h: 123.5 },
  "peace-v": { file: "/assets/footers/peace-v.svg", w: 82, h: 135 },
  spring: { file: "/assets/footers/spring.svg", w: 111, h: 137 },
  spiral: { file: "/assets/footers/spiral.svg", w: 80, h: 84 },
  // framer-uni deliberately excluded — "remove that white element, does
  // not go with this" (direct feedback on an earlier round).
};

const BLOUB_FILES = ["bloub", "bloub-e", "bloub-s", "bloub-u"];

type StickerDef = {
  name: string;
  w: number;
  h: number;
  html: string;
  isCircleish: boolean;
  isBloub?: boolean;
};

type BodyEntry = {
  el: HTMLDivElement;
  body: MatterBody;
  w: number;
  h: number;
  origin: { x: number; y: number };
  restY: number;
  spawned: boolean;
};

async function loadSVG(path: string): Promise<string> {
  const res = await fetch(path);
  const text = await res.text();
  const match = text.match(/<svg[^>]*\swidth="([\d.]+)"[^>]*\sheight="([\d.]+)"/);
  if (match && !text.includes("viewBox")) {
    const [, w, h] = match;
    return text.replace("<svg ", `<svg viewBox="0 0 ${w} ${h}" `);
  }
  return text;
}

function makeSticker(kind: string, w: number, h: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "gravity-object";
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.dataset.kind = kind;
  return el;
}

async function buildStickers(scale: number): Promise<StickerDef[]> {
  const ink = "var(--ink)";
  const stickers: StickerDef[] = [];

  for (const [name, cfg] of Object.entries(SVG_FILES)) {
    let svgText = await loadSVG(cfg.file);
    svgText = svgText
      .replace(/fill="#FFFFFF"/gi, `fill="${ink}"`)
      .replace(/stroke="#FFFFFF"/gi, `stroke="${ink}"`)
      .replace(/fill="rgb\(136,\s*255,\s*0\)"/gi, `fill="var(--bloub-blue)"`)
      .replace(/stroke="rgb\(204,\s*38,\s*255\)"/gi, `stroke="${ink}"`)
      .replace(/fill="rgb\(204,\s*38,\s*255\)"/gi, `fill="${ink}"`)
      .replace(/stroke="rgb\(136,\s*255,\s*0\)"/gi, `stroke="var(--bloub-blue)"`);
    stickers.push({ name, w: cfg.w, h: cfg.h, html: svgText, isCircleish: false });
  }

  // 4 bloub image frames — unmodified fill, blink timing randomized
  // per-instance after insertion (see wireUpBloubTiming below).
  for (const name of BLOUB_FILES) {
    const svgText = await loadSVG(`/assets/footers/${name}.svg`);
    stickers.push({ name, w: 100, h: 100, html: svgText, isCircleish: true, isBloub: true });
  }

  // Sunflower — hand-built inline, no source asset.
  stickers.push({
    name: "sunflower",
    w: 96,
    h: 96,
    html: `<svg viewBox="0 0 100 100" style="width:100%;height:100%;"><g fill="var(--bloub-blue)">
      ${Array.from({ length: 7 })
        .map((_, i) => {
          const angle = (i * 360) / 7;
          return `<ellipse cx="50" cy="22" rx="11" ry="20" transform="rotate(${angle} 50 50)"/>`;
        })
        .join("")}
    </g><circle cx="50" cy="50" r="13" fill="var(--bloub-blue)"/><circle cx="46" cy="48" r="1.6" fill="#fff"/><circle cx="54" cy="48" r="1.6" fill="#fff"/><path d="M45 53 Q50 57 55 53" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`,
    isCircleish: true,
  });

  // 3 shape badges — text lives INSIDE the shape, matching the reference:
  // filled pill / outlined blob / outlined rect.
  stickers.push({
    name: "bonk-pill",
    w: 130,
    h: 54,
    html: `<div class="gravity-badge gravity-badge-pill" style="width:100%;height:100%;font-size:22px;">Bonk!</div>`,
    isCircleish: false,
  });
  stickers.push({
    name: "bye-blob",
    w: 110,
    h: 110,
    html: `<div class="gravity-badge gravity-badge-blob" style="width:100%;height:100%;font-size:22px;">Bye!</div>`,
    // CSS renders this as an organic circle (border-radius blob) — must
    // be isCircleish:true or the physics body is a rotating square under
    // round CSS, which reads as the shape breaking apart on drag/resize.
    isCircleish: true,
  });
  stickers.push({
    name: "letschat-rect",
    w: 170,
    h: 58,
    html: `<div class="gravity-badge gravity-badge-rect" style="width:100%;height:100%;font-size:20px;">Let's chat</div>`,
    isCircleish: false,
  });

  // 2 extra stickers (Arnav: "increase the elements by 2 in all format")
  // — no new source assets exist (Higgsfield cancelled, moodboard is a
  // fixed set), so these are second instances of geometric shapes that
  // read fine repeated (no text, no face, unlike a badge or bloub).
  const spiralSrc = stickers.find((s) => s.name === "spiral");
  if (spiralSrc) stickers.push({ ...spiralSrc, name: "spiral-2" });
  const spinSrc = stickers.find((s) => s.name === "spin");
  if (spinSrc) stickers.push({ ...spinSrc, name: "spin-2" });

  // SIZE_SCALE shrinks every sticker's base size first; density scale
  // (responsive, per breakpoint) multiplies on top of that — stickers
  // at native size badly overcrowd a phone-width footer otherwise.
  const combined = SIZE_SCALE * scale;
  return stickers.map((st) => ({ ...st, w: st.w * combined, h: st.h * combined }));
}

function wireUpBloubTiming(container: HTMLDivElement) {
  const bloubEls = container.querySelectorAll<HTMLDivElement>('.gravity-object[data-kind^="bloub"]');
  bloubEls.forEach((el) => {
    const svg = el.querySelector("svg");
    if (!svg) return;
    // A negative delay makes the browser treat the animation as already
    // partway through its cycle, desyncing them without touching the
    // SVGs' own markup.
    const randomDelay = `${-(Math.random() * 3).toFixed(2)}s`;
    const eyes = svg.querySelectorAll<HTMLElement>('[class^="oeil"]');
    eyes.forEach((eye) => {
      eye.style.animationDelay = randomDelay;
    });
  });
}

export function FooterGravity() {
  const containerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    footerRef.current = container.closest("footer");

    let cancelled = false;
    let cleanupFrame: (() => void) | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    async function initGravity() {
      if (!container || cancelled) return;
      const stage = container;

      const Matter = await import("matter-js");
      const { Engine, Render, Runner, Bodies, Body, World, Mouse, MouseConstraint, Query, Events } = Matter;

      const referenceWidth = 820; // the desktop width these sizes were tuned at
      const rawWidth = stage.offsetWidth || window.innerWidth;
      // No upper clamp: stickers grow past baseline on screens wider than
      // referenceWidth too, capped so huge monitors don't go absurd.
      const densityScale = Math.max(0.5, Math.min(1.6, rawWidth / referenceWidth));

      let stickers = await buildStickers(densityScale);
      if (cancelled) return;

      // Fewer stickers on smaller screens, not just smaller stickers —
      // desktop shows all, tablet fewer, phone fewest, while keeping the
      // same collision/repel behaviour demoable at every size (always at
      // least 2 bloubs, the 3 text badges, and the sunflower).
      const priorityOrder = [
        "bonk-pill",
        "bye-blob",
        "letschat-rect",
        "sunflower",
        "bloub",
        "bloub-e",
        "peace-v",
        "spring",
        "spiral",
        "flash",
        "spin",
        "curvy-line",
        "bloub-s",
        "bloub-u",
        "spiral-2",
        "spin-2",
      ];
      // +2 per tier (Arnav: "increase the elements by 2 in all format").
      const stickerCount = rawWidth >= 820 ? 16 : rawWidth >= 480 ? 12 : 9;
      const orderedNames = priorityOrder.slice(0, stickerCount);
      stickers = orderedNames
        .map((name) => stickers.find((s) => s.name === name))
        .filter((s): s is StickerDef => Boolean(s));

      stage.innerHTML = "";
      const objects = stickers.map((s) => {
        const el = makeSticker(s.name, s.w, s.h);
        el.innerHTML = s.html;
        stage.appendChild(el);
        return { el, w: s.w, h: s.h, isCircleish: s.isCircleish, isBloub: !!s.isBloub };
      });

      wireUpBloubTiming(container);

      // document.fonts.ready and requestAnimationFrame both hang
      // indefinitely while a tab is backgrounded — race both against a
      // timeout so init always completes.
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      if (cancelled) return;
      await Promise.race([
        new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      if (cancelled || !containerRef.current) return;

      const width = stage.offsetWidth;
      const height = stage.offsetHeight;

      const engine = Engine.create();
      engine.gravity.x = 0;
      engine.gravity.y = 0.5;
      engine.velocityIterations = 8;
      engine.positionIterations = 8;

      const render = Render.create({
        element: container,
        engine,
        options: { width, height, wireframes: false, background: "transparent" },
      });

      const mouse = Mouse.create(render.canvas);
      // @types/matter-js doesn't expose `mousewheel` on Mouse even though
      // the real runtime object carries it (used internally to unbind the
      // wheel listener Matter attaches by default, which otherwise blocks
      // page scroll while the pointer is over the footer).
      const mouseWithWheel = mouse as MatterMouse & { mousewheel?: EventListener };
      if (mouseWithWheel.element && mouseWithWheel.mousewheel) {
        mouseWithWheel.element.removeEventListener("mousewheel", mouseWithWheel.mousewheel);
        mouseWithWheel.element.removeEventListener("DOMMouseScroll", mouseWithWheel.mousewheel);
        mouseWithWheel.element.removeEventListener("wheel", mouseWithWheel.mousewheel);
      }

      const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.2, render: { visible: false } },
      });

      let mouseDown = false;
      // @types/matter-js types the "enddrag" event payload as the base
      // IEvent, which has no `body` field even though Matter always sets
      // one for this event — cast at the call site rather than fighting
      // the overload.
      type EndDragEvent = { body?: MatterBody };
      Events.on(mouseConstraint, "enddrag", ((e: EndDragEvent) => {
        const body = e.body;
        if (body) {
          const maxSpeed = 18;
          const speed = Math.hypot(body.velocity.x, body.velocity.y);
          if (speed > maxSpeed) {
            const s = maxSpeed / speed;
            Body.setVelocity(body, { x: body.velocity.x * s, y: body.velocity.y * s });
          }
        }
      }) as (e: unknown) => void);

      const wallThickness = 100;
      const walls = [
        Bodies.rectangle(width / 2, height + wallThickness / 2, width + wallThickness * 2, wallThickness, {
          isStatic: true,
          friction: 1,
          render: { visible: false },
        }),
        Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height + wallThickness * 2, {
          isStatic: true,
          friction: 1,
          render: { visible: false },
        }),
        Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height + wallThickness * 2, {
          isStatic: true,
          friction: 1,
          render: { visible: false },
        }),
        Bodies.rectangle(width / 2, -wallThickness / 2, width + wallThickness * 2, wallThickness, {
          isStatic: true,
          friction: 1,
          render: { visible: false },
        }),
      ];

      const touchingMouse = () =>
        Query.point(engine.world.bodies, mouseConstraint.mouse.position || { x: 0, y: 0 }).length > 0;

      Events.on(engine, "beforeUpdate", () => {
        if (!mouseDown && !touchingMouse()) stage.style.cursor = "default";
        else if (touchingMouse()) stage.style.cursor = mouseDown ? "grabbing" : "grab";
      });
      const onMouseDown = () => {
        mouseDown = true;
        stage.style.cursor = touchingMouse() ? "grabbing" : "default";
      };
      const onMouseUp = () => {
        mouseDown = false;
        stage.style.cursor = touchingMouse() ? "grab" : "default";
      };
      stage.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mouseup", onMouseUp);

      World.add(engine.world, [mouseConstraint, ...walls]);
      render.mouse = mouse;

      const bodies: BodyEntry[] = [];
      const edgeMargin = 24;
      const dropOrder = objects.map((_, i) => i);
      for (let i = dropOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dropOrder[i], dropOrder[j]] = [dropOrder[j], dropOrder[i]];
      }

      objects.forEach(({ el, w, h, isCircleish, isBloub }, i) => {
        const usableWidth = width - edgeMargin * 2;
        const startX = edgeMargin + (usableWidth * (i + 0.5)) / objects.length + (Math.random() - 0.5) * 20;
        const startY = -120 - Math.random() * 280;
        const restY = height - h / 2 - 4;

        // Pulled toward the REAL extracted Framer defaults
        // (GravityComponent_Prod.tsx: friction 0.5, restitution 0.2,
        // density 0.001), not guessed values — an earlier round drifted
        // to density 50x heavier and restitution under half, which read
        // as dead/not animated instead of a smooth bounce-and-settle.
        const bodyOptions = {
          friction: 0.4,
          restitution: 0.35,
          density: 0.002,
          frictionAir: 0.015,
          angle: (Math.random() - 0.5) * 0.3,
          render: { fillStyle: "#00000000", strokeStyle: "#00000000", lineWidth: 0 },
        };

        const body = isCircleish
          ? Bodies.circle(startX, startY, Math.max(w, h) / 2, bodyOptions)
          : Bodies.rectangle(startX, startY, w, h, bodyOptions);

        (body as MatterBody & { isBloub?: boolean }).isBloub = isBloub;

        const entry: BodyEntry = {
          el,
          body,
          w,
          h,
          origin: { x: startX, y: (height - h) / 2 },
          restY,
          spawned: false,
        };
        bodies.push(entry);

        // ~130ms apart in shuffled order, plus jitter — widened from an
        // earlier 60ms step (~840ms total for 14) because the tighter
        // window read as everything landing at once rather than a
        // visible cascading fall.
        const dropDelay = dropOrder[i] * 130 + Math.random() * 90;
        setTimeout(() => {
          if (cancelled) return;
          World.add(engine.world, [body]);
          entry.spawned = true;
          el.style.opacity = "1";
        }, dropDelay);
      });

      // Bloub repel rule: two bloub bodies touching each other push
      // apart instead of resting side by side.
      Events.on(engine, "collisionStart", (event) => {
        event.pairs.forEach(({ bodyA, bodyB }) => {
          const a = bodyA as MatterBody & { isBloub?: boolean };
          const b = bodyB as MatterBody & { isBloub?: boolean };
          if (!a.isBloub || !b.isBloub) return;

          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = dx / dist;
          const ny = dy / dist;

          const repelStrength = 6;
          Body.setVelocity(a, {
            x: a.velocity.x - nx * repelStrength,
            y: a.velocity.y - ny * repelStrength * 0.5,
          });
          Body.setVelocity(b, {
            x: b.velocity.x + nx * repelStrength,
            y: b.velocity.y + ny * repelStrength * 0.5,
          });
        });
      });

      function enforceBloubSeparation() {
        const bloubBodies = bodies.filter((entry) => (entry.body as MatterBody & { isBloub?: boolean }).isBloub && entry.spawned);
        for (let i = 0; i < bloubBodies.length; i++) {
          for (let j = i + 1; j < bloubBodies.length; j++) {
            const a = bloubBodies[i].body;
            const b = bloubBodies[j].body;
            const ra = a.circleRadius || 0;
            const rb = b.circleRadius || 0;
            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const minDist = ra + rb;
            if (dist < minDist) {
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              const isADragged = mouseConstraint.body === a;
              const isBDragged = mouseConstraint.body === b;
              // Clamp to container bounds after the push. setPosition
              // bypasses normal wall collision, so near an edge/corner
              // the separation shove could otherwise place a body's
              // center outside the container — invisible under
              // overflow:hidden even though the body still exists.
              if (!isADragged) {
                const ax = Math.min(Math.max(a.position.x - nx * overlap * 0.5, ra), width - ra);
                const ay = Math.min(Math.max(a.position.y - ny * overlap * 0.5, ra), height - ra);
                Body.setPosition(a, { x: ax, y: ay });
                const relVel = a.velocity.x * -nx + a.velocity.y * -ny;
                if (relVel < 0) {
                  Body.setVelocity(a, { x: a.velocity.x + nx * relVel, y: a.velocity.y + ny * relVel });
                }
              }
              if (!isBDragged) {
                const bx = Math.min(Math.max(b.position.x + nx * overlap * 0.5, rb), width - rb);
                const by = Math.min(Math.max(b.position.y + ny * overlap * 0.5, rb), height - rb);
                Body.setPosition(b, { x: bx, y: by });
                const relVel = b.velocity.x * nx + b.velocity.y * ny;
                if (relVel < 0) {
                  Body.setVelocity(b, { x: b.velocity.x - nx * relVel, y: b.velocity.y - ny * relVel });
                }
              }
            }
          }
        }
      }

      let rafId = 0;

      function updateElements() {
        try {
          updateElementsInner();
        } catch (err) {
          console.error("[gravity] updateElements crashed:", err);
          return;
        }
        rafId = requestAnimationFrame(updateElements);
      }

      function updateElementsInner() {
        enforceBloubSeparation();

        const rect = stage.getBoundingClientRect();
        const margin = 200;
        bodies.forEach((entry) => {
          const { el, body, origin, restY, w, h, spawned } = entry;
          if (!spawned) {
            el.style.opacity = "0";
            return;
          }
          el.style.opacity = "1";

          const { x, y } = body.position;
          const rotation = body.angle * (180 / Math.PI);

          if (x < -margin || x > rect.width + margin || y < -margin || y > rect.height + margin) {
            Body.setPosition(body, { x: origin.x, y: origin.y });
            Body.setVelocity(body, { x: 0, y: 0 });
            Body.setAngularVelocity(body, 0);
            Body.setAngle(body, 0);
          } else {
            const isThisBodyDragged = mouseConstraint.body === body;
            const speed = Math.hypot(body.velocity.x, body.velocity.y);
            const nearFloor = y < restY - 2;
            if (!isThisBodyDragged && speed < 1.2 && nearFloor) {
              const halfW = (w / 2) * 0.7;
              const probeTop = y + h / 2 - 2;
              const probeBottom = y + h / 2 + 12;
              const region = {
                min: { x: x - halfW, y: probeTop },
                max: { x: x + halfW, y: probeBottom },
              };
              const hits = Query.region(engine.world.bodies, region);
              const hasRealSupport = hits.some((b) => b.id !== body.id);
              if (!hasRealSupport) {
                Body.setPosition(body, { x, y: Math.min(y + 2.5, restY) });
                Body.setVelocity(body, { x: body.velocity.x * 0.9, y: 0.6 });
              }
            }
          }

          el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${y - el.offsetHeight / 2}px) rotate(${rotation}deg)`;
        });
      }

      const runner = Runner.create();
      Runner.run(runner, engine);
      Render.run(render);
      updateElements();

      cleanupFrame = () => {
        cancelAnimationFrame(rafId);
        Runner.stop(runner);
        Render.stop(render);
        render.canvas.remove();
        World.clear(engine.world, false);
        Engine.clear(engine);
        stage.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mouseup", onMouseUp);
      };
    }

    initGravity();

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cleanupFrame?.();
        cleanupFrame = null;
        initGravity();
      }, 400);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      cleanupFrame?.();
    };
  }, []);

  return <div ref={containerRef} className="gravity-object-container" aria-hidden="true" />;
}
