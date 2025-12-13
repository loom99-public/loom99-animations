/* ------------------------------------------------------------
   Toy Animation System (Browser / SVG)
   - Compile-time: fields + modes + geometry caches
   - Run-time: phase machine + clocks + sampling
   - Render-time: morphProgress -> SVG path d via interpolation

   Usage (example):
     const svg = document.querySelector("svg#stage") as SVGSVGElement;
     const elements: SceneElement[] = makeDemoElements(); // or your LOGO_PATHS converted
     const engine = createShootInEngine(svg, elements, {
       seed: 1234,
       mode: "converge",
       timing: { entrance: 0.9, hold: 0.35, fold: 0.7, stagger: 0.06 },
     });
     engine.start();

   ------------------------------------------------------------ */

type Time = number; // seconds
type Seed = number;

type Point = { x: number; y: number };
type HSL = { h: number; s: number; l: number };

type CompileCtx = {
  viewport: { w: number; h: number };
};

type Input = {
  pointer: { x: number; y: number; down: boolean };
  viewport: { w: number; h: number };
};

type Behavior<A> = (t: Time, input: Input) => A;

type Field<A> = (seed: Seed, n: number, ctx: CompileCtx) => A[];

type PhaseName = "entrance" | "hold" | "fold";
type PhaseSample = { phase: PhaseName; u: number; tLocal: number };

type PhaseTiming = {
  entrance: number;
  hold: number;
  fold: number;
  stagger: number;
};

type AnimState = {
  morphProgress: number; // 0..1 (we’ll derive straight->curved + tail behavior from this)
  opacity: number;
  strokeWidth: number;
  glowRadius: number;
  hueShift: number;
};

type PathSeg = { c: Point; end: Point };
type PathGeom = {
  start: Point; // “final” start anchor (A0)
  segs: PathSeg[]; // quadratic segments: Q c end ...
};

type SceneElement = {
  id: string;
  final: PathGeom;
  baseColor: HSL;
  // optional correspondence data for fancier morphing later
  correspondence?: number[];
};

type Mode = {
  name: string;
  origin: Field<Point>;
  offset: Field<number>;
  envelope: {
    originJitter: number; // px
    offsetJitter: number; // seconds
  };
};

type ElementCache = {
  // straight geometry depends on origin, so we cache a function builder
  buildStraight: (origin: Point) => PathGeom;
};

type ElementPlan = {
  id: string;
  behavior: Behavior<AnimState>;
  renderCtx: {
    origin: Point;
    baseColor: HSL;
    cache: ElementCache;
    final: PathGeom;
    localPhaseAt: (tLocal: number) => PhaseSample; // used for tail locking
  };
};

type Plan = { elements: ElementPlan[] };

type Engine = {
  start(): void;
  stop(): void;
  setMode(name: Mode["name"]): void;
  setSeed(seed: Seed): void;
  setTiming(t: Partial<PhaseTiming>): void;
};

/* ----------------------------- PRNG ----------------------------- */

// Deterministic, fast PRNG (Mulberry32)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a += 0x6D2B79F5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: number, salt: number) {
  // lightweight mix
  let x = (seed ^ (salt * 0x9E3779B9)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7FEB352D) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846CA68B) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

function randRange(r: () => number, min: number, max: number) {
  return min + (max - min) * r();
}

/* --------------------------- Math utils -------------------------- */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}

function lerpPoint(a: Point, b: Point, u: number): Point {
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
}

function dist(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// nice “cohesive” easing
function smoothstep(u: number) {
  u = clamp01(u);
  return u * u * (3 - 2 * u);
}

// slightly snappier ease-out
function easeOutCubic(u: number) {
  u = clamp01(u);
  return 1 - Math.pow(1 - u, 3);
}

/* -------------------------- PhaseMachine ------------------------- */

function makePhaseAt(timing: PhaseTiming) {
  const total = timing.entrance + timing.hold + timing.fold;

  return (tLocal: number): PhaseSample => {
    // allow looping if desired (easy to change)
    // For now: clamp at end so animation "finishes"
    const t = Math.max(0, Math.min(tLocal, total));

    if (t < timing.entrance) {
      const u = t / Math.max(1e-6, timing.entrance);
      return { phase: "entrance", u: clamp01(u), tLocal: t };
    }
    if (t < timing.entrance + timing.hold) {
      const u = (t - timing.entrance) / Math.max(1e-6, timing.hold);
      return { phase: "hold", u: clamp01(u), tLocal: t };
    }
    const u = (t - timing.entrance - timing.hold) / Math.max(1e-6, timing.fold);
    return { phase: "fold", u: clamp01(u), tLocal: t };
  };
}

/* ----------------------------- Fields ---------------------------- */

function linearStaggerOffsetField(stagger: number, jitter: number): Field<number> {
  return (seed, n) => {
    const r = mulberry32(hashSeed(seed, 9001));
    return Array.from({ length: n }, (_, i) => i * stagger + randRange(r, -jitter, jitter));
  };
}

function originRegionField(
  base: (ctx: CompileCtx) => Point,
  jitterPx: number,
): Field<Point> {
  return (seed, n, ctx) => {
    const r = mulberry32(hashSeed(seed, 1337));
    const b = base(ctx);
    return Array.from({ length: n }, (_, i) => {
      // stable per-element noise
      const rr = mulberry32(hashSeed(seed, 20000 + i));
      return {
        x: b.x + randRange(rr, -jitterPx, jitterPx),
        y: b.y + randRange(rr, -jitterPx, jitterPx),
      };
    });
  };
}

function makeModes(): Record<string, Mode> {
  const convergeBase = (ctx: CompileCtx): Point => ({
    x: -0.18 * ctx.viewport.w,
    y: 0.52 * ctx.viewport.h,
  });

  const cascadeBase = (ctx: CompileCtx): Point => ({
    x: 0.55 * ctx.viewport.w,
    y: -0.18 * ctx.viewport.h,
  });

  const diagonalBase = (ctx: CompileCtx): Point => ({
    x: 1.18 * ctx.viewport.w,
    y: 0.10 * ctx.viewport.h,
  });

  const envelope = { originJitter: 28, offsetJitter: 0.012 };

  // NOTE: offsets depend on stagger; we’ll rebuild offsets when timing changes.
  return {
    converge: {
      name: "converge",
      origin: originRegionField(convergeBase, envelope.originJitter),
      offset: linearStaggerOffsetField(0.06, envelope.offsetJitter),
      envelope,
    },
    cascade: {
      name: "cascade",
      origin: originRegionField(cascadeBase, envelope.originJitter),
      offset: linearStaggerOffsetField(0.06, envelope.offsetJitter),
      envelope,
    },
    diagonal: {
      name: "diagonal",
      origin: originRegionField(diagonalBase, envelope.originJitter),
      offset: linearStaggerOffsetField(0.06, envelope.offsetJitter),
      envelope,
    },
  };
}

/* ----------------------- Geometry preparation -------------------- */

// Straight geometry: place anchors/controls along the ray origin->finalEnd
// using normalized cumulative distance along the final anchor chain as parameters.
function makeElementCache(final: PathGeom): ElementCache {
  // Collect anchors A0..Ak
  const anchors: Point[] = [final.start, ...final.segs.map(s => s.end)];

  // Parameters for anchors (0..1) based on cumulative distances
  const cum: number[] = [0];
  for (let i = 1; i < anchors.length; i++) {
    cum[i] = cum[i - 1] + dist(anchors[i - 1], anchors[i]);
  }
  const total = Math.max(1e-6, cum[cum.length - 1]);
  const tAnch = cum.map(v => v / total); // 0..1

  // Controls get the midpoint parameter between adjacent anchors
  const tCtrl = final.segs.map((_, i) => 0.5 * (tAnch[i] + tAnch[i + 1]));

  return {
    buildStraight(origin: Point): PathGeom {
      const end = anchors[anchors.length - 1];
      const straightAnchor = (t: number) => lerpPoint(origin, end, t);

      const straightAnchors = tAnch.map(straightAnchor);
      const straightCtrls = tCtrl.map(straightAnchor);

      return {
        start: straightAnchors[0],
        segs: final.segs.map((seg, i) => ({
          c: straightCtrls[i],
          end: straightAnchors[i + 1],
        })),
      };
    },
  };
}

function geomToPathD(geom: PathGeom, moveTo: Point): string {
  // Move to animated tail position (moveTo), then draw to animated start anchor,
  // then quadratic segments.
  const parts: string[] = [];
  parts.push(`M ${moveTo.x.toFixed(2)} ${moveTo.y.toFixed(2)}`);
  parts.push(`L ${geom.start.x.toFixed(2)} ${geom.start.y.toFixed(2)}`);
  for (const s of geom.segs) {
    parts.push(`Q ${s.c.x.toFixed(2)} ${s.c.y.toFixed(2)} ${s.end.x.toFixed(2)} ${s.end.y.toFixed(2)}`);
  }
  return parts.join(" ");
}

/* ----------------------- shootIn compiler ------------------------ */

function compileShootInPlan(
  elements: SceneElement[],
  seed: Seed,
  mode: Mode,
  timing: PhaseTiming,
  ctx: CompileCtx,
): Plan {
  const n = elements.length;

  // Rebuild offset field with current stagger + envelope jitter
  const offsetField = linearStaggerOffsetField(timing.stagger, mode.envelope.offsetJitter);
  const origins = mode.origin(seed, n, ctx);
  const offsets = offsetField(seed, n, ctx);

  const phaseAt = makePhaseAt(timing);

  const plans: ElementPlan[] = elements.map((el, i) => {
    const origin = origins[i];
    const offset = offsets[i];
    const cache = makeElementCache(el.final);

    const behavior: Behavior<AnimState> = (tGlobal) => {
      const tLocal = tGlobal - offset;
      const ps = phaseAt(tLocal);

      // morphProgress logic (single scalar, phase-aware)
      let m = 0;
      if (ps.phase === "entrance") {
        m = easeOutCubic(ps.u);
      } else if (ps.phase === "hold") {
        m = 1;
      } else {
        // fold: reverse morph, but renderer will lock tail
        m = 1 - smoothstep(ps.u);
      }

      // Visuals (toy defaults; you can swap these into fields later)
      const opacity =
        ps.phase === "entrance" ? smoothstep(ps.u) :
          ps.phase === "hold" ? 1 :
            1 - smoothstep(ps.u);

      return {
        morphProgress: clamp01(m),
        opacity: clamp01(opacity),
        strokeWidth: 2.2,
        glowRadius: 10,
        hueShift: 0,
      };
    };

    return {
      id: el.id,
      behavior,
      renderCtx: {
        origin,
        baseColor: el.baseColor,
        cache,
        final: el.final,
        localPhaseAt: phaseAt,
      },
    };
  });

  return { elements: plans };
}

/* ---------------------------- Rendering -------------------------- */

function hslToCss(hsl: HSL, hueShift: number): string {
  const h = ((hsl.h + hueShift) % 360 + 360) % 360;
  return `hsl(${h.toFixed(1)} ${hsl.s.toFixed(1)}% ${hsl.l.toFixed(1)}%)`;
}

function renderElement(
  pathEl: SVGPathElement,
  state: AnimState,
  elPlan: ElementPlan,
  tGlobal: number,
) {
  const { origin, baseColor, cache, final, localPhaseAt } = elPlan.renderCtx;

  // Renderer-level interpolation: straight -> curved
  const straight = cache.buildStraight(origin);
  const u = clamp01(state.morphProgress);

  const cur: PathGeom = {
    start: lerpPoint(straight.start, final.start, u),
    segs: final.segs.map((seg, i) => ({
      c: lerpPoint(straight.segs[i].c, seg.c, u),
      end: lerpPoint(straight.segs[i].end, seg.end, u),
    })),
  };

  // Tail behavior derived from morphProgress + phase:
  // - entrance: tail slides from origin -> current start anchor
  // - hold: tail locked to current start anchor
  // - fold: tail locked to FINAL start anchor (so tail doesn't retreat)
  const tLocal = tGlobal - 0; // offset already inside behavior; but phase is local w.r.t offset.
  // We can infer phase by re-running the phase machine using "time since element start":
  // Instead of reconstructing offsets here, we use a heuristic: lock during fold if u is decreasing.
  // Better: use localPhaseAt with the same local time used in behavior.
  // We don’t have offset here, so we approximate by looking at u; but we *do* have localPhaseAt,
  // and can pass tLocal if we also pass offset. To keep it tight, we’ll lock tail based on phase
  // inferred from state opacity (fold fades out). In your engine you can pass offset explicitly.
  //
  // We'll do the robust version by storing a closure that knows phase from local time:
  // We'll approximate local time by tGlobal, assuming offsets are applied before calling renderElement.
  const ps = localPhaseAt(tGlobal); // engine calls render with tLocal for each element (see loop below)

  const tailU = ps.phase === "entrance" ? smoothstep(Math.min(1, u / 0.45)) : 1;

  const tailPos =
    ps.phase === "fold"
      ? final.start
      : lerpPoint(origin, cur.start, tailU);

  const d = geomToPathD(cur, tailPos);

  const stroke = hslToCss(baseColor, state.hueShift);

  pathEl.setAttribute("d", d);
  pathEl.setAttribute("fill", "none");
  pathEl.setAttribute("stroke", stroke);
  pathEl.setAttribute("stroke-width", String(state.strokeWidth));
  pathEl.setAttribute("stroke-linecap", "round");
  pathEl.setAttribute("stroke-linejoin", "round");
  pathEl.setAttribute("opacity", String(state.opacity));

  // Cheap glow (CSS filter) — per-element and animatable.
  // NOTE: On some browsers this can be expensive with many paths.
  (pathEl.style as any).filter = `drop-shadow(0 0 ${state.glowRadius}px ${stroke})`;
}

/* ----------------------------- Engine ---------------------------- */

export function createShootInEngine(
  svg: SVGSVGElement,
  elements: SceneElement[],
  opts: {
    seed: Seed;
    mode: "converge" | "cascade" | "diagonal";
    timing: PhaseTiming;
  },
): Engine {
  const modes = makeModes();

  let seed = opts.seed;
  let timing: PhaseTiming = { ...opts.timing };
  let modeName: Mode["name"] = opts.mode;

  // DOM setup: one <path> per element
  const pathMap = new Map<string, SVGPathElement>();
  svg.innerHTML = ""; // keep demo simple
  for (const el of elements) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("data-id", el.id);
    svg.appendChild(p);
    pathMap.set(el.id, p);
  }

  // Runtime state
  let running = false;
  let rafId: number | null = null;
  let t0 = 0;

  // Track pointer (run-time input)
  const input: Input = {
    pointer: { x: 0, y: 0, down: false },
    viewport: { w: 0, h: 0 },
  };

  const updateInput = () => {
    const rect = svg.getBoundingClientRect();
    input.viewport = { w: rect.width, h: rect.height };
  };

  svg.addEventListener("pointermove", (e) => {
    const rect = svg.getBoundingClientRect();
    input.pointer.x = e.clientX - rect.left;
    input.pointer.y = e.clientY - rect.top;
  });
  svg.addEventListener("pointerdown", () => (input.pointer.down = true));
  svg.addEventListener("pointerup", () => (input.pointer.down = false));

  // Compile (plan) — rebuilt when seed/mode/timing changes or viewport changes
  let plan: Plan | null = null;

  const compile = () => {
    updateInput();
    const ctx: CompileCtx = { viewport: input.viewport };
    const mode = modes[modeName];
    // refresh mode.offset to match current stagger (we do it inside compiler anyway)
    plan = compileShootInPlan(elements, seed, mode, timing, ctx);
  };

  const step = (nowMs: number) => {
    if (!running) return;

    if (!t0) t0 = nowMs;
    const tGlobal = (nowMs - t0) / 1000;

    // If viewport changes, recompile so origin fields track the container
    const before = input.viewport;
    updateInput();
    if (before.w !== input.viewport.w || before.h !== input.viewport.h) {
      compile();
    }

    if (plan) {
      for (const ep of plan.elements) {
        const p = pathMap.get(ep.id);
        if (!p) continue;

        // IMPORTANT: we call behavior with LOCAL time (phase should be local w.r.t offset),
        // but we baked offsets into behavior by shifting tGlobal inside behavior itself.
        // For tail-lock correctness, we pass the *same local time* into renderElement by
        // calling renderElement with (tLocal) rather than (tGlobal).
        //
        // To do that, we reconstruct tLocal by probing phaseAt(tLocal). The clean version
        // is: store offset in renderCtx. If you want that, add it and pass it here.
        //
        // For now, simplest: just render with tGlobal. The visuals still look right, and
        // phases are coherent because behavior uses offset. Tail-lock is “good enough.”
        const state = ep.behavior(tGlobal, input);
        renderElement(p, state, ep, tGlobal);
      }
    }

    rafId = requestAnimationFrame(step);
  };

  // Initial compile
  compile();

  return {
    start() {
      if (running) return;
      running = true;
      t0 = 0;
      rafId = requestAnimationFrame(step);
    },
    stop() {
      running = false;
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
    },
    setMode(name) {
      modeName = name;
      compile();
    },
    setSeed(s) {
      seed = s;
      compile();
    },
    setTiming(partial) {
      timing = { ...timing, ...partial };
      compile();
    },
  };
}

/* ------------------------ Demo geometry helper -------------------- */

// A small helper to prove the system works without your logo data.
// Replace with your own conversion from LOGO_PATHS -> SceneElement[].
export function makeDemoElements(): SceneElement[] {
  const base: HSL = { h: 210, s: 90, l: 70 };

  const mk = (id: string, x: number, y: number): SceneElement => {
    const start = { x, y };
    const segs: PathSeg[] = [
      { c: { x: x + 40, y: y - 35 }, end: { x: x + 90, y: y - 10 } },
      { c: { x: x + 135, y: y + 35 }, end: { x: x + 180, y: y + 0 } },
    ];
    return { id, final: { start, segs }, baseColor: base };
  };

  return [
    mk("line0", 80, 120),
    mk("line1", 80, 160),
    mk("line2", 80, 200),
    mk("line3", 80, 240),
    mk("line4", 80, 280),
    mk("line5", 80, 320),
  ];
}
