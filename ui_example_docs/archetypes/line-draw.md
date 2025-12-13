Here’s a high-level, minimal outline for porting the line-drawing animation into the kernel you now have. This is intentionally concise and operational.

⸻

1. Freeze the semantic core (what must not change)

Underlying animation type (single truth):
	•	Each stroke has a final path (scene constraint).
	•	A straight scaffold is constructed from an origin to the stroke’s final endpoint.
	•	Each anchor + control point interpolates:

straightPos + (finalPos − straightPos) * morphProgress


	•	Tail behavior:
	•	entrance: tail moves
	•	hold: tail locked
	•	fold/exit (if any): tail locked
	•	Renderer converts abstract geometry → SVG path d.

Everything else is parameterization.

⸻

2. Extract a pure SceneSpec

Do this once.
	•	Scene = list of strokes with stable IDs.
	•	Each stroke contains:
	•	final path geometry (segments only)
	•	correspondence info if needed
	•	No timing, no randomness, no easing, no modes.

This is the hard constraint the animation must satisfy at t = 1.

⸻

3. Define compile-time Fields (parameterization layer)

Create fields evaluated from (seed, index, count, env):
	•	originField : Field<Vec2>
	•	delayField : Field<number>
	•	durationField : Field<number>
	•	styleFields (strokeWidth, glow, color, opacity baseline)

Modes = named bundles of these fields:
	•	converge / cascade / diagonal are just different originFields
	•	procedural vs varied = same fields, different variance envelopes / Rand usage

No runtime randomness.

⸻

4. Build the PhaseMachine

Define phases as pure data:
	•	entrance (duration, ease)
	•	hold (duration)
	•	optional fold/exit

PhaseMachine is sampled at tLocal = t − delay_i.

From phase sample, derive:
	•	morphProgress : number
	•	tail policy
	•	opacity policy (if used)

⸻

5. Define the morph law (trajectory, not clock)

Implement one reusable function:

LineDrawMorph(
  finalPath,
  origin,
  morphProgress,
  phaseSample
) → abstract path geometry

	•	Uses straight scaffold cached per stroke.
	•	No easing logic inside (progress already eased).
	•	No timing logic inside.
	•	No randomness inside.

This is the “trajectory”.

⸻

6. Renderer = interpreter only

Renderer responsibilities:
	•	Cache scaffold + final geometry per stroke.
	•	Convert interpolated geometry → PathCmd[].
	•	Emit DrawNode with stable ID + style + transform.

Renderer does not decide:
	•	when things start
	•	how fast they move
	•	where they start from

⸻

7. Assemble the Program

For each stroke:
	•	Use fields to compute:
	•	origin
	•	delay
	•	duration
	•	Build a per-stroke Clock → morphProgress
	•	Sample PhaseMachine
	•	Feed everything into LineDrawMorph
	•	Emit DrawNode

Combine all strokes in parallel → one RenderTree.

⸻

8. Map the 4 existing files to presets

You should end with:
	•	1 SceneSpec (logo or text)
	•	1 LineDrawMorph compiler
	•	4 Presets:
	•	logo-procedural
	•	logo-varied
	•	text-procedural
	•	text-varied

Each preset differs only in:
	•	which fields are used
	•	which Rand distributions are allowed
	•	variance magnitudes

No new logic.

⸻

9. Validation step (important)

Before moving on:
	•	Pick 2–3 timestamps.
	•	Compare:
	•	original HTML output
	•	kernel output
	•	Geometry + timing should match visually.

Only after this passes do you:
	•	quotient modes
	•	refactor fields
	•	generalize UI controls

⸻

That’s it.
If you want, next step can be (a) a concrete SceneSpec for logo-01, or (b) the exact LineDrawMorph function signature + pseudocode.