If you optimize for comprehensive + maximally pure + maximally composable, I’d change the design goal from “a small set of node kinds” to “a complete calculus with a small kernel, plus an unlimited library of derived macros.”

The nice part: most of your existing animations (morph, particles, reveal masks, typewriter, goo blobs, kinetic transforms, 3D wobble) slot cleanly into that calculus once you add Events, State, and Randomness-as-data.

⸻

What changes in the “comprehensive/pure” version

1) Two first-class time objects: Signals and Events

You already have Behavior<A> = (t,input)->A. Keep that as a primitive, but split the world:
	•	Signal<A>: value for every time t (continuous / sampleable / scrub-friendly)
	•	Event<A>: discrete occurrences at times (switches, spawns, “typed a char”, “restart”)

Most “messy” animations (typewriter, particle spawning, restart loops) are messy because they’re events implemented with side effects (setTimeout, requestAnimationFrame branches). Make them explicit.

2) Explicit state (purely) via a Stepper/Scan primitive

To cover physics, accumulators, and “previous state,” you need one kernel primitive like:
	•	scan : (state, dt, input) -> state' producing a Signal of states
	•	or integrate for ODE-ish motion

This keeps determinism and allows replay. You don’t sprinkle mutable fields across code.

3) Randomness becomes a typed effect, never ambient

Every Math.random() becomes one of:
	•	Rand<A> (a sampler you can run with a seed), or
	•	Field<A> : (seed, i, ctx) -> A (for per-element constants)

This is the single biggest fidelity-preserving refactor across your files. Your “procedural restart regenerates everything” pattern becomes “new seed” — same behavior, but now scrub/replay is stable.

4) Rendering becomes “program outputs a RenderTree”

Instead of “behavior sets DOM,” define a backend-neutral render model:
	•	RenderTree = shapes/styles/transforms/filters with stable IDs
	•	interpreters: SVG / Canvas / WebGL

Then your animation is literally:

Program : (InputSignals, Seed, Scene) -> Signal<RenderTree>

That’s maximally composable: composition happens on render trees and signals, not on imperative DOM.

5) Composition is algebraic, not ad hoc

You want these to be the core operations:
	•	parallel composition (combine sub-scenes)
	•	sequential composition (time-shift + switch)
	•	time-warp (clock as a signal transform)
	•	switching (event-driven phase changes)
	•	feedback (stateful dynamics)

Everything else (stagger, “hold then exit”, “restart”) is derived.

⸻

A practical “kernel” that’s comprehensive

If I had to pick the smallest set of primitives that still covers all your examples:
	1.	Signal<A> (sampleable function of time)
	2.	Event<A> (stream of timestamped occurrences)
	3.	map/zip on signals
	4.	delay/stretch/warp (time transforms)
	5.	switch / until (event-driven program change)
	6.	scan (pure state evolution with dt)
	7.	Rand<A> + runRand(seed) (explicit randomness)
	8.	RenderTree output + interpreters (SVG/Canvas)

Everything you have becomes a macro over these.

⸻

How to decompose handwritten animations with maximum fidelity

Here’s a “no loss of intent” method I use that maps cleanly onto your framework.

Step A — Find the observable outputs

Make a list of the things that actually hit the screen:
	•	SVG path d (morphing text file uses flubber interpolators)  ￼
	•	Canvas particle positions + glow + opacity (particles files)  ￼
	•	Mask rectangle/circle attributes (reveal mask)  ￼
	•	DOM children (letters inserted/removed) + cursor visibility (typewriter)  ￼
	•	SVG circles for blobs + goo filter strength (liquid)  ￼
	•	element transforms (kinetic + 3D)

Those become fields in your RenderTree (or in per-element “style channels”).

Step B — Separate compile-time parameters from time evolution

Any value that is sampled once per restart / per element becomes a Field/Rand product.

Examples from your code:
	•	Particle start positions chosen from a mode or random bounds
	•	Per-particle delay/speed mods in “wild” mode  ￼
	•	Reveal direction mode + easing pick + hue shifts
	•	Typewriter char delay + variance + pause delay
	•	Liquid blob delay/duration/drop velocity + goo strength
	•	Kinetic per-part start vectors/rotation/scale/duration  ￼
	•	3D perspective, max rotations, wobble freq, duration  ￼

Then the only thing that’s left as a pure function of time is the progress/easing/state machine.

Step C — Turn “state machines in code” into Events + Switch

Whenever you see:
	•	animationState === 'entrance' / 'hold' / 'exit' (you use this everywhere)
	•	setTimeout(startExit, HOLD_DURATION)
	•	restart loops that regenerate params

…model it as:
	•	a PhaseSignal : Signal<Phase>
	•	a derived Event when phase boundaries occur
	•	switch to a new sub-program at boundaries
	•	“restart” = seed := nextSeed (pure) + switch back to entrance

This keeps behavior identical but removes hidden timing side effects.

Step D — Decide scrubbability policy explicitly

Some animations are naturally scrubbable (morphs, transforms). Some are “procedural” in a way that depends on discrete scheduling (typewriter, spawn bursts).

You get to choose, per animation:
	•	Scrubbable version: precompute an event script from seed
Example: typewriter becomes a list of (time, charAdded) events generated from Rand, instead of setTimeout calls. That preserves the exact stochastic rhythm but makes it seekable. (Your typewriter currently schedules per-character delays with randomness.)
	•	Real-time version: keep event scheduling driven by wall-clock but still pure at the “plan level” by making the scheduler an interpreter of Event streams.

Both are “pure”; the difference is whether time is treated as a random-access coordinate or as a causal stream.

⸻

Concrete decompositions for your current examples

Morphing (flubber): “Mode selects start-shape distribution”

Your morph file:
	•	chooses a random start shape per path (getRandomStart) and interpolates to item.d using flubber  ￼
	•	per-element delay/duration and a selected easing  ￼
	•	exit is scale+fade then restart  ￼

In the comprehensive model:
	•	Field<PathD> startShapeField (seed,i -> start path)
	•	Field<number> delayField, Field<number> durationField
	•	Clock easeField (or Field<Clock> if you want randomized easing)
	•	Renderer:Flubber caches interpolators at compile-time, outputs d(t)=interp(morphProgress(t))
	•	phases are Events/Switch

Particles: “Points-from-text is a Scene compiler; motion is signal”

Particles sample text into points and then move particles from start->target with easing  ￼.

Decomposition:
	•	Scene compiler: text -> Point[] (that’s not “animation,” it’s scene generation)
	•	Field: startPosField(mode, seed, i, targetPoint) -> startPoint (your modes are exactly this)
	•	Signal: pos(t) = lerp(start, target, ease(progress))
	•	RenderTree backend: Canvas draws particles

Reveal mask: “Mask geometry is the animated state”

Reveal updates a mask rect via different direction “grow” rules .

Decomposition:
	•	Mode = field over mask parameters (direction is a small finite choice)
	•	State = maskRect(t) or maskShape(t)
	•	RenderTree = SVG with <mask> updated by signals

Liquid goo: “Stateful-ish, but actually piecewise parametric”

Blob motion is parameterized with delays/durations and a two-stage curve (<0.7 drop/spread, then settle) .

Decomposition:
	•	Field: per-blob params (delay, duration, dropVelocity, start positions, target positions)
	•	Signal: blob (x(t),y(t),r(t)) is piecewise function of progress
	•	Filter strength is a mode/field (stdDeviation)
	•	No real integrator required unless you want fluid dynamics; your current is already “closed form.”

Typewriter: “Event script + render tree”

This one is fundamentally event-driven today (DOM mutation over time) .

Pure decomposition:
	•	Compile-time: generate an event script of insertions/deletions from seed:
	•	(t, Insert(wordIndex, char))
	•	(t, MoveCursor(wordIndex))
	•	(t, DeleteLastChar)
	•	Runtime: fold script into a Signal of “current string per word”
	•	RenderTree: text nodes derived from that state

This preserves the rhythm and “hunt-peck” modes (varied file) exactly, but now it’s composable and seekable.  ￼
