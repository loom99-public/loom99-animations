Here’s a concrete lane schema + palette behavior for Simple Mode (default) and Advanced Mode (unlocked) that stays faithful to your “ports are truth / lanes are guidance” philosophy.

Core principle
	•	Compiler truth: ports + types + connections.
	•	Lane guidance: layout + suggested blocks + default connection heuristics.
	•	Simple mode: fixed lane layout that nudges users into the intended mental model.
	•	Advanced mode: users can rearrange/duplicate/rename/style lanes—but lane kind still drives suggestions.

⸻

Simple Mode

What Simple Mode optimizes for
	1.	Users can build a working animation without understanding your architecture.
	2.	The layout visually tells the story: Scene → Params → Spec → Compile → Compositors → Output
	3.	The palette is context-aware so users aren’t flooded.

Simple Mode lane configuration (static)

Lane 0 — Scene & Targets
	•	Purpose: “What are we animating?”
	•	Typical blocks:
	•	LogoScene(logo-01)
	•	TextLayout(text, font, size) → TargetScene
	•	Selection(byTag/byId) → Selection
	•	Output types that live here: Scene, TargetScene, Selection

Lane 1 — Phases & Time
	•	Purpose: “What’s the macro structure of time?”
	•	Blocks:
	•	Entrance/Hold/Fold → PhaseMachine
	•	TimelineSource (optional: provides tMs for preview scrubbing, not for kernel)
	•	Output types: PhaseMachine

Lane 2 — Motion Params
	•	Purpose: the “big obvious knobs”
	•	Blocks:
	•	origin modes (Converge/Cascade/Diagonal) → Field<Vec2>
	•	motion envelopes (Ease, Ramp, Spring (scrubbable)) → Field<number> or Scalar<number>
	•	Output types: Field<Vec2>, Field<number>, Scalar<number>

Lane 3 — Timing Params
	•	Purpose: “stagger/duration/delay”
	•	Blocks:
	•	StaggerLinear → Field<number> (delay)
	•	Duration → Field<number>
	•	Jitter → (modifies timing fields)
	•	Output types: Field<number>

Lane 4 — Style Params
	•	Purpose: “look”
	•	Blocks:
	•	NeonStyle → Field<Color>, Field<number> (strokeWidth/glow)
	•	Palette → Field<Color>
	•	Opacity → Field<number>
	•	Output types: Field<Color>, Field<number>

Lane 5 — Archetype Spec
	•	Purpose: “declare intent”
	•	Blocks:
	•	LineMorphSpec
	•	ParticlesSpec
	•	GlitchSpec
	•	(one per archetype)
	•	Output types: Spec:*

Lane 6 — Compile
	•	Purpose: “turn intent into runnable program”
	•	Blocks:
	•	CompileLineMorph → Program<RenderTree>
	•	CompileParticles → Program<RenderTree>
	•	Output types: Program<RenderTree>

Lane 7 — Compositors
	•	Purpose: “wrap the program”
	•	Blocks:
	•	Transform3D
	•	WaveRipple (semantic deform effect)
	•	ColorGrade, Glow, etc.
	•	Output: Program<RenderTree>

Lane 8 — Output & Export
	•	Purpose: “preview / export”
	•	Blocks:
	•	OutputProgram (explicit root)
	•	ExportSVG_CSS (later)
	•	Output: final Program<RenderTree>

Why this exact layout works
	•	It encodes your ontology: constraints first, then fields, then spec, then compilation, then endofunctors (compositors).
	•	It also scales: you add archetypes without changing the story.
	•	It keeps “fields as paramization” clearly separated from “program chain”.

⸻

Simple Mode palette behavior

When you drag a block or click “+” in a lane:

1) Lane-filtered suggestions

Each lane has a LaneKind and optional LaneFlavor:
	•	LaneKind: scene | phase | field | spec | compile | program | output
	•	LaneFlavor: motion | timing | style | utility

In Simple Mode, lanes are fixed and flavors are baked in.

Palette shows:
	•	first: blocks whose outputs match the lane’s expected output kinds
	•	second: blocks that are commonly used in that lane (curated “starter set”)
	•	third (optional “more”): everything else, but still type-compatible

2) Connection-aware suggestions

When user selects a port and hits “add block”:
	•	show blocks that have an input compatible with that port
	•	pre-select the matching input port on drop

This is how it becomes “impossible to break” while still feeling magical.

3) Auto-wiring (safe, not magical)

When dropping a block into a lane, you can auto-connect only if all are true:
	•	there is exactly one “obvious” compatible target port in the destination context
	•	there is no ambiguity (one candidate)
	•	it does not create a cycle
	•	it does not overwrite an existing required input

Otherwise: no auto wire, just highlight compatible ports.

⸻

Advanced Mode

Advanced mode is “same compiler, different desk”.

What Advanced Mode unlocks
	•	Add lane
	•	Duplicate lane
	•	Delete lane (except Output maybe)
	•	Reorder lanes
	•	Rename lanes
	•	Change lane height / density
	•	Change lane flavor (motion/timing/style/utility)
	•	Pin lanes / collapse lanes
	•	Group lanes into sections (optional)

What Advanced Mode does not change
	•	Port types
	•	Connection legality
	•	Compile semantics
	•	Evaluation order (topo sort)

Lane model in Advanced Mode