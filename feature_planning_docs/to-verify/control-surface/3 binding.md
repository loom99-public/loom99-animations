Deep dive 3: Binding

If Controls are the knobs, Bindings are the patch cables behind the panel.

Bindings are where:
	•	expressiveness lives
	•	subtle bugs usually hide
	•	and purity is either preserved… or quietly violated

So this is the layer where being explicit pays off enormously.

⸻

1) What a Binding is (precisely)

A Binding is a declarative mapping from a Control’s output to a specific target in the patch, with an explicit transformation and combination rule.

A Binding answers three questions:
	1.	Where does this value go?
	2.	How is it transformed?
	3.	What happens if something else also writes there?

Nothing more. Nothing less.

⸻

2) The two legal binding targets

Bindings may only target existing semantics. No invention allowed.

A) Parameter binding (most common)

Bind directly to a block parameter.

BindParam {
  target: { blockId: string; paramKey: string };
  map?: ValueMap;
  combine?: Combine;
}

Use this for:
	•	durations
	•	widths
	•	booleans
	•	enum selectors
	•	anything that already lives in block.params

B) Port binding (injection)

Bind to an input port of a block.

BindPort {
  target: { blockId: string; inputPort: string };
  map?: ValueMap;
}

Use this for:
	•	feeding a scalar/field into a block that expects it
	•	“virtual wiring” from the surface

Important rule:

A port binding must respect the port’s declared type.
No coercion. No guessing.

⸻

3) Why bindings are not wires

This distinction matters.

Wires	Bindings
Structural	Expressive
Visible in graph	Often hidden behind surface
Change topology	Must not
One-to-one	One-to-many
Bidirectional edits	Usually one-way

Bindings are closer to automation lanes in audio software:
	•	they don’t rewire the synth
	•	they move knobs

This keeps undo sane and reasoning local.

⸻

4) Mapping: shaping the control’s influence

A control emits a raw value. Rarely do you want that raw value directly.

That’s what ValueMap is for.

Canonical mapping operations

interface ValueMap {
  scale?: number;        // multiply
  offset?: number;       // add
  clamp?: [number, number];
  curve?: "linear" | "exp" | "log" | "sCurve";
}

Applied in this order (important and fixed):
	1.	curve
	2.	scale
	3.	offset
	4.	clamp

Why fixed order matters:
	•	predictable export
	•	easy mental model
	•	no hidden surprises

Example

A “Stagger” control in [0..1] mapped to milliseconds:

map: {
  curve: "exp",
  scale: 200,
  clamp: [0, 300]
}

One knob, precise influence.

⸻

5) Combine rules: never implicit, never magical

If more than one thing binds to the same target, you must specify how they combine.

Canonical combine operators

type Combine =
  | { op: "add" }
  | { op: "multiply" }
  | { op: "lerp"; t: number }   // rare but useful
  | { op: "min" }
  | { op: "max" }
  | { op: "override" };         // last writer wins

Strong recommendation
	•	Default combine = error
	•	The UI should force the user to choose

Why:
	•	prevents silent cancellation
	•	makes modulation visible
	•	keeps export sane

⸻

6) Binding visibility & debuggability (this matters more than you think)

Bindings should never be “invisible magic”.

Recommended UI affordances:
	•	Hover a control → highlight all bound targets
	•	Hover a param → show all bound controls
	•	Tiny “chain” icon next to params that are bound
	•	Click param → jump to control

This prevents the classic:

“Why is this value changing when I’m not touching it?”

⸻

7) Determinism & time

Bindings themselves must be:
	•	stateless
	•	deterministic
	•	time-independent

Time variation belongs in:
	•	modulators
	•	fields
	•	phase machines

A Binding should never look at t directly.

Why:
	•	guarantees scrubbing works
	•	allows offline baking
	•	avoids temporal feedback loops

⸻

8) How bindings interact with modulators (cleanly)

Later, when you add modulators:
	•	Controls still produce a base value
	•	Modulators produce an offset or multiplier
	•	Binding combine rules decide how they interact

Visually:
	•	base value = knob
	•	modulation = ring
	•	result = shown value

Semantically:
	•	still just bindings + combine ops
	•	no new rules

⸻

9) Binding lifecycle (important for editor correctness)

Bindings should be:
	•	created when surface is created or user binds
	•	destroyed when control or target is removed
	•	automatically disabled (not deleted) if target disappears
	•	re-enabled if target reappears (e.g. undo)

This makes undo/redo and macro replacement sane.

⸻

10) A complete example (LineMorph “Time” section)

Control: Speed
	•	Range: 0.25 → 3.0
	•	Default: 1.0

Bindings:
	1.	BindParam → PhaseMachine.timeScale
	•	map: { clamp: [0.1, 4] }
	2.	BindParam → Stagger.stepMs
	•	map: { curve: "exp", scale: 1.0 }
	•	combine: { op: "multiply" }

One knob, two effects, fully explicit.

⸻

11) Why this binding model survives future features

This exact model still works when you add:
	•	export to CSS/SVG
	•	graph serialization
	•	live collaboration
	•	generative presets
	•	AI-assisted control suggestions

Because it’s declarative, typed, and boring in all the right ways.

⸻

12) One-sentence mental model

Controls emit values.
Bindings decide where and how those values apply.
Nothing else is allowed to be implicit.

That sentence should be literally true in your implementation.

⸻

When you say next, we’ll do the final deep dive: Control Surface layout & interaction patterns — how everything comes together visually and ergonomically without overwhelming users.