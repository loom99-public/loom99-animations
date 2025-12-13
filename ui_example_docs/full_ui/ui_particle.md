Perfect. Here is #3: UI mapping for Particles, done at the same level of concreteness as #1 and #2:
	•	not code
	•	not theory
	•	directly actionable
	•	respects purity (UI never mutates animation logic)

⸻

Particles — Canonical UI Mapping

1. Core principle (non-negotiable)

The UI does not control animation behavior directly.
It controls field parameters and variance envelopes, which are then compiled into fields.

The UI edits data, never logic.

⸻

2. UI → Field mapping model

The UI operates on three layers:
	1.	Intent layer (what the user thinks they’re changing)
	2.	Parameter layer (numbers, enums, ranges)
	3.	Field layer (actual Field<T> implementations)

Only layer (2) is mutable at runtime.

⸻

3. Canonical UI groups for Particles

A. Origin / Spawn

User mental model: “Where do particles come from?”

UI controls:
	•	Origin type:
	•	Point
	•	Line
	•	Box
	•	Circle
	•	Offscreen
	•	Spread / radius
	•	Direction bias (optional)

Maps to:

startPosition: Field<Vec2>

Important:
	•	UI edits region parameters
	•	Field samples region deterministically using seed

⸻

B. Timing / Coordination

User mental model: “How does the assembly unfold?”

UI controls:
	•	Global duration
	•	Stagger amount
	•	Stagger randomness
	•	Global delay

Maps to:

delay: Field<number>
duration: Field<number>

Notes:
	•	“Stagger randomness” modifies the variance envelope, not the base law
	•	UI never introduces per-frame timing

⸻

C. Size & Density

User mental model: “How heavy / fine is it?”

UI controls:
	•	Base particle size
	•	Size variance
	•	Optional size ramp (in/out)

Maps to:

radius: Field<number>

Optional:
	•	radius may depend on index or group

⸻

D. Color & Glow

User mental model: “What’s the look?”

UI controls:
	•	Palette selection
	•	Hue shift
	•	Saturation shift
	•	Glow strength
	•	Glow variance

Maps to:

color: Field<Color>

Important:
	•	Palette choice is discrete
	•	Variance is continuous
	•	Color identity stays stable per particle

⸻

E. Motion Character (Behavior)

User mental model: “How alive is the motion?”

UI controls:
	•	Behavior mode:
	•	None
	•	Spiral
	•	Wave
	•	Jitter
	•	Strength
	•	Frequency / turns
	•	Behavior variance

Maps to:

behavior: Field<ParticleBehavior>

Key rule:
	•	Behavior selection can be:
	•	uniform
	•	weighted random
	•	group-based
	•	But is always decided at compile time

⸻

4. Phase controls (global, simple)

User mental model: “How long does it live?”

UI controls:
	•	Entrance duration
	•	Hold duration
	•	Exit on/off
	•	Reverse exit toggle

Maps to:

phases: ParticlesPhases

Important:
	•	Phase structure is shallow
	•	UI should not expose arbitrary state machines here

⸻

5. Procedural vs Varied toggle (important insight)

This is not a mode switch in animation logic.

UI toggle does exactly this:

Toggle	Effect
Procedural	Tight variance envelopes
Varied	Wide variance envelopes

Nothing else changes.

This keeps the system honest.

⸻

6. UI state → Spec pipeline

The full flow is:

UI State
  ↓
Parameter Object (plain JSON)
  ↓
Field Builder (pure function)
  ↓
ParticlesSpec
  ↓
compileParticles(...)

UI never touches:
	•	trajectory
	•	renderer
	•	kernel primitives

⸻

7. Canonical UI parameter shape (example)

interface ParticlesUIParams {
  origin: {
    type: "point" | "box" | "circle" | "offscreen";
    spread: number;
  };

  timing: {
    duration: number;
    stagger: number;
    staggerVariance: number;
  };

  size: {
    base: number;
    variance: number;
  };

  color: {
    palette: string;
    hueShift: number;
    variance: number;
  };

  behavior: {
    kind: "none" | "spiral" | "wave" | "jitter";
    strength: number;
    variance: number;
  };

  phases: {
    hold: number;
    exit: boolean;
  };
}

This is not the spec — it’s the editor contract.

⸻

8. Why this UI model scales

With this structure you can later:
	•	add presets without branching logic
	•	serialize / share animations
	•	apply the same UI to liquid blobs
	•	reuse timing + behavior panels across archetypes

This is the payoff of doing the kernel correctly.

⸻

9. Sanity rule (print this)

If a UI control ever asks:

“What should the animation do right now?”

You’ve broken the abstraction.

The UI may only ask:

“What kind of animation should this compile to?”

⸻

If you want next, the clean options are:
	•	Particles → Liquid (showing archetype reuse)
	•	Particles → Reveal Mask (contrast with constraint-driven)
	•	Or we move back to Line Drawing UI mapping using the same model

Just name it.