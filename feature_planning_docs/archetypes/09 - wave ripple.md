
Logo-09 Wave Ripple Archetype Document

This document defines everything you need (beyond the kernel) to implement logo-09-wave-ripple in the new kernel.

This animation is not morphing paths. It’s static geometry + time-varying displacement (a wave field) applied during rendering:
	•	entrance: logo “emerges” while ripple amplitude is high
	•	hold: low/zero amplitude subtle shimmer
	•	exit: amplitude spikes again + fade

The key idea is:

animate a deformation field over the scene, not the scene geometry itself.

It includes:
	•	Spec
	•	Compiler
	•	Renderer contract
	•	Geometry cache entries
	•	Reference helpers
	•	Mode hooks

⸻

1) Archetype identity

WaveRipple = render static scene content through a deformation:

p' = p + D(p, t)

Where D is a deterministic wave displacement field whose amplitude is phase-controlled.

Backends:
	•	SVG: often approximated via filters (turbulence/displacementMap) or pre-sampled paths
	•	Canvas/WebGL: true displacement field (ideal)

⸻

2) Scene spec (immutable constraint)

export interface RippleScene {
  id: "logo-09";
  content: DrawNode;    // static logo geometry tree
  bounds?: Bounds;
}


⸻

3) Fields (compile-time parameterization)

Evaluated once (determinism boundary).

export interface RippleFields {
  // timing
  delay?: Field<number>;
  duration: Field<number>;

  // wave field parameters (global)
  wavelength: Field<number>;      // px, e.g. 30..140
  speed: Field<number>;           // cycles/sec scale, e.g. 0.6..2.5
  amplitude: Field<number>;       // px max displacement, e.g. 4..25

  // direction / origin
  direction: Field<Vec2>;         // normalized direction of propagation
  origin?: Field<Vec2>;           // for radial waves (optional)

  // style
  opacity?: Field<number>;
  tint?: Field<Color>;            // optional overlay

  // “texture” (varied)
  secondaryWave?: Field<{
    amplitude: number;
    wavelength: number;
    speed: number;
    direction: Vec2;
  }>;
}


⸻

4) Phase structure

export interface RipplePhases {
  machine: PhaseMachine;

  /** Map phase sample → reveal progress (0..1) if you want an entrance reveal */
  reveal?: (sample: { phase: string; u: number; uRaw: number }) => number;

  /** Map phase sample → amplitude multiplier (0..1..>1) */
  ampMul: (sample: { phase: string; u: number; uRaw: number }) => number;

  /** Optional exit */
  exit?: (sample: { phase: string; u: number; uRaw: number }) => {
    opacityMul?: number;
  };
}

Canonical feel:
	•	entrance: ampMul decays from 1 → 0.2 while reveal rises
	•	hold: ampMul ~ 0.05–0.15 (subtle shimmer) or 0
	•	exit: ampMul spikes to ~1–2 then fades; opacity fades out

⸻

5) Renderer contract

This archetype needs a renderer that can apply a deformation field to content.

Because different backends do this differently, keep the contract declarative:

export interface RippleField {
  kind: "directional" | "radial";

  amplitudePx: number;
  wavelengthPx: number;
  speed: number;          // cycles/sec-ish scalar
  direction?: Vec2;       // directional wave
  origin?: Vec2;          // radial wave

  // optional second layer
  secondary?: {
    amplitudePx: number;
    wavelengthPx: number;
    speed: number;
    direction: Vec2;
  };
}

export interface RippleRenderer {
  /**
   * Render content under a ripple deformation field.
   * Backend decides whether that means:
   * - shader displacement
   * - filter displacement map
   * - CPU resampling (rare)
   */
  rippled(args: {
    id: string;
    content: DrawNode;
    field: RippleField;
    opacity: number;
    tint?: Color;

    /** Optional reveal mask (if you combine ripple + reveal) */
    reveal?: number;
  }): DrawNode;

  compose(rootId: string, node: DrawNode): RenderTree;
}


⸻

6) Geometry cache requirements

Wave ripple doesn’t require heavy geometry caching, but two caches are useful:
	1.	{ kind: "Bounds", sceneId } → bounds + center
	2.	Optional backend-specific prep:
	•	{ kind: "DisplacementMesh", sceneId, resolution } (WebGL)
	•	{ kind: "FilterNodes", sceneId, fieldSignature } (SVG filters)

Your kernel cache just stores opaque values keyed by deterministic signatures.

⸻

7) Spec

export interface RippleSpec {
  scene: RippleScene;
  fields: RippleFields;
  phases: RipplePhases;
  renderer: RippleRenderer;
  geom: GeometryCache;
}


⸻

8) Compiler (reference implementation shape)

Responsibilities:
	•	evaluate fields once
	•	per frame:
	•	phase sample
	•	compute local progress
	•	compute amplitude multiplier
	•	build RippleField
	•	call renderer.rippled

export function compileWaveRipple(
  spec: RippleSpec,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const { scene, fields, phases, renderer, geom } = spec;

  const bc = geom.get(
    { kind: "Bounds", sceneId: scene.id } as any,
    () => computeBounds(scene.content)
  );

  // compile-time params (determinism boundary)
  const delay = fields.delay ? fields.delay(seed, 0, 1, env) : 0;
  const duration = fields.duration(seed, 0, 1, env);

  const wavelength = fields.wavelength(seed, 0, 1, env);
  const speed = fields.speed(seed, 0, 1, env);
  const amp = fields.amplitude(seed, 0, 1, env);

  const dirRaw = fields.direction(seed, 0, 1, env);
  const direction = normalize(dirRaw);

  const origin = fields.origin ? fields.origin(seed, 0, 1, env) : bc.center;

  const opacityBase = fields.opacity ? fields.opacity(seed, 0, 1, env) : 1;
  const tint = fields.tint ? fields.tint(seed, 0, 1, env) : undefined;

  const secondary = fields.secondaryWave ? fields.secondaryWave(seed, 0, 1, env) : undefined;

  return {
    signal: (t, ctx) => {
      const ps = PhaseMachine.sample(phases.machine, t);

      const localT = ps.tLocal - delay;
      const uLocal = duration <= 0 ? 1 : clamp01(localT / duration);

      const ampMul = phases.ampMul({ phase: ps.phase, u: uLocal, uRaw: uLocal });
      const exit = phases.exit ? phases.exit({ phase: ps.phase, u: uLocal, uRaw: uLocal }) : undefined;

      const reveal = phases.reveal ? phases.reveal({ phase: ps.phase, u: uLocal, uRaw: uLocal }) : undefined;

      const field: RippleField = {
        kind: fields.origin ? "radial" : "directional",
        amplitudePx: amp * ampMul,
        wavelengthPx: wavelength,
        speed,
        direction: fields.origin ? undefined : direction,
        origin: fields.origin ? origin : undefined,
        secondary: secondary
          ? {
              amplitudePx: secondary.amplitude * ampMul,
              wavelengthPx: secondary.wavelength,
              speed: secondary.speed,
              direction: normalize(secondary.direction),
            }
          : undefined,
      };

      const node = renderer.rippled({
        id: `${scene.id}-ripple`,
        content: scene.content,
        field,
        opacity: clamp01(opacityBase * (exit?.opacityMul ?? 1)),
        tint,
        reveal,
      });

      return renderer.compose(scene.id, node);
    },

    event: () => [],
  };
}


⸻

9) Reference helpers (small, required)

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function normalize(v: Vec2): Vec2 {
  const m = Math.hypot(v.x, v.y);
  return m < 1e-6 ? { x: 1, y: 0 } : { x: v.x / m, y: v.y / m };
}

Example phase amplitude policy (good default)

export function defaultRippleAmpMul(sample: { phase: string; u: number }): number {
  if (sample.phase === "entrance") {
    // strong → subtle
    return 0.2 + 0.8 * (1 - sample.u);
  }
  if (sample.phase === "hold") {
    return 0.08; // shimmer
  }
  if (sample.phase === "exit") {
    // spike then fade
    const k = 1 - sample.u;
    return 1.4 * k;
  }
  return 0;
}


⸻

10) Mode hooks (procedural vs varied)

Field modes
	•	rippleSoft: low amplitude, long wavelength
	•	rippleChoppy: higher amplitude, short wavelength
	•	rippleFast: higher speed
	•	rippleDiagonal: direction = normalize(1,1)
	•	rippleRadial: origin = center or corner

Procedural vs Varied
	•	procedural: one wave layer, stable params, small shimmer in hold
	•	varied: secondaryWave enabled, wider amplitude/wavelength variance, occasional radial origin shift (still compile-time)

No compiler changes; only field envelopes.

⸻

If you say next, I’ll do logo-10 typewriter next in the same format.