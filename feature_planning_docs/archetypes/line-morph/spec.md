Perfect — this is the right moment to lock it down.

Below is a concrete, canonical spec for logo-01-line-drawing, expressed in the language we’ve now stabilized:
	•	archetype = LineMorph
	•	no UI talk
	•	no compiler redefinition
	•	no renderer math
	•	just the spec: scene + fields + modes + phases
	•	faithful to the actual behavior of logo-01-line-drawing-(procedural|varied)

This is the thing you can point to and say:

“This animation is this spec.”

⸻

logo-01-line-drawing — Canonical Spec

0. Identity

export const Logo01LineDrawing = {
  id: "logo-01-line-drawing",
  archetype: "LineMorph",
};


⸻

1. Scene (constraint, immutable)

What must exist at rest

type Logo01Scene = LineScene; // already derived from SVG paths

scene: {
  id: "logo-01",
  strokes: StrokeDef[], // final logo geometry, stroke-split
}

Properties
	•	Each stroke:
	•	has stable id
	•	has final geometry
	•	Stroke order is meaningful (used for stagger)

No animation logic here.
This is the constraint.

⸻

2. State space (implicit, but important)

The compiler + renderer together operate on this conceptual state per stroke:

State = {
  tail: Vec2,        // animated start point
  morph: number,     // 0 → 1 straight → curved
  opacity: number,
  strokeWidth: number,
  glowRadius: number,
  color: Color,
}

The spec only controls how these values are produced.

⸻

3. Fields (the real payload)

Required fields

fields: {
  origin: Field<Vec2>,        // where the line shoots in from
  delay: Field<number>,       // per-stroke delay
  duration: Field<number>,    // per-stroke morph duration

  strokeWidth: Field<number>,
  glowRadius: Field<number>,
  color: Field<Color>,

  opacity?: Field<number>,
}

Invariants
	•	Fields are evaluated once at compile time
	•	Seed affects:
	•	origin choice
	•	timing variance
	•	style variance
	•	Seed does not affect phase traversal

⸻

4. Modes (this is where logo-01 really lives)

4.1 Core perceptual mode family: “Shoot-in from a coherent region”

All three visible variants are the same equivalence class.

converge

Mode {
  key: "converge",
  label: "Converge",
  fields: {
    origin: OriginField.fromBox({
      x: [-150, -100],
      y: [  50,  150],
    }),
  },
  meta: {
    group: "Origin",
    quotientGroup: "shoot-in",
    perceptualAxes: { direction: -1, cohesion: 1 },
  },
}

cascade

Mode {
  key: "cascade",
  label: "Cascade",
  fields: {
    origin: OriginField.fromBox({
      x: [300, 360],
      y: [-120, -60],
    }),
  },
  meta: {
    group: "Origin",
    quotientGroup: "shoot-in",
    perceptualAxes: { direction: 0, cohesion: 1 },
  },
}

diagonal

Mode {
  key: "diagonal",
  label: "Diagonal",
  fields: {
    origin: OriginField.fromBox({
      x: [600, 740],
      y: [ -40,  40],
    }),
  },
  meta: {
    group: "Origin",
    quotientGroup: "shoot-in",
    perceptualAxes: { direction: 1, cohesion: 1 },
  },
}

Important:
These modes differ only in the origin field.
Timing, morph law, and rendering are identical.

⸻

4.2 Timing mode (shared)

Mode {
  key: "staggered",
  label: "Staggered",
  fields: {
    delay: Field.linearStagger({
      base: 0,
      step: 50,        // ms per stroke
      variance: 0.15,  // procedural vs varied widens this
    }),
    duration: Field.constant(800),
  },
  meta: {
    group: "Timing",
  },
}


⸻

4.3 Style mode (shared)

Mode {
  key: "neon-line",
  label: "Neon Line",
  fields: {
    strokeWidth: Field.constant(4),
    glowRadius: Field.constant(6),
    color: Field.fromPalette("logoWarm"),
    opacity: Field.constant(1),
  },
  meta: {
    group: "Style",
  },
}


⸻

5. Procedural vs Varied (no logic change)

This is not a different animation.

It is the same spec with different variance envelopes:

Aspect	Procedural	Varied
origin noise	±10%	±25%
delay jitter	±10%	±40%
duration	narrow	wide
color shift	minimal	noticeable

Implemented entirely inside field builders.

⸻

6. Phase structure (fixed)

phases: PhaseMachine([
  { name: "entrance", duration: 1200, ease: easeOutCubic },
  { name: "hold",     duration: 2000 },
  { name: "fold",     duration: 250  },
])

Phase semantics (contractual)

Phase	tail movement	morph
entrance	moves origin → p0	0 → 1
hold	locked at p0	1
fold	locked	1

Exit visuals (scale/fade) are renderer-level, not spec-level.

⸻

7. Final assembled spec (what the compiler sees)

LineMorphSpec {
  scene: Logo01Scene,

  modes: [
    "converge" | "cascade" | "diagonal",
    "staggered",
    "neon-line",
  ],

  phases,
}

That’s it.

⸻

8. Why this spec is “correct”
	•	✅ explains all observed variants
	•	✅ no hidden logic
	•	✅ modes are real equivalence classes
	•	✅ procedural vs varied is orthogonal
	•	✅ ports cleanly into the unified editor
	•	✅ compiles cleanly with compileLineMorph
