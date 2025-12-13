Logo-05 Liquid Archetype Document

This document defines everything you need (beyond the kernel + Morphing bedrock) to implement logo-05-liquid-(procedural|varied) in the new kernel.

Logo-05 = LiquidBlobs: many circular “blobs” transport toward target positions and merge visually via a goo/metaball rendering layer. The motion is deterministic, phase-driven, and scrubbable.

It includes:
	•	Spec
	•	Compiler (reference implementation shape)
	•	Renderer contract
	•	Geometry cache entries
	•	Reference helpers (small + essential)
	•	Mode hooks (procedural vs varied)

⸻

1) Archetype identity

LiquidBlobs is a specialization of Transport:
	•	Instances: i ∈ [0..N)
	•	Each has:
	•	startPos(i) → Vec2
	•	targetPos(i) → Vec2
	•	startRadius(i) / targetRadius(i) → number
	•	Runtime state is purely:
	•	pos(i,t) + radius(i,t) + style multipliers
	•	Visual “liquidness” is renderer-level:
	•	blur + threshold (SVG goo filter) or metaball shader (WebGL/Canvas)

Unlike Particles:
	•	radius evolution matters
	•	overlap is intentional
	•	renderer applies cohesion (goo)

⸻

2) Scene spec (immutable constraints)

Scene defines the final formation.

export interface LiquidTarget {
  p: Vec2;
  r?: number;          // optional per-target radius hint
  groupId?: number;    // optional grouping (letters/regions)
}

export interface LiquidScene {
  id: "logo-05";
  targets: readonly LiquidTarget[];
}

Invariants
	•	targets.length === blobCount
	•	Targets are the only hard constraint.

⸻

3) Fields (compile-time parameterization)

Fields are evaluated once (determinism boundary).

export interface LiquidFields {
  // spatial initial conditions
  startPosition: Field<Vec2>;

  // transport timing
  delay: Field<number>;
  duration: Field<number>;

  // size evolution
  startRadius: Field<number>;
  targetRadius: Field<number>;

  // style
  color: Field<Color>;
  opacity?: Field<number>;

  // motion character (bounded, decays to 0 at u=1)
  behavior?: Field<LiquidBehavior>;

  // renderer/global goo params as fields (compile-time stable)
  goo: Field<GooParams>;
}

Behavior (closed set, deterministic)

export type LiquidBehavior =
  | { kind: "none" }
  | { kind: "wobble"; amplitude: number; frequency: number }
  | { kind: "swirl"; turns: number; radius: number }
  | { kind: "jitter"; strength: number };

Goo params (renderer-facing)

export interface GooParams {
  blurPx: number;        // e.g. 8..30
  threshold: number;     // e.g. 0.35..0.7 (metaball cutoff)
  glowPx?: number;       // optional outer glow
  alpha?: number;        // global alpha multiplier
}

Rule: Goo params may vary by seed, but must not vary by time unless explicitly done through a signal (not typical for this archetype).

⸻

4) Phase structure

Liquid commonly follows:
	•	entrance: blobs move + swell + wobble
	•	hold: settled but optionally micro-wobble
	•	exit/fold: fade/scale out (often not a reverse morph)

export interface LiquidPhases {
  machine: PhaseMachine;

  /** Map phase sample → transport progress gate (0..1) */
  progress: (sample: { phase: string; u: number; uRaw: number }) => number;

  /** Map phase sample → wobble strength multiplier */
  energy?: (sample: { phase: string; u: number; uRaw: number }) => number;

  /** Optional exit policy */
  exit?: (sample: { phase: string; u: number; uRaw: number }) => {
    opacityMul?: number;
    scaleMul?: number;
  };
}

Canonical default
	•	entrance: progress = u, energy = 1
	•	hold: progress = 1, energy = small (e.g. 0.1) or 0
	•	exit: progress = 1, opacityMul = 1-u, scaleMul = 1-u

⸻

5) Renderer contract (where “liquid” happens)

Renderer draws blobs and applies goo cohesion.

export interface LiquidRenderer {
  /** Create a blob node (geometry is implicit circle) */
  blob(args: {
    id: string;
    position: Vec2;
    radius: number;
    color: Color;
    opacity: number;
  }): DrawNode;

  /** Apply a goo/metaball postprocess over a set of blobs */
  gooLayer(args: {
    id: string;
    blobs: readonly DrawNode[];
    goo: GooParams;
    exit?: { opacityMul?: number; scaleMul?: number };
  }): DrawNode;

  compose(rootId: string, node: DrawNode): RenderTree;
}

Backends
	•	SVG: circles + <filter> goo
	•	Canvas: offscreen blur + threshold
	•	WebGL: metaball shader

⸻

6) Geometry cache requirements

Liquid needs far less geometry derivation than morph/path archetypes, but you should cache:
	1.	Targets expanded

	•	Key: { kind: "LiquidTargets", sceneId, density? }
	•	Value: { p: Vec2, r: number }[] (ensure every target has radius)

	2.	Scene bounds / center (optional)

	•	Key: { kind: "Bounds", sceneId }
	•	Value: bounds + center (useful for offscreen origins or exit scaling)

This archetype’s “heavy work” is mostly renderer-side (filter/shader), not CPU geometry.

⸻

7) Trajectory model (reference)

Transport spine (mandatory):

base(u) = lerp(startPos, targetPos, u)

Behavior offset must be:
	•	deterministic
	•	bounded
	•	multiplied by an energy envelope
	•	decay to 0 at u=1

Radius evolution is a morph too:

radius(u) = lerp(startRadius, targetRadius, u) + radiusOffset(u)

Radius offsets should also decay to 0 at u=1.

⸻

8) Spec

export interface LiquidSpec {
  scene: LiquidScene;
  fields: LiquidFields;
  phases: LiquidPhases;
  renderer: LiquidRenderer;
  geom: GeometryCache;
}


⸻

9) Compiler (reference implementation shape)

Compiler responsibilities:
	•	evaluate fields once per blob
	•	per frame:
	•	sample phase
	•	compute local u per blob
	•	compute pos + radius via trajectory rules
	•	emit blobs → goo layer → compose

export function compileLiquid(
  spec: LiquidSpec,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const { scene, fields, phases, renderer } = spec;
  const n = scene.targets.length;

  // ensure target radii exist (cache)
  const targets = spec.geom.get(
    { kind: "LiquidTargets", sceneId: scene.id } as any,
    () => scene.targets.map(t => ({ p: t.p, r: t.r ?? 10, groupId: t.groupId }))
  );

  // compile-time params (determinism boundary)
  const goo = fields.goo(seed, 0, 1, env);

  const params = targets.map((t, i) => {
    const startPos = fields.startPosition(seed, i, n, env);
    const delay    = fields.delay(seed, i, n, env);
    const duration = fields.duration(seed, i, n, env);

    const r0 = fields.startRadius(seed, i, n, env);
    const r1 = fields.targetRadius(seed, i, n, env);

    const color   = fields.color(seed, i, n, env);
    const opacity = fields.opacity ? fields.opacity(seed, i, n, env) : 1;

    const behavior = fields.behavior
      ? fields.behavior(seed, i, n, env)
      : ({ kind: "none" } as const);

    return { id: `blob-${i}`, startPos, targetPos: t.p, delay, duration, r0, r1, color, opacity, behavior };
  });

  return {
    signal: (t, ctx) => {
      const ps = PhaseMachine.sample(phases.machine, t);
      const gate = phases.progress(ps);
      const energy = phases.energy ? phases.energy(ps) : 1;
      const exit = phases.exit ? phases.exit(ps) : undefined;

      const blobs = params.map((p, i) => {
        const localT = ps.tLocal - p.delay;
        const uLocal = p.duration <= 0 ? 1 : clamp01(localT / p.duration);

        // gate by phase progress (entrance/hold/exit)
        const u = clamp01(uLocal * gate);

        const base = lerp(p.startPos, p.targetPos, u);

        // bounded offset (decays to 0 at u=1)
        const off = liquidOffset(seed, i, p.behavior, ps.tLocal, u, energy);

        const pos = { x: base.x + off.x, y: base.y + off.y };

        // radius morph + subtle wobble
        const rBase = lerpNum(p.r0, p.r1, u);
        const rOff  = liquidRadiusOffset(seed, i, p.behavior, ps.tLocal, u, energy);
        const radius = Math.max(0.5, rBase + rOff);

        const opacity = clamp01(p.opacity * (exit?.opacityMul ?? 1));

        return renderer.blob({
          id: p.id,
          position: pos,
          radius,
          color: p.color,
          opacity,
        });
      });

      const gooNode = renderer.gooLayer({
        id: `${scene.id}-goo`,
        blobs,
        goo,
        exit,
      });

      return renderer.compose(scene.id, gooNode);
    },

    event: () => [],
  };
}


⸻

10) Reference helpers (small, required)

These helpers define the deterministic wobble/jitter without runtime RNG.

10.1 Core math

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
export function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

10.2 Deterministic time-noise (scrub-safe)

Use the same pattern as glitch: hash-based noise sampled at a rate.

export function noise01(seed: number, id: string, tag: string, tMs: number, rateHz: number): number {
  const step = rateHz <= 0 ? 0 : Math.floor((tMs / 1000) * rateHz);
  const h = hash32(`${seed}|${id}|${tag}|${step}`);
  return (h >>> 0) / 0xffffffff;
}
export function noiseSigned(seed: number, id: string, tag: string, tMs: number, rateHz: number): number {
  return noise01(seed, id, tag, tMs, rateHz) * 2 - 1;
}
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

10.3 Liquid offsets (behavior)

These functions guarantee offset→0 as u→1.

export function liquidOffset(
  seed: number,
  index: number,
  behavior: LiquidBehavior,
  tMs: number,
  u: number,
  energy: number
): Vec2 {
  const decay = (1 - u) * energy;
  if (decay <= 0 || behavior.kind === "none") return { x: 0, y: 0 };

  const id = `b${index}`;

  if (behavior.kind === "wobble") {
    const phase = noise01(seed, id, "phase", 0, 1) * Math.PI * 2;
    const w = 2 * Math.PI * behavior.frequency;
    const s = Math.sin((tMs / 1000) * w + phase);
    const c = Math.cos((tMs / 1000) * w + phase);
    return { x: c * behavior.amplitude * decay, y: s * behavior.amplitude * decay };
  }

  if (behavior.kind === "swirl") {
    const phase = noise01(seed, id, "phase", 0, 1) * Math.PI * 2;
    const turns = behavior.turns;
    const ang = phase + (1 - u) * turns * Math.PI * 2;
    const r = behavior.radius * decay;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  }

  // jitter
  const dx = noiseSigned(seed, id, "jx", tMs, 35);
  const dy = noiseSigned(seed, id, "jy", tMs, 35);
  return { x: dx * behavior.strength * decay, y: dy * behavior.strength * decay };
}

export function liquidRadiusOffset(
  seed: number,
  index: number,
  behavior: LiquidBehavior,
  tMs: number,
  u: number,
  energy: number
): number {
  const decay = (1 - u) * energy;
  if (decay <= 0) return 0;

  const id = `b${index}`;

  // gentle “breathing” for wobble, subtle noise for others
  if (behavior.kind === "wobble") {
    const phase = noise01(seed, id, "rphase", 0, 1) * Math.PI * 2;
    const s = Math.sin((tMs / 1000) * (2 * Math.PI * behavior.frequency) + phase);
    return 0.15 * behavior.amplitude * s * decay;
  }

  const n = noiseSigned(seed, id, "rj", tMs, 20);
  return 0.2 * n * decay;
}


⸻

11) Mode hooks (procedural vs varied)

Liquid modes map cleanly:

Origin modes (same idea as converge/cascade/diagonal)
	•	originLeftBand, originTopBand, originRightBand, originRing, etc.
	•	provide startPosition

Timing modes
	•	staggered, groupStaggered, burst
	•	provide delay, duration

Size modes
	•	uniformBlobs, varySize, pulseSize
	•	provide startRadius, targetRadius

Goo style modes
	•	gooTight (high threshold, lower blur → tighter shapes)
	•	gooSoft (more blur, lower threshold → gooier)
	•	provide goo

Procedural vs Varied
	•	procedural: tight envelopes, uniform behavior, stable goo params
	•	varied: wider envelopes, per-blob behavior mix, more aggressive goo params

None of this changes the compiler. Only fields/modes.

⸻

12) What you now have

With kernel + Morphing bedrock + this doc, logo-05 becomes:
	•	deterministic transport + radius morph
	•	renderer-driven liquid cohesion
	•	scrub-safe time-noise
	•	cache-friendly targets
