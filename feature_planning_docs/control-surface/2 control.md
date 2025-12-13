Deep dive 2: Control (the individual unit)

A Control is the atomic, tactile interface between a human and your graph. If the Control Surface is the instrument, a Control is a key, knob, fader, pad, or switch on that instrument.

This is the level where things either feel alive and intuitive or dead and spreadsheet-y. So we’ll go deep.

⸻

1) What a Control really is (conceptually)

A Control is not:
	•	a variable
	•	a block
	•	a parameter
	•	a source of truth

A Control is:

a constrained, expressive input that produces a typed value and can be bound to one or more targets.

That distinction matters because it explains why:
	•	Controls can be rearranged freely
	•	Controls can have multiple bindings
	•	Controls can be replaced without touching the graph
	•	Controls can be modulated without changing semantics

⸻

2) The Control contract (very important)

Every Control must satisfy these invariants:
	1.	Typed output
	•	A Control produces exactly one logical value of a known type:
	•	Scalar<number>
	•	Scalar<boolean>
	•	Scalar<enum>
	•	Scalar<Vec2>
	•	Color
	•	(Later: Scalar<Angle>, Scalar<Percent>, etc.)
	2.	Clamped domain
	•	Controls never emit unbounded values
	•	Even if the underlying param allows it, the control’s domain is intentional
	3.	Deterministic
	•	Given (controlState, t) → value is deterministic
	•	Randomness must be explicit (seed-based, surfaced)
	4.	Scrub-safe
	•	Controls must produce meaningful values at any time
	•	No hidden integration over time unless explicitly modeled
	5.	Composable
	•	Control output can be fed into bindings, modulators, or block params
	•	No special-casing per archetype

⸻

3) Control ≠ Parameter (this distinction saves you later)

A parameter is:
	•	owned by a block
	•	part of the program definition
	•	structural in meaning

A control is:
	•	owned by the UI
	•	ephemeral
	•	expressive

One control may:
	•	drive many parameters
	•	drive zero parameters (yet)
	•	be rebound at will

This lets you:
	•	redesign surfaces without touching macros
	•	build multiple surfaces over the same patch
	•	support “performance mode” vs “design mode”

⸻

4) Canonical control kinds (keep this small)

You want very few control primitives, each done extremely well.

1. Number Control (the workhorse)

Used for:
	•	timing
	•	distances
	•	intensities
	•	weights

interface NumberControl {
  kind: "number";
  id: ControlId;
  label: string;

  min: number;
  max: number;
  default: number;

  curve?: "linear" | "exp" | "log" | "sCurve";
  step?: number;
  unit?: "ms" | "px" | "%" | "deg" | "x";

  bindings: Binding[];
}

UX notes
	•	Slider is primary
	•	Numeric field is secondary
	•	Curve matters more than step for “feel”
	•	Exp curves are huge for time and motion

⸻

2. Enum Control (modes without magic)

Used for:
	•	converge / cascade / diagonal
	•	easing families
	•	palette selection

interface EnumControl<T extends string> {
  kind: "enum";
  id: ControlId;
  label: string;

  options: readonly T[];
  default: T;

  presentation?: "segmented" | "dropdown" | "radio";

  bindings: Binding[];
}

UX notes
	•	Segmented buttons feel best for small enums
	•	Dropdowns are fine for large sets
	•	Enum → numeric mapping belongs in binding, not the control

⸻

3. Toggle Control (boolean, but expressive)

Used for:
	•	enable/disable effects
	•	reverse order
	•	lock/unlock behavior

interface ToggleControl {
  kind: "toggle";
  id: ControlId;
  label: string;
  default: boolean;

  bindings: Binding[];
}

UX notes
	•	Toggle is often better than “0/1 slider”
	•	Can drive visibility, weighting, or gating

⸻

4. XY Control (spatial intuition)

Used for:
	•	origin points
	•	direction + magnitude
	•	offsets

interface XYControl {
  kind: "xy";
  id: ControlId;
  label: string;

  x: { min: number; max: number; default: number };
  y: { min: number; max: number; default: number };

  aspect?: "free" | "lockX" | "lockY";
  boundsHint?: "viewport" | "unitSquare";

  bindings: Binding[];
}

UX notes
	•	Hugely powerful
	•	Visual feedback is key
	•	This often replaces four number fields

⸻

5. Color Control (visual-first)

Used for:
	•	stroke/fill
	•	glow color
	•	palette offsets

interface ColorControl {
  kind: "color";
  id: ControlId;
  label: string;

  default: Color;
  palette?: string; // optional named palette
  allowAlpha?: boolean;

  bindings: Binding[];
}

UX notes
	•	Swatch + picker
	•	Palette browsing beats numeric HSL
	•	Sliders for alpha only if needed

⸻

5) Bindings: where the real power comes from

A Control without bindings does nothing. Bindings are what let one control influence many things.

Binding responsibilities

A binding defines:
	•	target (param or port)
	•	mapping (scale/curve/clamp)
	•	combination (if multiple controls bind same target)

Example:

{
  target: { blockId: "stagger", paramKey: "stepMs" },
  map: { scale: 1.0, clamp: [0, 300] },
}

Multiple bindings per control are normal.

⸻

6) Combine rules (never implicit)

If two controls bind the same target, you must declare how.

Canonical combine ops:
	•	add
	•	multiply
	•	lerp
	•	max
	•	min
	•	override (last writer)

Why this matters:
	•	Prevents “why did my knob stop working?”
	•	Makes modulation predictable
	•	Keeps export sane

⸻

7) Modulation compatibility (future-proofing)

Even before you build full modulators, Controls must be modulation-ready.

That means:
	•	every control has a base value
	•	optional modulation input
	•	modulation depth
	•	resulting value = base ⊕ mod

Where ⊕ is explicit (add/mul/etc.).

Visually:
	•	thin ring around knob
	•	waveform preview on hover (later)

Conceptually:
	•	modulators output Scalar<number>
	•	they don’t “replace” controls, they influence them

⸻

8) Why Controls must be boring internally (and wild externally)

Internally:
	•	simple
	•	deterministic
	•	boring math

Externally:
	•	tactile
	•	expressive
	•	forgiving

This split is what lets you:
	•	export to CSS
	•	scrub freely
	•	debug weird behavior
	•	keep the system explainable

⸻

9) Common traps to avoid

❌ Letting controls create blocks
❌ Letting controls implicitly rewire things
❌ Allowing free-form numbers everywhere
❌ Mixing control logic with block semantics
❌ Making controls archetype-specific without abstraction

You’re already avoiding all of these — this design locks it in.

⸻

10) Mental model you can explain in one breath

“Controls don’t do anything on their own.
They just emit values.
Bindings decide where those values go.”

That sentence alone is a north star.

