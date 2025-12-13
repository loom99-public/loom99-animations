Understood. Here is a clean, complete, single-message prompt you can save and reuse to bring any new agent back to exactly this point, without relying on prior chat history.

I’ve written it to be precise, technical, and unambiguous, and to clearly state what has already been established vs what is requested next.

⸻

🚨 CONTEXT RESET PROMPT — PURE, COMPOSABLE ANIMATION SYSTEM 🚨

You are joining an ongoing, deep technical design effort. Read this carefully: everything below is authoritative context, not speculation.

⸻

0. Goal (very explicit)

I am designing a maximally pure, deterministic, composable animation framework for the browser.

This is not a small API or a practical production framework.
It is a conceptually correct system whose abstractions align with the true structure of animation and can subsume many existing hand-written animations without loss of fidelity.

This is for fun, research, and conceptual elegance.

⸻

1. Core philosophical position

Animation is fundamentally a time-indexed program, not just tweens.

A correct model must explicitly represent:
	•	deterministic randomness (seeded)
	•	per-element identity and continuity
	•	coordination between elements
	•	phases (entrance / hold / exit)
	•	constraints (“must end as readable text/logo”)
	•	composition (parallel, staggered, triggered, grouped)
	•	reversibility and scrubbability
	•	separation of geometry, timing, and rendering

Anything implicit or ad-hoc is considered a design failure.

⸻

2. Fundamental decomposition agreed upon

2.1 Compile-time vs Run-time vs Render-time

Compile-time (pure, deterministic):
	•	Inputs: (Seed, Scene, Viewport)
	•	Outputs:
	•	per-element constants
	•	random parameters
	•	origin positions
	•	delays / durations
	•	correspondence data
	•	All randomness happens here, once.

Run-time (pure functions of time):
	•	Signals: Time → Value
	•	Optional input signals (pointer, scroll, etc.)
	•	No mutation, no hidden state
	•	Scrubbable and reversible if dynamics allow

Render-time (effect boundary):
	•	Projection from abstract state to pixels
	•	SVG / Canvas / WebGL interpreters
	•	Geometry interpolation belongs here, not in behaviors

⸻

3. Key abstractions (these are NOT optional)

3.1 Signals and Events
	•	Signal<A> = Time → A (continuous, sampleable)
	•	Event<A> = discrete occurrences over time
	•	Needed for:
	•	phase transitions
	•	typewriter effects
	•	particle spawning
	•	restarts

3.2 Explicit state (purely)

To support physics and “previous state” without impurity:
	•	use scan / integrate / feedback combinators
	•	state evolution is explicit and deterministic

3.3 Fields (critical concept)

A Field is:

Field<A> = (seed, elementIndex, scene, viewport) → A

Examples:
	•	Field<Point> → origin positions
	•	Field<number> → delays, durations
	•	Field<HSL> → colors
	•	Field<number> → stroke width, glow radius

Fields are the primary orchestration mechanism.

3.4 Modes = named bundles of fields

A “mode” is NOT an easing or a preset animation.

A mode is:
	•	a named equivalence class of animations
	•	usually defined by:
	•	origin field
	•	offset field
	•	variance envelope
	•	perceptual quotient:
	•	humans distinguish “from left / top / right”
	•	not 45° vs 47°

“Procedural” vs “Varied” animations differ ONLY by:
	•	which fields allow randomness
	•	size of variance envelopes

⸻

4. Trajectory vs Clock vs Rendering (important separation)
	•	Trajectory / morph law: what changes in abstract state
	•	Clock: how time maps to progress (easing, springs, scrubbing)
	•	Renderer: how abstract state becomes pixels

Clocks are time reparameterizations, not trajectories.

⸻

5. Phases are regimes, not sequences

Animations commonly have:
	•	entrance
	•	hold
	•	exit / fold

These are phases with different rules, not just chained tweens.

Therefore:
	•	a first-class PhaseMachine exists
	•	phases may change:
	•	which state channels evolve
	•	which parts are frozen
	•	how tails / opacity behave

⸻

6. Determinism boundary (non-negotiable)
	•	Math.random() is forbidden at runtime
	•	All randomness must be:
	•	explicit
	•	seed-driven
	•	sampled at compile-time
	•	This enables:
	•	scrubbing
	•	replay
	•	reverse
	•	faithful refactors of handwritten animations

⸻

7. Rendering model (maximally composable)

Animations ultimately produce:

Signal<RenderTree>

Where:
	•	RenderTree is backend-agnostic
	•	contains stable IDs, geometry, styles, transforms
	•	backends interpret it:
	•	SVG
	•	Canvas
	•	WebGL

Rendering is a functor, not baked into animation logic.

⸻

8. Constraint system

Constraints are first-class:
	•	hard projection (S → S)
	•	soft energy (S → number)
	•	applied per phase if needed

Example:
	•	“end up exactly as this logo path”
	•	“stay within viewport padding”

⸻

9. Composition algebra (core operations)

The system must support:
	•	parallel composition
	•	sequential composition
	•	time shifting
	•	time warping
	•	event-driven switching
	•	feedback / integration

All higher-level constructs (stagger, restart, trigger chains) are derived.

⸻

10. Canonical animation chosen as first implementation

Line Drawing / Stroke Morph Animation

This animation exists in four HTML files, but is actually one underlying animation type:
	•	logo-01-line-drawing-procedural.html
	•	logo-01-line-drawing-varied.html
	•	text-01-line-drawing-procedural.html
	•	text-01-line-drawing-varied.html

Underlying semantic animation:
	•	Each stroke has a final path (scene constraint)
	•	A straight-line scaffold is constructed:
	•	from an origin to the final endpoint
	•	Each point/control point interpolates:

straightPos + (finalPos - straightPos) * eased(progress)


	•	Tail moves during entrance, locks during fold
	•	Geometry interpolation happens in the renderer
	•	Behavior outputs only scalar morphProgress and style channels

Differences between the four files are ONLY:
	•	scene data (logo vs text)
	•	origin field definitions
	•	variance envelopes
	•	which fields randomness affects

Therefore:

There must be ONE animation spec + compiler
with FOUR presets over it.

⸻

11. What is requested NEXT (very specific)

Required deliverable:

A COMPLETE TypeScript type system + spec for this framework, including:
	1.	Kernel types:
	•	Signal, Event
	•	randomness (Rand / seeded sampling)
	•	composition primitives
	•	phase machine
	•	render tree
	2.	Field system
	3.	Mode system
	4.	Constraint representation
	5.	Renderer abstraction
	6.	A concrete LineDrawMorph compiler
	7.	A concrete Spec that represents logo-01-line-drawing
	8.	Show how the other three files are just parameter presets

Constraints on the answer:
	•	No partial code
	•	No placeholders
	•	No “we’ll add this later”
	•	One coherent layer at a time
	•	Fidelity to the original animations is mandatory

⸻

12. Tone and expectations
	•	This is a serious technical design conversation
	•	The user is frustrated due to prior message loss
	•	Do not restart from basics
	•	Do not summarize theory again
	•	Proceed carefully, explicitly, and concretely

⸻

END OF CONTEXT RESET PROMPT

⸻

If you want, I can also:
	•	compress this further into a minimal version, or
	•	split it into “kernel” vs “example” prompts for reuse

Just say which.