Lanes can be either a purely visual organizer or a semantic constraint system. For your goals (“impossible to break”, “everything composes cleanly”, “purity”), you want a hybrid:
	•	Semantics live in ports + types.
	•	Lanes are a UI affordance that defaults/limits what you’re likely to place and how you connect it.
	•	Lanes may add light constraints (direction, allowed block families), but they should never be the source of truth.

Here’s the design that tends to feel both powerful and unbreakable.

⸻

What a lane is

A lane is a horizontal band that represents a value domain. Think “what kind of thing lives here”:
	•	Program lane: things that ultimately yield Program<RenderTree>
	•	Spec lane: things that yield Spec:*
	•	Field lane: things that yield Field<T>
	•	Scalar lane: things that yield Scalar<T>
	•	Phase lane: PhaseMachine
	•	Scene lane: Scene / TargetScene / selections

A lane is not “time” the way a video editor timeline is. It’s closer to an audio rack or device chain: left-to-right is compositional flow, not frames.

⸻

Horizontal lanes: can they accept any number of blocks?

Yes. Treat each lane as a strip that can hold many blocks. But there are two distinct “flow styles” you should support:

1) Chain lanes (most common)

Blocks placed left-to-right are intended to form a pipeline.

Example: Program chain

[CompileLineMorph] → [Transform3D] → [DeformRipple] → [Output]

The UX expectation: “things in a lane mostly connect forward”.

2) Patch-bay lanes (bus lanes)

Blocks are not intended to be chained; they’re sources/utilities feeding many consumers.

Example: scalar/field utilities

[Seed]   [Const 0.2]  [Noise]  [Ease]
   \         |         /          \
    \        |        /            \
      →→→ used by multiple blocks in other lanes

These lanes feel like “control voltage” lanes in modular synths. The lane is still horizontal, but connections fan out.

You’ll end up with a UI where some lanes are chain-first and others are fan-out-first.

⸻

Multiple lanes of the same type?

Yes—and it’s surprisingly important.

You’ll want multiples for three reasons:
	1.	Readability: one “Fields” lane gets crowded fast
	2.	Parallel structure: “Timing Fields” vs “Style Fields” are both Field<T> but mentally separate
	3.	Variants: you may want two different field graphs side-by-side feeding two different archetypes

Rule of thumb
	•	Multiple lanes can share the same LaneKind (e.g. FieldLane)
	•	Each lane can optionally have a LaneFlavor (e.g. FieldLane:Timing, FieldLane:Style) that affects palette suggestions and default port filters—but not type validity.

So: multiple lanes of same type is allowed, and “flavors” are UI hints.

⸻

Are lanes configurable? Static?

Make them configurable, but anchored by a small set of canonical kinds.

Canonical lane kinds (stable)

These are “structural” and should always exist (or be addable as first-class):
	•	Scene / Targets
	•	Phase
	•	Fields (bulk)
	•	Scalars (small constants/params)
	•	Spec
	•	Program
	•	Output / Export

Configurable aspects (user-controlled)
	•	Add/remove lanes
	•	Rename lanes
	•	Assign a “flavor” (Timing/Style/Motion/etc.)
	•	Collapse/expand
	•	Pin as “always visible”
	•	Change lane height/density

What should not be configurable early
	•	Don’t let users redefine lane kinds arbitrarily at first
	•	Don’t let lane kind dictate type safety
	•	Don’t let lane rearrangement change semantics

The lane system should feel like rearranging your workbench, not rewriting the program.

⸻

How do lanes relate to each other?

There are two relationships, and keeping them distinct prevents a lot of confusion:

A) Visual hierarchy (workflow)

The UI encourages a “top-down” build:
	1.	Scene/Targets
	2.	Fields/Scalars (parameterization)
	3.	Spec (intent)
	4.	Program (compiled behavior)
	5.	Output/Export

This is a workflow affordance.

B) Actual semantic wiring (truth)

All semantics are just:
	•	ports
	•	types
	•	connections
	•	topo order

So lanes do not own semantics; they just guide the user into a sane structure.

⸻

“Which blocks can connect with which?”

Strictly: port types.

Lanes can hint and filter but never decide correctness. The rules:
	•	A port has a ValueKind (your Scalar:number, Field:vec2, Spec:LineMorph, Program:RenderTree, etc.)
	•	A connection is allowed iff from.kind === to.kind (for now)
	•	Any “conversion” is a block (Lift, Sample, Bake, etc.), never implicit

Lanes help by:
	•	only showing likely targets while dragging
	•	highlighting compatible ports
	•	reducing palette clutter by lane kind/flavor

But the compiler is the authority.

⸻

Two concrete lane layouts that work well

Layout 1: “Spec-first” (very aligned with your philosophy)

Top to bottom:
	•	Scene lane (logo paths, text layout, selection)
	•	Phase lane (Entrance/Hold/Fold)
	•	Fields lane (origin, delay, duration, style fields)
	•	Spec lane (LineMorphSpec / ParticlesSpec / etc.)
	•	Program lane (Compile + Compositor chain)
	•	Output lane (Output / Export CSS SVG)

This makes it obvious that “spec is intent” and “program is compiled behavior.”

Layout 2: “Program chain + side modulators” (more Ableton-ish)
	•	Center: a single Program lane where the main chain lives
	•	Above/below: multiple Field/Scalar lanes feeding parameters into blocks on the chain
	•	Scene/Phase lanes docked left as “sources”

This feels extremely natural to users who’ve used audio or node effects racks.

⸻

Can lanes be “time lanes”?

You can, but I’d strongly separate timeline UI from lanes:
	•	Timeline is global: scrubber + playhead
	•	Lanes are structural: program graph

If you blur these, users start expecting “clips” and “regions” and you’ll fight their mental model.

That said, you can support “time blocks” (e.g., envelopes) that output scalars/fields, placed in Field lanes.

⸻

Existing software that matches this mental model

No single tool is identical, but there are very close conceptual cousins:

Best conceptual match: Ableton Live (Tracks + Device Chains)
	•	Tracks ≈ lanes
	•	Devices ≈ blocks
	•	Automation/modulation ≈ your Field/Scalar lanes feeding parameters
	•	It teaches “chain + modulators” extremely well

Best “node graph with strong typing”: Unreal Engine Niagara (or Blueprint with typed pins)
	•	Modules ≈ blocks
	•	Strong typed pins + error highlighting ≈ your ports
	•	Niagara especially has the “stack” feeling (ordered composition) which matches your lane chain idea

Best “fields as first-class”: Blender Geometry Nodes
	•	“Fields” concept maps closely to your Field<T>
	•	Users learn that some nodes are per-element, some are uniform, and conversions are explicit

Best “compositor stack”: After Effects (layer effects stack) or Nuke (node compositing)
	•	Effects wrap/transform content, similar to your compositors on RenderTree
	•	The “stack” metaphor is dead-on for compositors

If you want one single “visual + conceptual” anchor, I’d point people at:
	•	Ableton (lanes + modulators) for UX
	•	Niagara (typed connections + errors) for graph correctness
	•	Geometry Nodes (fields) for your core abstraction

⸻

A crisp rule set that makes lanes feel inevitable

If you implement only these, the system “clicks”:
	1.	Main chain lives in Program lane
	2.	Everything else is a source or modifier that feeds into that chain
	3.	Multiple lanes of the same kind are allowed, purely for organization
	4.	Lanes never change semantics—ports do
	5.	No implicit coercions—conversions are blocks
	6.	Dragging a wire only highlights compatible ports (type-driven)
