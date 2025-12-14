Logo-06 Kinetic Archetype Document

This document defines everything you need (beyond the kernel) to implement logo-06-kinetic-(procedural|varied) in the new kernel.

This animation is not morphing geometry. It’s kinetic assembly:
	•	each logo part starts offscreen (random direction + distance)
	•	eases into its final pose with easeOutBack (bounce/overshoot feel)
	•	opacity ramps in
	•	then holds
	•	then exits by “flying away” radially from a scene center while spinning + fading

It includes:
	•	Spec
	•	Compiler (reference implementation shape)
	•	Renderer contract
	•	Geometry cache entries
	•	Reference helpers (small + essential)
	•	Mode hooks (procedural vs varied)

⸻

1) Archetype identity

KineticParts = animate a static scene graph by applying per-part transforms over time.

Each part i has:
	•	a stable id
	•	a static final geometry (never changes)
	•	a transform T(i,t) and opacity α(i,t) driven by phases

⸻

2) Scene spec (immutable constraints)

The scene is a set of named parts (like .logo-part elements in your HTML).

export interface KineticPartDef {
  id: string;
  node: DrawNode;          // static geometry for this part
  groupId?: number;        // optional (letters/regions)
}

export interface KineticScene {
  id: "logo-06";
  parts: readonly KineticPartDef[];

  /** Used for exit direction; defaults to bounds center */
  exitCenter?: Vec2;
}

Invariant: node geometry is static. Only transforms/opacity animate.

⸻

3) Fields (compile-time parameterization)

These replace your procedural HTML’s per-run randomization (distance, rotationRange, etc.) and per-part randomness (delay, duration, entry angle).

All fields are evaluated once (determinism boundary).

export interface KineticFields {
  // timing per part
  delay: Field<number>;       // ms (HTML: Random.range(0, 800))
  duration: Field<number>;    // ms (HTML: Random.range(600, 2000))

  // entrance initial conditions per part
  entryOffset: Field<Vec2>;   // px vector from which the part moves to (0,0)
  entryRotationDeg: Field<number>;
  entryScale: Field<number>;  // start scale (HTML: max(0.1, config.scaleRange))

  // entrance feel
  overshoot: Field<number>;   // easeOutBack parameter (HTML: config.bounceOvershoot)

  // style
  opacity?: Field<number>;    // default 1
  color?: Field<Color>;       // optional if you hue-shift parts as a mode

  // exit policy (global or per-part; most implementations use global)
  exitDistance: Field<number>;      // px (HTML: 1000 * eased)
  exitSpinDeg: Field<number>;       // deg (HTML: 360 * eased)
}


⸻

4) Phase structure

Kinetic is naturally:
	•	entrance: transforms animate toward identity (translate→0, rotate→0, scale→1), opacity ramps
	•	hold
	•	exit: translate outward from a center + rotate spin + fade out

export interface KineticPhases {
  machine: PhaseMachine; // phases: entrance → hold → exit
}

Canonical defaults (matches your HTML):
	•	entrance total: ~3500ms (your code uses totalDuration = 3500)
	•	hold: default 2000ms (URL param)
	•	exit: 250ms

You can represent this as:
	•	entrance: 3500
	•	hold: 2000
	•	exit: 250

⸻

5) Renderer contract

Renderer must be able to:
	•	place a part’s static geometry with a 2D transform
	•	apply opacity
	•	optionally apply a color override/tint (if you want hue shift)

export interface KineticRenderer {
  part(args: {
    id: string;
    content: DrawNode;        // static part geometry
    transform: Transform2D;   // translate/rotate/scale
    opacity: number;
    colorOverride?: Color;    // optional
  }): DrawNode;

  compose(rootId: string, nodes: readonly DrawNode[]): RenderTree;
}

Note: Transform2D here is whatever your kernel uses (matrix or TRS). The compiler only needs “translate/rotate/scale”.

⸻

6) Geometry cache requirements

Kinetic needs part centers (like getBBox() in HTML) for transform origins and exit directions.

Cache entries:
	1.	Part bounds/center

	•	Key: { kind: "PartBounds", sceneId, partId }
	•	Value: { bounds: Bounds; center: Vec2 }

	2.	Scene bounds/center (for default exit center)

	•	Key: { kind: "Bounds", sceneId }
	•	Value: { bounds: Bounds; center: Vec2 }

⸻

7) Spec

export interface KineticSpec {
  scene: KineticScene;
  fields: KineticFields;
  phases: KineticPhases;
  renderer: KineticRenderer;
  geom: GeometryCache;
}


⸻

8) Compiler (reference implementation shape)

Responsibilities:
	•	evaluate per-part params once
	•	per frame:
	•	sample phase
	•	compute entrance transform using easeOutBack
	•	compute exit transform radially away from exitCenter using easeInCubic
	•	compose all parts

export function compileKinetic(
  spec: KineticSpec,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const { scene, fields, phases, renderer } = spec;
  const n = scene.parts.length;

  // scene exit center: explicit or cached bounds center
  const sceneCenter = scene.exitCenter ?? spec.geom.get(
    { kind: "Bounds", sceneId: scene.id } as any,
    () => computeSceneBounds(scene) // you’ll already have this in your geometry layer
  ).center;

  // compile-time params (determinism boundary)
  const params = scene.parts.map((part, i) => {
    const delay = fields.delay(seed, i, n, env);
    const duration = fields.duration(seed, i, n, env);

    const entryOffset = fields.entryOffset(seed, i, n, env);
    const entryRot = fields.entryRotationDeg(seed, i, n, env);
    const entryScale = fields.entryScale(seed, i, n, env);

    const overshoot = fields.overshoot(seed, i, n, env);
    const opacityBase = fields.opacity ? fields.opacity(seed, i, n, env) : 1;
    const colorOverride = fields.color ? fields.color(seed, i, n, env) : undefined;

    const exitDist = fields.exitDistance(seed, i, n, env);
    const exitSpin = fields.exitSpinDeg(seed, i, n, env);

    const center = spec.geom.get(
      { kind: "PartBounds", sceneId: scene.id, partId: part.id } as any,
      () => computePartBounds(part.node)
    ).center;

    // stable exit direction: from sceneCenter → partCenter (matches HTML atan2(part.centerY-100, part.centerX-300))
    const dir = normalize({ x: center.x - sceneCenter.x, y: center.y - sceneCenter.y });

    return {
      id: part.id,
      content: part.node,
      center,
      dir,
      delay,
      duration,
      entryOffset,
      entryRot,
      entryScale,
      overshoot,
      opacityBase,
      colorOverride,
      exitDist,
      exitSpin,
    };
  });

  return {
    signal: (t, ctx) => {
      const ps = PhaseMachine.sample(phases.machine, t);

      const nodes = params.map((p) => {
        if (ps.phase === "entrance") {
          const localT = ps.tLocal - p.delay;
          const u = p.duration <= 0 ? 1 : clamp01(localT / p.duration);

          const eased = easeOutBack(u, p.overshoot);

          // Entrance transform matches HTML:
          // x = startX * (1 - eased), y = startY * (1 - eased)
          // rot = startRot * (1 - eased)
          // scale = startScale + (1 - startScale) * eased
          const tx = p.entryOffset.x * (1 - eased);
          const ty = p.entryOffset.y * (1 - eased);
          const rot = p.entryRot * (1 - eased);
          const sc = p.entryScale + (1 - p.entryScale) * eased;

          // opacity ramps in fast: min(1, progress*2)
          const op = p.opacityBase * Math.min(1, u * 2);

          return renderer.part({
            id: p.id,
            content: p.content,
            transform: trs({ x: tx, y: ty }, rot, sc, p.center),
            opacity: op,
            colorOverride: p.colorOverride,
          });
        }

        if (ps.phase === "hold") {
          return renderer.part({
            id: p.id,
            content: p.content,
            transform: trs({ x: 0, y: 0 }, 0, 1, p.center),
            opacity: p.opacityBase,
            colorOverride: p.colorOverride,
          });
        }

        // exit
        const u = clamp01(ps.u);
        const eased = easeInCubic(u);

        // Fly away from center along dir, spin, fade out
        const dist = p.exitDist * eased;
        const tx = p.dir.x * dist;
        const ty = p.dir.y * dist;
        const rot = p.exitSpin * eased;
        const op = p.opacityBase * (1 - eased);

        return renderer.part({
          id: p.id,
          content: p.content,
          transform: trs({ x: tx, y: ty }, rot, 1, p.center),
          opacity: op,
          colorOverride: p.colorOverride,
        });
      });

      return renderer.compose(scene.id, nodes);
    },

    event: () => [],
  };
}

Note: trs(translate, rotDeg, scale, originCenter) is a tiny adapter that builds your kernel’s Transform2D.

⸻

9) Reference helpers (small, required)

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

// matches your HTML: c1 = overshoot; c3 = c1+1
export function easeOutBack(t: number, overshoot: number): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function normalize(v: Vec2): Vec2 {
  const m = Math.hypot(v.x, v.y);
  return m < 1e-6 ? { x: 1, y: 0 } : { x: v.x / m, y: v.y / m };
}

/**
 * Build a transform from translate/rotate/scale about an origin.
 * This is intentionally abstract; implement with your kernel’s Transform2D/matrix.
 */
export function trs(translate: Vec2, rotDeg: number, scale: number, origin: Vec2): Transform2D {
  // translate(origin) * rotate(rot) * scale(scale) * translate(-origin) * translate(translate)
  throw new Error("trs not implemented (kernel-specific)");
}


⸻

10) Mode hooks (procedural vs varied)

This archetype composes into clean mode bundles:

Entry origin families
	•	entryRadialRandom: entryOffset chooses random direction and distance
	•	entryLeftSweep: offsets from left band
	•	entrySpiral: offsets in spiral distribution

Timing
	•	scatterDelay: random delays (0..800)
	•	tightDelay: near-linear stagger
	•	longDuration: 1200..2500 vs 600..2000

Feel
	•	bouncy: overshoot ~1.8–2.6
	•	snappy: overshoot ~0.8–1.2
	•	floaty: lower overshoot + longer duration

Exit
	•	explodeOut: large exitDistance + high spin
	•	driftOut: moderate distance + low spin

Procedural vs Varied
	•	procedural: moderate distance/rot/scale variance, coherent overshoot
	•	varied: wider distance distribution, larger rot range, more scale variance, optional per-part hue shift

Nothing changes in the compiler; only field envelopes.
