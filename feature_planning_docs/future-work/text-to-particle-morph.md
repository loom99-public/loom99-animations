Yep — that’s not only possible, it’s kind of the perfect demo for your kernel: same “meaning” (targets) + different “representation” (particles vs text), with clean reversibility + scrubbing.

Here’s the clean way to do it without wrecking the elegance.

The key idea: Text is just a Target Field

You want a textbox where arbitrary text “just works”. That means:
	1.	TextLayout turns (string, font settings, box) into glyph outlines
	2.	A TargetSampler turns glyph outlines into a stable list of target points
	3.	Particles animate by transporting toward those targets
	4.	“Back into particles” is just swapping the target field back to a “cloud” distribution

So the only thing that changes is: what the particles’ target positions are.

⸻

Architecture that stays pure

1) Make “Targets” a first-class Scene primitive

interface TargetScene {
  id: string;
  targets: readonly Vec2[];
  groups?: readonly number[]; // optional: glyph/word/line ids for staggering
  bounds?: Bounds;
}

2) TextBox → TargetScene (scene derivation step)

A deterministic pipeline:

TextSpec = { text, fontFamily, fontSize, letterSpacing, align, box, seed? }

TextSceneDeriver(TextSpec) -> TargetScene
  - layout glyphs (Font -> glyph paths)
  - union/collect outlines
  - sample points with deterministic sampler (blue-noise-ish or uniform arc-length)
  - assign group IDs (glyph index)

Determinism rule: given same TextSpec + seed, you get the same target list ordering.

That ordering is your “identity/continuity” anchor.

3) Particles program uses a Target Provider

Instead of hardwiring scene.targets, you compile particles against:

type TargetProvider = (t: number) => TargetScene;

But to keep it scrub-safe, do not generate targets from t. Instead:
	•	targets are keyed by TextSpec hash and cached
	•	transitions between providers are handled by a crossfade scene (below)

4) Particle ↔ Text is a Scene-to-Scene morph (same archetype!)

You can do this with no new archetype by adding one layer:

Transport between two target sets:
	•	start targets: “cloud”
	•	end targets: “text targets”

That’s literally a morph in target-space:

target(u) = lerp(targetA[i], targetB[i], u)

and particles transport toward target(u).

This is what makes “into text, back into particles” feel magical and reversible.

⸻

The only hard part: matching counts + stable correspondence

Text length changes → target count changes.

You have three robust options:

Option A (best UX): Fix particle count globally

Pick N (e.g., 1200). Always have exactly N particles.
	•	If text sampling yields M points:
	•	if M < N: repeat targets (or assign multiple particles per target with tiny offsets)
	•	if M > N: downsample deterministically

This guarantees continuity: particle i always exists.

Option B: Variable count with pooling

Harder, more edge cases. Not worth it for “toy system”.

Option C: Hybrid (per-word groups)

Still keep fixed N, but distribute per glyph group for nicer ordering.

I’d do Option A.

⸻

What the UI looks like (and why it won’t break)

A single unified interface can expose this as drag-drop blocks:

TextBox Block
	•	text input
	•	font selector
	•	size
	•	alignment
	•	density slider (points per glyph area)
	•	“seed”

Outputs: TargetScene

Particle Cloud Block
	•	region (box/circle/ring)
	•	spread
	•	seed

Outputs: TargetScene

Target Morph Block
	•	input A: TargetScene
	•	input B: TargetScene
	•	progress: driven by PhaseMachine / track

Outputs: blended TargetScene

Particles Archetype Block
	•	takes TargetScene as its scene constraint
	•	startPosition field can be independent (or derived from previous target)

Then the user literally wires:
CloudTargets -> TargetMorph(A)
TextTargets -> TargetMorph(B)
TargetMorph -> Particles

And “back into particles” is just reversing the morph progress or swapping A/B.

Nothing breaks because every block has total functions, and the count is fixed.

⸻

Practical implementation notes (so it actually works in browser)

To get arbitrary text outlines reliably you’ll want one of:
	•	opentype.js to load fonts and get glyph paths (common choice)
	•	or native Canvas text metrics + an SDF approach (harder)
	•	or SVG <text> → path conversion (annoying, inconsistent)

For a toy system, opentype.js is the cleanest.

Then sampling:
	•	Convert path to polylines (flatten curves)
	•	Do deterministic sampling by arc length
	•	Optional: blue-noise relax iteration (still deterministic via seed)

Cache:
	•	key = hash(text + font + size + box + density + seed)
	•	value = targets[] + groups[] + bounds

⸻

What you get “for free” from your kernel philosophy
	•	Scrubbing: target morph is just another curve in state-space
	•	Reversibility: set progress from 0→1 or 1→0
	•	Coordination: groups let you stagger by glyph/word without special code
	•	Modes: “wipe-in text” is a mode that changes delay field to be grouped left→right

⸻

If you want, I can write the concrete spec docs for the new “TextTargetScene derivation + TargetMorph adapter” in the same format as the logos, including:
	•	interfaces
	•	cache keys
	•	sampling strategy
	•	the tiny compiler shim that lets Particles consume dynamic/blended targets

Just say “do it” and tell me your preferred fixed particle count N (or I’ll assume 1200).

Text Targets + Target Morph — Concrete Spec Document

This document specifies the exact kernel-facing pieces you need to support:
	1.	A TextBox that turns arbitrary text into a TargetScene (points + groups)
	2.	A TargetMorph adapter that blends cloud targets ↔ text targets deterministically
	3.	A Particles program that consumes a TargetScene (or a TargetProvider) without losing scrubbability

This is designed so that:
	•	particle i is stable across time and edits (as much as possible)
	•	count is fixed (recommended) so nothing “pops”
	•	everything is cacheable and deterministic

⸻

0) Core decision: fixed particle count

This spec assumes a fixed global particle count N.

export interface TargetCountPolicy {
  kind: "fixed";
  N: number; // e.g. 1200
}

If the sampled text yields M points, you remap to exactly N using a deterministic policy (defined below).

⸻

1) Canonical scene type: TargetScene

This is the interchange format between TextBox, Cloud, Morph, Particles, Liquid, etc.

export interface TargetScene {
  id: string;

  /** Stable index-space targets, length === N */
  targets: readonly Vec2[];

  /** Optional grouping of each target (glyph index, word index, line index, etc.) */
  groups?: readonly number[]; // length === N

  /** Optional metadata */
  bounds?: Bounds;
  meta?: Record<string, unknown>;
}

Invariants
	•	targets.length === N (fixed policy)
	•	target ordering is stable given same inputs + seed

⸻

2) TextBox → TargetScene (scene derivation spec)

2.1 User-facing text input spec

export interface TextBoxSpec {
  id: string;

  text: string;

  font: {
    family: string;          // e.g. "Inter"
    weight?: number;         // 100..900
    style?: "normal" | "italic";
    sizePx: number;          // font size
    letterSpacingPx?: number;
    lineHeightPx?: number;
  };

  box: {
    x: number;
    y: number;
    w: number;
    h: number;
    align?: "left" | "center" | "right";
    valign?: "top" | "middle" | "bottom";
    wrap?: boolean;
  };

  /** How dense the targets should be (independent of N remap) */
  sampling: {
    density: number;         // points per “px of perimeter” or a dimensionless knob (see sampler)
    method?: "arc" | "blueNoise";
  };

  /** Determinism */
  seed: Seed;

  /** Fixed particle count */
  countPolicy: TargetCountPolicy;
}

2.2 Derived geometry product (cached)

The derivation happens in 3 stages:
	1.	layout → glyph runs
	2.	glyph outlines → polylines (flatten)
	3.	polylines → raw points + grouping → remap to N

Define the cached intermediate:

export interface TextOutlineGeometry {
  glyphs: readonly {
    glyphIndex: number;
    outline: PolylineSet; // flattened outline
    bounds: Bounds;
  }[];

  bounds: Bounds;
}

2.3 Deriver contract

export interface TextTargetDeriver {
  derive(spec: TextBoxSpec, cache: GeometryCache): TargetScene;
}

Determinism requirement
	•	derive() must be a pure function of spec (including seed)
	•	No RNG during render-time; all randomness happens during derivation

⸻

3) Cloud Targets (source scene)

To “be particles first”, you also need a cloud target scene generator.

export interface CloudSpec {
  id: string;

  region:
    | { kind: "rect"; x: number; y: number; w: number; h: number }
    | { kind: "circle"; cx: number; cy: number; r: number }
    | { kind: "ring"; cx: number; cy: number; r0: number; r1: number };

  seed: Seed;
  countPolicy: TargetCountPolicy;

  /** Optional grouping (e.g. radial bands) */
  grouping?: "none" | "radialBands" | "grid";
}

export interface CloudTargetDeriver {
  derive(spec: CloudSpec, cache: GeometryCache): TargetScene;
}


⸻

4) TargetMorph adapter (scene-to-scene morph)

This is the bridge that makes:

particles → text → particles

…a reversible, scrubbable, single archetype experience.

4.1 Spec

export interface TargetMorphSpec {
  id: string;

  /** Two target scenes with same N */
  a: TargetScene;
  b: TargetScene;

  /** Morph progress in [0,1] */
  u: number;

  /**
   * Optional: blend groups.
   * Default: pick b.groups when u > 0.5 else a.groups
   */
  groupBlend?: "step" | "a" | "b";
}

4.2 Output

export function morphTargets(spec: TargetMorphSpec): TargetScene {
  const { a, b, u } = spec;
  const t = clamp01(u);

  // invariant: same length
  const N = a.targets.length;
  // (if not, this is a spec error; do not try to “fix” at runtime)

  const targets = new Array<Vec2>(N);
  for (let i = 0; i < N; i++) {
    targets[i] = lerp(a.targets[i]!, b.targets[i]!, t);
  }

  const groups =
    spec.groupBlend === "a" ? a.groups :
    spec.groupBlend === "b" ? b.groups :
    (t > 0.5 ? b.groups : a.groups);

  return {
    id: spec.id,
    targets,
    groups: groups ?? undefined,
    bounds: lerpBounds(a.bounds, b.bounds, t),
    meta: { kind: "TargetMorph", a: a.id, b: b.id },
  };
}


⸻

5) How Particles consume TargetScene

You already have a Particles archetype. The only change is:

5.1 ParticlesScene becomes TargetScene

Particles “scene” is now:

export type ParticlesScene = TargetScene;

So your particles compiler uses:
	•	scene.targets[i] as target positions
	•	scene.groups[i] for ordering/stagger if desired

5.2 Option: TargetProvider (optional, but useful)

If you want to wire blocks and have a scene produced from other blocks every frame, you can use a provider, but it must remain deterministic and cacheable.

export type TargetProvider = (tMs: number) => TargetScene;

Rule: a provider must only depend on:
	•	phase sample / u
	•	cached scenes
	•	pure transforms

It must not do layout/sampling per frame.

In practice, TargetProvider is just:
	•	morphTargets({a, b, u(t)})

⸻

6) Remapping raw sampled points to fixed N

This is the most important piece to make “arbitrary text” stable.

6.1 Remap policy

export interface RemapToFixedCount {
  kind: "fixed";
  N: number;

  /** Determines how raw points map to [0..N) */
  strategy: "repeat" | "resampleArc" | "blueNoiseSelect";

  /** Optional micro-jitter when repeating to avoid exact overlap */
  repeatJitterPx?: number;
}

6.2 Reference: repeat strategy (robust, simple)

If raw.length = M and you need N:
	•	If M >= N: pick N points deterministically via striding + seed permutation
	•	If M < N: repeat points deterministically and apply tiny deterministic jitter

export function remapToN(raw: readonly Vec2[], N: number, seed: Seed, jitterPx = 0): Vec2[] {
  const M = raw.length;
  const out = new Array<Vec2>(N);

  if (M === 0) {
    // fallback: all zeros (caller should avoid this; text empty)
    for (let i = 0; i < N; i++) out[i] = { x: 0, y: 0 };
    return out;
  }

  if (M >= N) {
    // deterministic downsample
    for (let i = 0; i < N; i++) {
      const j = Math.floor((i * M) / N);
      out[i] = raw[permuteIndex(j, M, seed)]!;
    }
    return out;
  }

  // M < N: repeat
  for (let i = 0; i < N; i++) {
    const j = i % M;
    const p = raw[j]!;
    if (jitterPx <= 0) out[i] = p;
    else {
      const dx = (hashSigned(seed, "jx", i) * jitterPx);
      const dy = (hashSigned(seed, "jy", i) * jitterPx);
      out[i] = { x: p.x + dx, y: p.y + dy };
    }
  }
  return out;
}

Why this is “pure enough”
	•	correspondence is stable under scrubbing
	•	small edits to text will change raw points, but the remap remains deterministic
	•	fixed N means particle identity doesn’t disappear

⸻

7) Grouping rules for text targets

To get nice stagger and coordination, targets should carry group IDs.

Minimum viable grouping:
	•	groups[i] = glyphIndex for the glyph that produced that point

When you remap to N:
	•	carry groups along with points
	•	when repeating, repeat groups too

export function remapGroupsToN(rawGroups: readonly number[], N: number): number[] {
  const M = rawGroups.length;
  const out = new Array<number>(N);
  for (let i = 0; i < N; i++) out[i] = rawGroups[i % M] ?? 0;
  return out;
}


⸻

8) Geometry cache keys (concrete)

You should cache text derivation aggressively. Here are the canonical keys:

export type TextGeomKey =
  | { kind: "TextLayout"; key: string }            // shaped glyph positions
  | { kind: "TextOutlines"; key: string }          // flattened polylines per glyph
  | { kind: "TextRawPoints"; key: string }         // raw sampled points + groups
  | { kind: "TextTargetScene"; key: string };      // final TargetScene (length N)

Where key is a stable hash of:
	•	text
	•	font fields
	•	box fields
	•	sampling density/method
	•	seed
	•	N (count policy)

Same for cloud:

export type CloudGeomKey =
  | { kind: "CloudTargetScene"; key: string };


⸻

9) Reference helper set (required)

These are the minimal utilities this system needs:

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
export function lerpBounds(a?: Bounds, b?: Bounds, t = 0): Bounds | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    min: lerp(a.min, b.min, t),
    max: lerp(a.max, b.max, t),
  };
}
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}
export function hash01(seed: number, tag: string, i: number): number {
  const h = hash32(`${seed}|${tag}|${i}`);
  return (h >>> 0) / 0xffffffff;
}
export function hashSigned(seed: number, tag: string, i: number): number {
  return hash01(seed, tag, i) * 2 - 1;
}
export function permuteIndex(i: number, mod: number, seed: number): number {
  // cheap permutation; replace with better if desired
  const r = hash32(`${seed}|perm|${i}`);
  const j = (i + (r >>> 0)) % mod;
  return j;
}


⸻

10) What you can build immediately from this spec

A) Particles → Text (one slider)
	•	cloud = CloudTargetDeriver.derive(...)
	•	text = TextTargetDeriver.derive(...)
	•	blend = morphTargets({a: cloud, b: text, u})
	•	particles(scene = blend)

B) Text → Particles (reverse slider)
	•	set u = 1 - slider

C) Editable textbox live
	•	editing text changes the cached TextTargetScene
	•	the rest remains unchanged
	•	fixed N prevents popping identities

⸻

If you want, the next concrete document I’d write is the TextTargetDeriver implementation spec (layout → outline flatten → sampling), including how to plug in opentype.js cleanly while staying deterministic.