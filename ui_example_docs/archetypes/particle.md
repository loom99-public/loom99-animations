Perfect. Below is a canonical Particles Spec written as TypeScript interfaces + function signatures, at exactly the level you asked for:
	•	no kernel rehash
	•	no implementation
	•	enough structure that you can fill it in correctly
	•	matches the abstractions you’ve already settled on

Think of this as the header file for the Particles archetype.

⸻

1. Semantic intent (one sentence, encoded)

Deterministic transport of many simple elements toward fixed geometric targets, with optional bounded perturbations and phase-dependent behavior.

Everything below enforces that.

⸻

2. Scene (hard constraints, no behavior)

/** Immutable description of what must exist at rest */
export interface ParticlesScene {
  /** Stable identity for the scene */
  id: string;

  /** Target positions that define the assembled logo/text */
  targets: readonly Vec2[];

  /** Optional grouping (letters, strokes, regions) */
  groups?: readonly number[]; // index → groupId
}

Notes:
	•	targets.length === particleCount
	•	This is the constraint: at full progress, particles must land here

⸻

3. Per-particle fields (compile-time parameterization)

export interface ParticlesFields {
  /** Where particles originate */
  startPosition: Field<Vec2>;

  /** Temporal coordination */
  delay: Field<number>;
  duration: Field<number>;

  /** Visual attributes */
  radius: Field<number>;
  color: Field<Color>;
  opacity?: Field<number>;

  /** Motion modulation */
  behavior?: Field<ParticleBehavior>;
}

Important:
	•	All randomness lives inside these fields
	•	Procedural vs Varied = different field implementations

⸻

4. Behavior modes (closed set)

export type ParticleBehavior =
  | { kind: "none" }
  | { kind: "spiral"; turns: number; radius: number }
  | { kind: "wave"; amplitude: number; frequency: number }
  | { kind: "jitter"; strength: number };

Notes:
	•	Behaviors must be:
	•	bounded
	•	deterministic
	•	converge to zero at rest

⸻

5. Trajectory (the reusable motion law)

export interface ParticleTrajectory {
  /**
   * Compute particle position at normalized progress u ∈ [0,1]
   * u is already eased and phase-adjusted
   */
  position(
    u: number,
    start: Vec2,
    target: Vec2,
    behavior: ParticleBehavior,
    index: number
  ): Vec2;

  /**
   * Optional opacity modulation (defaults to 1)
   */
  opacity?(
    u: number,
    baseOpacity: number,
    behavior: ParticleBehavior
  ): number;
}

Key property:
	•	No timing
	•	No randomness
	•	No phase logic
	•	Pure geometry math only

⸻

6. Phase structure (policy, not logic)

export interface ParticlesPhases {
  entrance: {
    duration: number;
    ease: Ease;
    behaviorActive: boolean;
  };

  hold?: {
    duration: number;
    drift?: boolean;
  };

  exit?: {
    duration: number;
    reverse?: boolean;
  };
}

Notes:
	•	Exit may reuse the same trajectory in reverse
	•	Hold usually freezes position

⸻

7. Renderer contract (backend-agnostic)

export interface ParticleRenderSpec {
  /** How a single particle is represented visually */
  makeNode(
    id: string,
    position: Vec2,
    radius: number,
    color: Color,
    opacity: number
  ): DrawNode;
}

Notes:
	•	SVG, Canvas, WebGL are all possible interpreters
	•	Kernel doesn’t care

⸻

8. The canonical Particles Spec (everything together)

export interface ParticlesSpec {
  scene: ParticlesScene;
  fields: ParticlesFields;
  trajectory: ParticleTrajectory;
  phases: ParticlesPhases;
  renderer: ParticleRenderSpec;
}

This is the single object that defines any particle animation.

⸻

9. Compiler signature (what turns spec → animation)

export function compileParticles(
  spec: ParticlesSpec,
  seed: Seed,
  env: Env
): Animation;

Guarantees:
	•	Deterministic
	•	Scrubbable (entrance at least)
	•	No hidden state

⸻

10. What this buys you (sanity check)

With this spec you can express:
	•	logo-02 particles
	•	text-02 particles
	•	dissolve / assemble
	•	scatter / reform
	•	background dust effects

By changing only:
	•	scene.targets
	•	field variance envelopes
	•	behavior selection

No new animation logic.

# Preset

Great. Here is #1: concrete ParticlesFields presets, done cleanly, high-level, and faithful to your existing animations — but still abstract enough that you can fill in the details yourself without fighting the design later.

No implementation bodies, no kernel restatement.

⸻

Canonical Particles Field Presets

The goal here is to show how Procedural vs Varied (and future styles) emerge purely from field composition and variance envelopes.

⸻

1. Baseline: Shared structural assumption

All presets assume:
	•	particleCount === scene.targets.length
	•	Fields are evaluated once at compile time
	•	No runtime randomness
	•	Identity = array index

We’ll define presets as pure data, not code branches.

⸻

2. Minimal base preset (no variance)

This is the “Platonic” particles animation — useful as a reference and for testing.

export interface BaseParticlesPreset {
  startPosition: Field<Vec2>;
  delay: Field<number>;
  duration: Field<number>;
  radius: Field<number>;
  color: Field<Color>;
  behavior: Field<ParticleBehavior>;
}

Example intent (not code):
	•	all particles start from same region
	•	uniform timing
	•	no perturbation

⸻

3. Procedural preset (structured randomness)

Procedural = randomness is present, but tightly structured and intentional.
You can still “feel” the design.

export interface ProceduralParticlesPreset {
  /** Start positions sampled from a coherent region */
  startPosition: Field<Vec2>;

  /** Linear stagger with slight jitter */
  delay: Field<number>;

  /** Per-particle duration with bounded variance */
  duration: Field<number>;

  /** Small radius variance */
  radius: Field<number>;

  /** Palette-based color assignment */
  color: Field<Color>;

  /** Single dominant behavior mode */
  behavior: Field<ParticleBehavior>;
}

Conceptual characteristics:
	•	particles clearly flow toward the logo
	•	stagger is readable
	•	motion feels authored, not chaotic
	•	behavior usually uniform (e.g. “spiral for everyone”)

This corresponds to your logo-02-particles-procedural style.

⸻

4. Varied preset (variance-forward)

Varied = same structure, but variance is part of the identity.
Still cohesive, but visibly different on every run.

export interface VariedParticlesPreset {
  /** Wider origin region or multiple origin regions */
  startPosition: Field<Vec2>;

  /** Stagger with significant per-index variance */
  delay: Field<number>;

  /** Duration with wide spread */
  duration: Field<number>;

  /** Noticeable size variation */
  radius: Field<number>;

  /** Hue-shifted or per-particle color variance */
  color: Field<Color>;

  /** Behavior chosen per-particle */
  behavior: Field<ParticleBehavior>;
}

Conceptual characteristics:
	•	assembly still happens
	•	but paths differ visibly
	•	behavior can mix (spiral + wave + none)
	•	feels more “alive”

This matches logo-02-particles-varied.

⸻

5. Field construction patterns (important, but abstract)

These presets are not hardcoded. They are composed from patterns like:
	•	Spatial fields
	•	region sampling
	•	radial distributions
	•	off-screen bands
	•	Temporal fields
	•	linear stagger
	•	stagger + jitter
	•	grouped delays
	•	Visual fields
	•	palette pick
	•	palette + hue shift
	•	Behavior fields
	•	constant
	•	weighted random pick

You already have all the primitives for this in your kernel.

⸻

6. Optional: grouping-aware preset

This becomes useful for text vs logo particles.

export interface GroupedParticlesPreset extends ProceduralParticlesPreset {
  /** Group-aware delay or behavior */
  delay: Field<number>;      // group-based staggering
  behavior: Field<ParticleBehavior>; // group-based behavior
}

This lets:
	•	letters assemble independently
	•	strokes ripple in sequence
	•	groups feel intentional without explicit orchestration

⸻

7. How presets plug into the canonical spec

const particlesSpec: ParticlesSpec = {
  scene,
  fields: proceduralPreset, // or variedPreset
  trajectory,
  phases,
  renderer,
};

No branching.
No flags.
No animation-specific logic.

⸻

8. Sanity check (design integrity)

If you ever feel tempted to add:
	•	if (procedural) { … }
	•	mode === "varied"

That means:
👉 the field abstraction is being violated.

Presets must remain data-only.

# Reference Particle Trajectory

Excellent. Here is #2: a minimal, canonical ParticleTrajectory, written as a semantic reference with clear contracts, no kernel restatement, and just enough math to be unambiguous.

Think of this as the “physics textbook” for particles — simple, reusable, and correct.

⸻

Canonical ParticleTrajectory (Reference Design)

1. Design intent (locked in)

A ParticleTrajectory must:
	•	be pure
	•	be deterministic
	•	depend only on:
	•	normalized progress u ∈ [0,1]
	•	start position
	•	target position
	•	a behavior descriptor
	•	converge exactly:

position(u=1) === target


	•	never overshoot unless explicitly encoded

No timing.
No easing.
No randomness.

⸻

2. Core trajectory: transport spine

All particle motion is built on one invariant spine:

base(u) = lerp(start, target, u)

This is non-negotiable — everything else is additive and bounded.

⸻

3. Behavior offset contract

Behaviors contribute an offset that:
	•	is zero at u = 1
	•	is usually zero at u = 0
	•	is bounded
	•	is orthogonal to the base trajectory

Formalized as:

offset(u, behavior, index) → Vec2

Final position:

position(u) = base(u) + offset(u)


⸻

4. Canonical behavior definitions

4.1 No behavior

offset(u) = (0, 0)

Baseline case. Useful for testing and composability.

⸻

4.2 Spiral (most common)

Semantic intent: particles arc gracefully into place.

angle(u)  = 2π * turns * (1 - u)
radius(u) = maxRadius * (1 - u)

offset(u) = rotate( angle(u), normalize(target - start) ⟂ ) * radius(u)

Properties:
	•	strongest at start
	•	guaranteed convergence
	•	visually readable

⸻

4.3 Wave (lateral oscillation)

Semantic intent: particles wobble as they travel.

phase = index * phaseStride
offset(u) =
  normal(target - start)
  * amplitude
  * sin(2π * frequency * u + phase)
  * (1 - u)

Properties:
	•	coherent motion
	•	index-based phase prevents clumping
	•	naturally decays

⸻

4.4 Jitter (noise, but disciplined)

Semantic intent: subtle life, not chaos.

noiseDir = unitVectorFromSeed(index)
offset(u) = noiseDir * strength * (1 - u)

Important:
	•	direction must be seeded at compile time
	•	never sample noise at runtime

⸻

5. Opacity modulation (optional but common)

Opacity should usually follow:

opacity(u) = min(1, u * k)

Or for effects:

opacity(u) = smoothstep(0, 0.2, u)

Rule:
	•	opacity is a function of u
	•	never depends on absolute time

⸻

6. Minimal formal interface (recap)

export interface ParticleTrajectory {
  position(
    u: number,
    start: Vec2,
    target: Vec2,
    behavior: ParticleBehavior,
    index: number
  ): Vec2;

  opacity?(
    u: number,
    baseOpacity: number,
    behavior: ParticleBehavior
  ): number;
}

That’s it.
No more.
No less.

⸻

7. Why this is “canonical”

This trajectory:
	•	subsumes:
	•	logo-02
	•	text-02
	•	dissolve / assemble
	•	composes cleanly with:
	•	staggered clocks
	•	phase machines
	•	generalizes to:
	•	liquid blobs (replace particles with circles)
	•	soft-body approximations
	•	preserves scrubbability

If you ever feel like adding:
	•	velocity state
	•	integrators
	•	per-frame randomness

you’ve left the Particles archetype and entered a different one.



# 