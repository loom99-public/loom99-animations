1️⃣ Formal Product Specification

(Canonical, forward-looking, implementation-agnostic)

This document defines what the product is, what problems it solves, and the guarantees it must uphold. It is the contract everything else is measured against.

⸻

Product Specification: Bus-Centric Generative Visual Instrument

Product Identity

Name (working): Loom
Category: Generative visual instrument / ambient motion system
Primary Mode: Live, infinite, deterministic animation
Secondary Mode: Exportable motion artifacts (SVG, CSS, video approximations)

Loom is not a timeline editor, not a procedural animation tool, and not a VFX compositor.

Loom is an instrument for cultivating interacting fields of influence over time.

⸻

Core User Promise
	1.	Infinite, evolving visuals without randomness
	2.	Playable control instead of timelines
	3.	Deterministic behavior with sensitivity, not chaos
	4.	Composability at every level (blocks → buses → composites → systems)
	5.	Safe live editing with no catastrophic failure modes

⸻

Primary User Personas

1. Visual Musicians
	•	Want to play visuals live
	•	Think in rhythms, dynamics, tension, release
	•	Value expressiveness over precision

2. Motion Designers
	•	Want reusable, loopable systems
	•	Care about polish, legibility, export
	•	Use Loom to author behaviors, not frames

3. Creative Technologists
	•	Want deterministic complexity
	•	Want to embed or export systems
	•	Care deeply about architecture integrity

⸻

Fundamental Concepts (User-Facing)

1. Blocks

Blocks are pure functions or explicit state machines.
	•	Stateless blocks: math, mapping, shaping
	•	Stateful blocks: Delay, Integrate, History
	•	Source blocks: geometry, text, particles

Blocks never “own time” implicitly.

⸻

2. Buses (Central Abstraction)

A bus is a named, typed, deterministic influence field.

Each bus:
	•	has a world (Signal or Field)
	•	has a domain (number, phase, color, etc.)
	•	has a combine mode
	•	has a silent default value
	•	is global within a patch (v1)

Buses are:
	•	many-to-many
	•	persistent
	•	visible at all times
	•	inspectable in real time

Buses replace lanes, global modulation hacks, and implicit ordering.

⸻

3. Publishers & Consumers
	•	Publishers contribute influence into a bus
	•	Consumers interpret influence from a bus

Both sides may shape the signal explicitly.

No bus interaction is ever implicit.

⸻

4. Interpretation Boundaries

Every bus consumption passes through an explicit interpretation boundary.

At this boundary, users may apply:
	•	Slew
	•	Range mapping
	•	Quantization
	•	Thresholding
	•	Folding / wrapping
	•	Integration
	•	Gating

Identity is always the default and is explicit.

⸻

5. Determinism Model

Loom is deterministic by construction.
	•	No hidden randomness
	•	All variation comes from:
	•	seeds
	•	time
	•	stateful blocks
	•	sensitive dynamics

Two identical patches with the same inputs will always behave identically.

⸻

6. Time Model
	•	Single canonical time source
	•	No timelines by default
	•	Multiple phase and rhythm systems coexist
	•	Feedback requires explicit memory boundaries

Time is sampled, not advanced imperatively.

⸻

UI Surfaces (High-Level)

Patch Canvas
	•	Freeform spatial layout
	•	No directional flow implied
	•	Blocks arranged by conceptual grouping

Bus Board (Primary Control Surface)
	•	Always visible
	•	Vertical mixer metaphor
	•	Shows:
	•	all buses
	•	live activity
	•	publishers
	•	combine mode
	•	dominance (sortKey)

Inspector
	•	Block parameters
	•	Port bindings
	•	Interpretation stacks
	•	Composite controls

Transport Bar
	•	Mode switch (Scrub / Loop / Performance)
	•	Time visualization
	•	Global controls (tempo, scale, drift)

⸻

Behavioral Guarantees

Live Editing
	•	Edits never hard-break playback
	•	Old program continues until new one is valid
	•	State is preserved or crossfaded when possible

Feedback Safety
	•	Cycles are allowed only through memory blocks
	•	Illegal cycles are rejected with clear diagnostics

Performance
	•	Dense evaluation is fused and batch-based
	•	Architecture is WASM-ready
	•	No per-element JS object allocation on hot paths

⸻

Composition & Reuse

Composites
	•	Any subgraph can become a composite
	•	Composites expose curated bus interactions
	•	Internals remain inspectable
	•	Composites are first-class blocks

Patch as Instrument
	•	Patches are playable systems
	•	Performance mode emphasizes buses, not blocks
	•	Parameters become gestural controls

⸻

Export Philosophy

Export is a lowering pass, not the core runtime.
	•	SVG/CSS approximations allowed
	•	Chaotic systems may be baked
	•	Fidelity loss is acceptable
	•	Determinism is preserved where possible

⸻

Non-Goals (Explicit)

Loom is not:
	•	A keyframe animation editor
	•	A physics simulator
	•	A shader graph
	•	A replacement for After Effects

Avoid feature creep that violates:
	•	purity
	•	determinism
	•	composability
	•	legibility

⸻

The Canonical Product Statement

Loom enables artists to build and play infinite, deterministic visual systems by shaping shared fields of influence over time.

