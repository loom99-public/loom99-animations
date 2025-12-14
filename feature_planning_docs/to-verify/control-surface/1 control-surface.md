Deep dive 1: Control Surface

A Control Surface is the playable layer over your graph. It doesn’t create structure (that’s your Macro). It doesn’t define semantics (that’s ports/types/blocks). It’s a projection + binding layer that makes the system fun and fast without compromising purity.

What it is (in one sentence)

A Control Surface is a curated set of high-leverage controls that bind to parameters and/or ports in the underlying patch, with strict rules that keep everything predictable, scrubbable, and unbreakable.

⸻

1) Why you need it (and why it must be separate from Macro)

If you only have blocks + wires:
	•	novice UX is slow (too many places to poke)
	•	discovery is poor (hard to find “interesting” dimensions)
	•	users end up “typing numbers” instead of playing the animation

If you solve that by putting “smart knobs” inside the Macro expander:
	•	you blur structure vs expression
	•	you lose the ability to build alternative surfaces for the same graph
	•	you make the editor harder to reason about (“why did turning this knob change my patch?”)

A Control Surface keeps the separation clean:
	•	Macro = how it’s built
	•	Graph = what it is
	•	Control Surface = how you play it

⸻

2) The contract: what a Control Surface can and cannot do

Allowed
	•	Read/write block params (safe, direct)
	•	Provide values into designated input ports (safe injection)
	•	Apply deterministic mappings (scale/curve/clamp)
	•	Expose multiple “views” of the same underlying parameters
	•	Provide “performance mode” controls (scrub-safe)

Not allowed
	•	Add/remove blocks
	•	Create/delete wires
	•	Change block types
	•	Do anything that introduces hidden state that breaks scrubbing determinism

This “can’t change topology” rule is what keeps your system pure and makes debugging sane.

⸻

3) The data model: Surface = Controls + Bindings + Presentation

Think of it as a small schema that lives alongside the patch:

Core entities
	•	Surface: the whole panel definition
	•	Control: a UI element the user manipulates
	•	Binding: where that control’s value goes (and how)

Minimal schema (conceptual)

type SurfaceId = string;
type ControlId = string;

interface ControlSurface {
  id: SurfaceId;
  title: string;

  // Curated layout, grouped into sections
  sections: SurfaceSection[];

  // Optional: which patch/macro this surface “belongs” to
  scope?: { patchId?: string; macroInstanceId?: string };
}

interface SurfaceSection {
  id: string;
  title: string; // e.g. "Time", "Motion", "Style", "Chaos"
  controls: SurfaceControl[];
}

type SurfaceControl =
  | NumberControl
  | EnumControl
  | ToggleControl
  | XYControl
  | ColorControl;

interface NumberControl {
  kind: "number";
  id: ControlId;
  label: string;
  unit?: "ms" | "px" | "%" | "deg" | "x";
  min: number;
  max: number;
  default: number;
  curve?: "linear" | "exp" | "log" | "sCurve";
  step?: number;

  bindings: Binding[];
}

And a binding:

type Binding =
  | BindParam
  | BindPort;

interface BindParam {
  target: { blockId: string; paramKey: string };
  map?: ValueMap;   // clamp/scale/curve
  combine?: Combine; // if multiple controls bind same target
}

interface BindPort {
  target: { blockId: string; inputPort: string };
  // inject a scalar/field by wiring to a hidden “surface output node” OR by editor-level param injection
  map?: ValueMap;
}

Key point: the Surface is editor metadata; it does not need to exist in the kernel. It can be compiled into ordinary blocks later if you want “surfaces as patches.”

⸻

4) Two implementation strategies (you can support both)

A) Pure editor binding (fastest, simplest)
	•	Surface writes directly to block params
	•	Or sets “port override values” for certain input ports (like “virtual wires” owned by the surface)

Pros
	•	trivial to implement
	•	no changes to compilePatch or runtime
	•	feels immediate

Cons
	•	surface behavior is not represented as blocks (less inspectable)
	•	modulators (later) want to be graph-native

B) Surface compiles into graph artifacts (most “pure”)
	•	Surface is represented as a tiny subgraph:
	•	controls become ScalarSource blocks
	•	bindings become Map/Clamp/Mix blocks
	•	injection is real wiring

Pros
	•	maximum purity and inspectability
	•	modulators are just blocks
	•	export tooling can “see” the whole system

Cons
	•	requires graph splicing / “surface overlay” layer
	•	needs better patch lifecycle

My recommendation:
	•	Start with A for velocity
	•	Design the schema so it can evolve into B without breaking surfaces

⸻

5) The “unbreakable” rules that make it feel magical

These are worth being strict about:

Rule 1: Every control has a safe range

No free-form numbers by default. Users can type exact values, but the primary interaction clamps.

Rule 2: Bindings must be type-consistent

A control that outputs a number cannot bind to a color param unless there’s a declared mapping.

Rule 3: Combine policy is explicit

If two controls bind the same target, you must declare how:
	•	add, multiply, lerp, override, etc.

No silent last-writer-wins unless explicitly chosen.

Rule 4: Surface never changes topology

This avoids “why did my patch mutate?” confusion and keeps undo predictable.

Rule 5: Surface state is deterministic

If the surface has “dice”, it changes the seed explicitly, not by hidden randomness.

⸻

6) Layout: what it should look like in practice

A Control Surface should be compact, tactile, and consistent across archetypes:

Suggested default sections
	•	Time: speed, hold, stagger, duration scale
	•	Motion: direction/mode, spread, overshoot/curve
	•	Style: intensity, thickness, hue/palette, glow
	•	Chaos: seed, jitter, drift rate (optional)

Interaction affordances that matter a lot
	•	“Dice” button on Seed (reroll)
	•	“Reset” per control and per section
	•	Small sparkline/preview showing live value (optional)
	•	Sticky “favorites” controls (pin to top)

⸻

7) Concrete example: LineMorph surface bindings

A “Time/Stagger” knob could bind to multiple params:
	•	PhaseMachine.holdMs
	•	Stagger.stepMs
	•	Entrance.durationMs (scaled)
	•	maybe a global timeScale

One control, several bindings. Still lawful because it’s explicit and typed.

⸻

8) How this supports your ultimate goal (CSS/SVG export)

Surfaces help export because they encourage:
	•	fewer, more meaningful parameters
	•	consistent mappings
	•	deterministic state

And because you can later sample a Surface+Program at time t and bake keyframes.

