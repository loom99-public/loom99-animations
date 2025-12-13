Below is a single, concrete document for logo-03-morphing (the procedural one you uploaded), written for the new kernel.

It includes everything you need beyond the kernel + Morphing bedrock:
	•	Spec (scene + fields + phases + renderer hooks)
	•	Compiler (reference implementation shape, no kernel redefinitions)
	•	Geometry cache entries (exactly what to cache)
	•	Reference functions (the small set you actually need)
	•	Mode hooks (procedural vs varied, palettes, timing)

This is tailored to what your logo-03-morphing-procedural.html actually does:
many independent paths morph from random small shapes into final logo paths using a command-based interpolator (M/L/A/Z supported).

⸻

Logo-03 Morphing Archetype Document

1) What this archetype is

Logo-03 = Multi-Path Morph:
	•	There are N independent SVG paths (the logo pieces).
	•	Each piece has a target path (final shape).
	•	Each piece starts as a random start shape (circle/square/triangle/star/polygon) near the target’s center.
	•	Each piece runs a local morph with delay + duration.
	•	Global phases are: entrance → hold → exit/fold (exit often handled as transform/opacity, not morph).

This is not LineMorph (strokes + tail). It’s PathMorph.

⸻

2) Scene spec (immutable constraints)

Scene contains only the final shapes and their stable identities.

export interface PathDef {
  id: string;
  d: string;          // final path string (as in your HTML)
  colorTag?: string;  // e.g. "purple", "cyan", etc (optional convenience)
  groupId?: number;   // optional
}

export interface Logo03Scene {
  id: "logo-03";
  paths: readonly PathDef[];  // N final shapes
}

Invariant: paths[i].d is the constraint; animation must converge to it.

⸻

3) Fields (compile-time parameterization)

These are evaluated once (determinism boundary).

export interface PathMorphFields {
  delay: Field<number>;
  duration: Field<number>;

  /** Final color selection (palette-driven) */
  color: Field<Color>;
  opacity?: Field<number>;

  /** Start shape generator (deterministic randomness) */
  startShape: Field<StartShapeSpec>;

  /** Optional: per-path “size” hint used by startShape */
  startSize?: Field<number>;
}

Start shape spec (what gets generated at compile-time)

export type StartShapeKind = "circle" | "square" | "triangle" | "star" | "polygon";

export interface StartShapeSpec {
  kind: StartShapeKind;

  /** Center around which the start shape is generated */
  center: Vec2;

  /** Size (radius / half-extent) */
  size: number;

  /** Only for polygon */
  sides?: number; // 3..8 typical

  /** Optional micro-rotation to make it feel alive */
  rot?: number; // radians
}


⸻

4) Phase policy

export interface PathMorphPhases {
  machine: PhaseMachine;

  /** Map phase sample + local progress → morph scalar */
  morph: (sample: { phase: string; u: number; uRaw: number }) => number;

  /** Optional: exit policy if you want exit to be a transform/fade */
  exit?: (sample: { phase: string; u: number; uRaw: number }) => {
    scale?: number;
    opacityMul?: number;
  };
}

Canonical mapping (matches your procedural HTML behavior):
	•	entrance: morph = u
	•	hold: morph = 1
	•	exit/fold: morph = 1, but apply scale/opacityMul (renderer-level)

⸻

5) Renderer contract (where morphing becomes geometry)

For logo-03, morphing happens by interpolating path command coordinate parameters.

export interface PathMorphRenderer {
  renderPath(args: {
    id: string;

    /** dynamic morph input */
    morph: number;

    /** immutable final path definition */
    target: PathDef;

    /** compiled start shape for this path */
    start: StartShapeSpec;

    /** resolved style */
    style: Style;

    /** optional exit transform */
    exit?: { scale?: number; opacityMul?: number };
  }): DrawNode;

  compose(rootId: string, nodes: readonly DrawNode[]): RenderTree;
}

Important: the compiler does not parse/interpolate geometry. The renderer does.

⸻

6) Geometry cache requirements (critical)

You should cache the expensive, reusable parts:

Required cache entries
	1.	Parsed target commands

	•	Key: { kind: "ParsedPath", pathId }
	•	Value: ParsedCmd[]

	2.	Normalized target command schema (if you enforce consistent command count)

	•	Key: { kind: "NormalizedPathSchema", pathId, schemaVersion }
	•	Value: NormalizedCmdSchema

	3.	Optional: target bounds / centroid

	•	Key: { kind: "PathBounds", pathId }
	•	Value: { min: Vec2; max: Vec2; center: Vec2 }

Why this matters

Your procedural HTML reparses both start and end paths during interpolation. In the new kernel, that should be:
	•	parse target path once → cache
	•	generate start shape once → compile-time
	•	interpolate fast per frame

⸻

7) The canonical spec object

export interface Logo03PathMorphSpec {
  scene: Logo03Scene;
  fields: PathMorphFields;
  phases: PathMorphPhases;
  renderer: PathMorphRenderer;

  /** Required for renderer and/or compiler */
  geom: GeometryCache;
}


⸻

8) Compiler (reference implementation shape)

This follows the Morphing bedrock rules exactly:
	•	evaluate fields once
	•	compute local u
	•	feed renderer (morph, startShape, targetPath)

export function compileLogo03PathMorph(
  spec: Logo03PathMorphSpec,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const { scene, fields, phases, renderer } = spec;
  const n = scene.paths.length;

  // Precompute deterministic per-path params
  const params = scene.paths.map((p, i) => {
    const delay = fields.delay(seed, i, n, env);
    const duration = fields.duration(seed, i, n, env);

    // center should come from target bounds (cached)
    const bounds = spec.geom.get(
      { kind: "PathBounds", pathId: p.id } as any,
      () => computePathBoundsCached(spec.geom, p) // reference hook below
    );

    const size =
      fields.startSize ? fields.startSize(seed, i, n, env) : defaultStartSizeFromBounds(bounds);

    const start = fields.startShape(seed, i, n, env);
    // enforce start.center/size defaults if the field only chooses kind
    const startResolved: StartShapeSpec = {
      ...start,
      center: start.center ?? bounds.center,
      size: start.size ?? size,
    };

    const color = fields.color(seed, i, n, env);
    const opacity = fields.opacity ? fields.opacity(seed, i, n, env) : 1;

    return { id: p.id, target: p, delay, duration, start: startResolved, color, opacity };
  });

  return {
    signal: (t, ctx) => {
      const ps = PhaseMachine.sample(phases.machine, t);

      const nodes = params.map((pp, i) => {
        const localT = ps.tLocal - pp.delay;
        const uLocal = pp.duration <= 0 ? 1 : clamp01(localT / pp.duration);

        const morph = phases.morph({ phase: ps.phase, u: uLocal, uRaw: uLocal });
        const exit = phases.exit ? phases.exit({ phase: ps.phase, u: uLocal, uRaw: uLocal }) : undefined;

        const style: Style = {
          fill: { kind: "none" },
          stroke: pp.color,
          opacity: pp.opacity * (exit?.opacityMul ?? 1),
          strokeWidth: 4, // or a style field if you want
          lineCap: "round",
          lineJoin: "round",
        };

        return renderer.renderPath({
          id: pp.id,
          morph,
          target: pp.target,
          start: pp.start,
          style,
          exit,
        });
      });

      return renderer.compose(scene.id, nodes);
    },

    event: () => [],
  };
}


⸻

9) Reference functions you need (small + essential)

These are the “path morphing toolkit” pieces.

9.1 Path parsing (M/L/A/Z as in your HTML)

export type ParsedCmd =
  | { cmd: "M"; x: number; y: number }
  | { cmd: "L"; x: number; y: number }
  | { cmd: "A"; rx: number; ry: number; rot: number; laf: 0|1; sf: 0|1; x: number; y: number }
  | { cmd: "Z" };

export function parsePathMLAZ(d: string): ParsedCmd[] {
  // Minimal parser: split by command letters and parse numbers.
  // Must be deterministic; no DOM required.
  // (Implementation omitted here if you already have one; it’s straightforward.)
  throw new Error("parsePathMLAZ not implemented");
}

9.2 Normalization (make start commands align with target)

Your HTML “pads” by repeating last point when lengths differ. Keep that rule:

export function normalizeCmdList(start: ParsedCmd[], end: ParsedCmd[]): { s: ParsedCmd[]; e: ParsedCmd[] } {
  const max = Math.max(start.length, end.length);
  const sLast = start[start.length - 1]!;
  const eLast = end[end.length - 1]!;

  const s: ParsedCmd[] = [];
  const e: ParsedCmd[] = [];

  for (let i = 0; i < max; i++) {
    s.push(start[i] ?? sLast);
    e.push(end[i] ?? eLast);
  }
  return { s, e };
}

9.3 Interpolation (only interpolate coordinates; keep A params from end)

Matches your procedural logic:

export function interpolateMLAZ(start: ParsedCmd[], end: ParsedCmd[], u: number): string {
  const { s, e } = normalizeCmdList(start, end);
  let d = "";

  for (let i = 0; i < e.length; i++) {
    const sc = s[i]!;
    const ec = e[i]!;

    if (ec.cmd === "Z") {
      d += " Z";
      continue;
    }

    // interpolate endpoints for M/L/A
    const x = lerpNum((sc as any).x ?? 0, (ec as any).x, u);
    const y = lerpNum((sc as any).y ?? 0, (ec as any).y, u);

    if (ec.cmd === "M") d += `${i === 0 ? "M" : " M"} ${x} ${y}`;
    else if (ec.cmd === "L") d += ` L ${x} ${y}`;
    else if (ec.cmd === "A") {
      // keep arc params from target, interpolate only endpoint
      d += ` A ${ec.rx} ${ec.ry} ${ec.rot} ${ec.laf} ${ec.sf} ${x} ${y}`;
    }
  }

  return d.trim();
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

9.4 Start shape generation → start path string

export function startShapeToPath(spec: StartShapeSpec): string {
  // Must output MLAZ commands compatible with your parser/interpolator.
  // Circle uses A; polygon/star use M/L/Z.
  throw new Error("startShapeToPath not implemented");
}

9.5 Bounds helper (for centering start shapes)

export function computePathBoundsCached(cache: GeometryCache, path: PathDef): { min: Vec2; max: Vec2; center: Vec2 } {
  const parsed = cache.get({ kind: "ParsedPath", pathId: path.id } as any, () => parsePathMLAZ(path.d));
  // compute bbox from parsed command x/y fields
  throw new Error("computePathBoundsCached not implemented");
}

export function defaultStartSizeFromBounds(b: { min: Vec2; max: Vec2 }): number {
  const w = b.max.x - b.min.x;
  const h = b.max.y - b.min.y;
  return 0.35 * Math.min(w, h); // tuned; your HTML uses ~35 in examples
}


⸻

10) Mode hooks (procedural vs varied)

Logo-03 procedural behavior maps cleanly to modes:

Origin / start-shape mode (procedural)
	•	start shape centers near target centroid
	•	start shape kind is picked from a curated set

Timing mode
	•	staggered delays (base step with variance)
	•	duration randomized per path (800–2000ms with variance)

Palette mode
	•	palette chosen once per run, then applied per path

Procedural vs Varied
	•	procedural: small variance envelopes, coherent palette
	•	varied: larger variance envelopes, per-path hue perturbation, more aggressive shape variety

All of this lives in field builders / mode bundles, not in the compiler.

⸻

11) What you now have

With the kernel + Morphing bedrock + this document, you can implement logo-03 correctly with:
	•	deterministic start shape generation
	•	cached target parsing/bounds
	•	per-path local morph progress
	•	pure renderer-driven interpolation

No hidden state, fully scrub-safe.
