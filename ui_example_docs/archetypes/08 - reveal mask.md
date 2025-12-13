
Logo-08 Reveal Mask Archetype Document

This document defines everything you need (beyond the kernel) to implement logo-08-reveal-mask-(procedural|varied) in the new kernel.

This animation is constraint-driven visibility, not geometry morph:
	•	the logo geometry is static
	•	a mask evolves over time
	•	visibility is logo ∩ mask(t)
	•	variants differ by mask shape + sweep direction + softness

It includes:
	•	Spec
	•	Compiler (reference implementation shape)
	•	Renderer contract
	•	Geometry cache entries
	•	Reference helpers
	•	Mode hooks (procedural vs varied)

⸻

1) Archetype identity

RevealMask = animate a mask over a static scene.

At time t:
	•	mask geometry M(t) is generated (or parameterized)
	•	render result is clip(scene, M(t)) (or alpha-mask)
	•	optional edge glow/feather

This archetype is the canonical example of:

“Animation as changing constraints, not changing geometry.”

⸻

2) Scene spec (immutable constraint)

export interface RevealScene {
  id: "logo-08";
  content: DrawNode;     // static logo geometry tree
  bounds?: Bounds;       // optional; used for default sweeps
}

Invariant: content never changes.

⸻

3) Fields (compile-time parameterization)

Evaluated once (determinism boundary). These determine the mask’s “family”.

export interface RevealFields {
  // timing
  delay?: Field<number>;         // optional global delay
  duration: Field<number>;       // reveal duration

  // mask shape + direction
  mode: Field<RevealMode>;       // sweep type (left→right, circle expand, diagonal, etc.)
  softness: Field<number>;       // feather/blur px
  edgeGlow?: Field<number>;      // optional glow px

  // style
  opacity?: Field<number>;       // base opacity
  tint?: Field<Color>;           // optional color overlay

  // optional “noise” in mask edge (varied)
  edgeJitter?: Field<number>;    // px amplitude (bounded)
}

RevealMode (closed set)

export type RevealMode =
  | { kind: "wipe"; dir: "left" | "right" | "up" | "down" }
  | { kind: "diagonal"; dir: "tl-br" | "tr-bl" }
  | { kind: "radial"; origin?: Vec2 }          // expanding circle
  | { kind: "band"; dir: "horizontal" | "vertical"; width: number } // moving band
  | { kind: "iris"; origin?: Vec2; inner: number; outer: number };  // ring expand


⸻

4) Phase structure

Reveal is typically:
	•	entrance: mask grows/sweeps from 0 → full coverage
	•	hold
	•	exit (optional): fade out or reverse mask

export interface RevealPhases {
  machine: PhaseMachine;

  /** Map phase sample → reveal progress r ∈ [0,1] */
  reveal: (sample: { phase: string; u: number; uRaw: number }) => number;

  /** Optional exit */
  exit?: (sample: { phase: string; u: number; uRaw: number }) => {
    opacityMul?: number;
  };
}

Canonical:
	•	entrance: reveal = u
	•	hold: reveal = 1
	•	exit: opacityMul = 1 - u (or reverse reveal if desired)

⸻

5) Renderer contract

Renderer must support:
	•	clipping/masking static content by a mask shape
	•	feather/softness (blur) and optional glow at mask edge

export interface MaskShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "polygon"; pts: readonly Vec2[] };

export interface RevealRenderer {
  /**
   * Render content with a time-varying mask.
   * Backend chooses clipPath or alpha mask.
   */
  masked(args: {
    id: string;
    content: DrawNode;
    mask: MaskShape;
    softnessPx: number;
    edgeGlowPx?: number;
    opacity: number;
    tint?: Color;
  }): DrawNode;

  compose(rootId: string, node: DrawNode): RenderTree;
}


⸻

6) Geometry cache requirements

Reveal depends on bounds and (optionally) a precomputed polygon for diagonals.

Cache entries:
	1.	{ kind: "Bounds", sceneId } → { bounds, center }
	2.	{ kind: "RevealPolygon", sceneId, modeKey } → polygon points (optional)

Most sweeps can be computed from bounds each frame cheaply, so caching is optional beyond bounds.

⸻

7) Spec

export interface RevealSpec {
  scene: RevealScene;
  fields: RevealFields;
  phases: RevealPhases;
  renderer: RevealRenderer;
  geom: GeometryCache;
}


⸻

8) Mask generator (reference contract)

Compiler should not hardcode mask math; keep it as a reusable generator.

export interface MaskGenerator {
  mask(args: {
    mode: RevealMode;
    bounds: Bounds;
    center: Vec2;
    reveal: number;       // 0..1
    edgeJitterPx: number; // 0 if unused
    seed: Seed;
    tMs: number;          // only if you want deterministic time-jitter
  }): MaskShape;
}

You can include this in RevealSpec if you want it swappable:

// optional extension:
maskGen: MaskGenerator;


⸻

9) Compiler (reference implementation shape)

Responsibilities:
	•	evaluate fields once
	•	per frame:
	•	sample phase
	•	compute reveal progress
	•	compute mask from bounds + mode
	•	call renderer.masked

export function compileRevealMask(
  spec: RevealSpec & { maskGen: MaskGenerator },
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const { scene, fields, phases, renderer, geom, maskGen } = spec;

  // cache bounds/center
  const bc = geom.get(
    { kind: "Bounds", sceneId: scene.id } as any,
    () => computeBounds(scene.content) // your geometry layer already has this
  );

  // compile-time params (determinism boundary)
  const delay = fields.delay ? fields.delay(seed, 0, 1, env) : 0;
  const duration = fields.duration(seed, 0, 1, env);

  const mode = fields.mode(seed, 0, 1, env);
  const softness = fields.softness(seed, 0, 1, env);
  const edgeGlow = fields.edgeGlow ? fields.edgeGlow(seed, 0, 1, env) : undefined;
  const baseOpacity = fields.opacity ? fields.opacity(seed, 0, 1, env) : 1;
  const tint = fields.tint ? fields.tint(seed, 0, 1, env) : undefined;
  const edgeJitter = fields.edgeJitter ? fields.edgeJitter(seed, 0, 1, env) : 0;

  return {
    signal: (t, ctx) => {
      const ps = PhaseMachine.sample(phases.machine, t);

      // local time + progress
      const localT = ps.tLocal - delay;
      const uLocal = duration <= 0 ? 1 : clamp01(localT / duration);

      const reveal = phases.reveal({ phase: ps.phase, u: uLocal, uRaw: uLocal });
      const exit = phases.exit ? phases.exit({ phase: ps.phase, u: uLocal, uRaw: uLocal }) : undefined;

      const mask = maskGen.mask({
        mode,
        bounds: bc.bounds,
        center: bc.center,
        reveal,
        edgeJitterPx: edgeJitter,
        seed,
        tMs: ps.tLocal,
      });

      const node = renderer.masked({
        id: `${scene.id}-masked`,
        content: scene.content,
        mask,
        softnessPx: softness,
        edgeGlowPx: edgeGlow,
        opacity: clamp01(baseOpacity * (exit?.opacityMul ?? 1)),
        tint,
      });

      return renderer.compose(scene.id, node);
    },

    event: () => [],
  };
}


⸻

10) Reference mask generation helpers (small, essential)

These cover the common “wipe / diagonal / radial / band / iris” modes.

export function maskFromMode(args: {
  mode: RevealMode;
  bounds: Bounds;
  center: Vec2;
  reveal: number;          // 0..1
}): MaskShape {
  const { mode, bounds, center } = args;
  const r = clamp01(args.reveal);

  const x0 = bounds.min.x, y0 = bounds.min.y;
  const w = bounds.max.x - bounds.min.x;
  const h = bounds.max.y - bounds.min.y;

  if (mode.kind === "wipe") {
    if (mode.dir === "left")  return { kind: "rect", x: x0, y: y0, w: w * r, h };
    if (mode.dir === "right") return { kind: "rect", x: x0 + w * (1 - r), y: y0, w: w * r, h };
    if (mode.dir === "up")    return { kind: "rect", x: x0, y: y0, w, h: h * r };
    return { kind: "rect", x: x0, y: y0 + h * (1 - r), w, h: h * r };
  }

  if (mode.kind === "diagonal") {
    // diagonal reveals are easiest as a big polygon that slides across bounds
    // Represent as a quad whose edge sweeps across the rect.
    return diagonalPoly(bounds, r, mode.dir);
  }

  if (mode.kind === "radial") {
    const origin = mode.origin ?? center;
    const maxR = Math.hypot(w, h); // big enough to cover
    return { kind: "circle", cx: origin.x, cy: origin.y, r: maxR * r };
  }

  if (mode.kind === "band") {
    const bw = mode.width;
    if (mode.dir === "vertical") {
      const cx = x0 + w * r;
      return { kind: "rect", x: cx - bw / 2, y: y0, w: bw, h };
    } else {
      const cy = y0 + h * r;
      return { kind: "rect", x: x0, y: cy - bw / 2, w, h: bw };
    }
  }

  // iris ring: approximate by circle mask of outer radius (inner/outer could be used by alpha-mask backends)
  const origin = mode.origin ?? center;
  const maxR = Math.hypot(w, h);
  const outer = lerpNum(mode.inner, mode.outer, r);
  return { kind: "circle", cx: origin.x, cy: origin.y, r: Math.min(maxR, outer) };
}

// Simple diagonal polygon sweep
export function diagonalPoly(bounds: Bounds, r: number, dir: "tl-br" | "tr-bl"): MaskShape {
  const x0 = bounds.min.x, y0 = bounds.min.y;
  const x1 = bounds.max.x, y1 = bounds.max.y;
  const w = x1 - x0, h = y1 - y0;

  // sweep parameter along diagonal axis
  const s = (w + h) * r;

  if (dir === "tl-br") {
    // line x+y = (x0+y0) + s
    // polygon covers region where x+y <= threshold
    const th = (x0 + y0) + s;
    return { kind: "polygon", pts: clipRectByDiag(bounds, th, +1) };
  } else {
    // line (x - y) = (x0 - y0) + s
    const th = (x0 - y0) + s;
    return { kind: "polygon", pts: clipRectByDiag(bounds, th, -1) };
  }
}

// Reference placeholder: implement via half-plane clipping (Sutherland–Hodgman)
export function clipRectByDiag(bounds: Bounds, th: number, sign: 1 | -1): readonly Vec2[] {
  // sign=+1 means x+y <= th
  // sign=-1 means x-y <= th
  // For correctness you’ll implement polygon clipping. Kept as a hook.
  throw new Error("clipRectByDiag not implemented");
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

If you don’t want polygon clipping yet, you can fake diagonal reveals by using a large rotated rect mask in renderers that support transforms. In that case, your MaskShape can include { kind:"rect", ... , rotDeg }.

⸻

11) Mode hooks (procedural vs varied)

Reveal modes correspond directly to RevealMode values:
	•	wipeLeft, wipeRight, wipeUp, wipeDown
	•	diagTLBR, diagTRBL
	•	radialCenter, radialRandomCorner
	•	bandVerticalWide, bandVerticalThin, etc.

Procedural vs Varied:
	•	procedural: small softness, stable direction, no edgeJitter
	•	varied: larger softness, optional edgeGlow, edgeJitter>0, random radial origins

Nothing changes in compiler; only fields.

