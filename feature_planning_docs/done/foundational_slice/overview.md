Then don’t do a “toy vertical slice” at all. Do a Foundational Slice: the smallest thing that already is the final architecture—just with fewer block types and fewer render features.

Here’s the plan that gets you furthest toward the endgame, with almost no throwaway work.

The Foundational Slice: end-to-end, real kernel semantics

Goal

From the UI you can build this real pipeline:

Scene → Archetype Spec → Compile → Program(RenderTree) → Compositor Stack → Renderer → Export readiness

…and you can scrub time, swap seeds, and stack compositors.

What you build (in this order)

1) Real RenderTree + stable IDs + incremental renderer

Build the renderer as if it’s permanent:
	•	RenderTree nodes: group | shape | effect
	•	Shape geometry: start with svgPath + circle (enough for line + particles later)
	•	Effect nodes: implement at least:
	•	transform2d
	•	opacityMul
	•	transform3d as a semantic node (renderer may approximate with CSS transform)

Implement a basic keyed-diff by node.id (don’t clear every frame). This is foundational and reused forever.

2) Real time control: Timeline + PhaseMachine

Before any fancy blocks:
	•	A timeline/scrubber that produces tMs
	•	A PhaseMachine block that outputs phases (entrance/hold/exit)
	•	Runtime loop: tree = program.signal(tMs)

This gives you “designed motion” instead of generic oscillation.

3) Lock in the patch compiler as the real compiler

Use the port-typed artifact system we defined.

But constrain the patch language to a minimal real set:

Blocks you need to start (not many)

Lane: Scene
	•	Logo01Scene block (loads the static strokes from your logo-01-line-drawing file or prebuilt JSON)

Lane: Fields
	•	OriginMode(converge/cascade/diagonal) → Field<Vec2>
	•	StaggerTiming → Field<number> delay + Field<number> duration
	•	NeonStyle → Field<Color>, Field<number> strokeWidth, glowRadius

Lane: Phase
	•	EntranceHoldExit → PhaseMachine

Lane: Archetype Spec
	•	LineMorphSpec (takes scene + those fields + phases) → Spec:LineMorph

Lane: Compile
	•	CompileLineMorph → Program<RenderTree>

Lane: Compositor
	•	Transform3DCompositorSpec → Spec:Transform3DCompositor
	•	ApplyCompositor (Program + Spec → Program)

Lane: Output
	•	OutputProgram

That is already the system you want. It’s just missing the other archetypes.

4) GeometryCache + selection utilities (real)

You already have the header.

Hook it up now so later stuff (text sampling, deform lowering) is easy:
	•	cache: parsed SVG paths, flattened polylines, bounds
	•	selection: by tag/id

This is high-leverage.

5) Add the Deform “semantic effect” pipeline now (even if unused)

Even if you don’t use WaveRipple yet, wire in the capability:
	•	RenderTree supports effect: { kind:"deform", ... }
	•	Renderer declares caps.supportsDeform
	•	Lowering passes exist and can run before render

You don’t need to finish the full ripple implementation; you just need the plumbing so it’s not a later refactor.

6) “Export target” readiness: render capabilities + lowering passes

You already want GitHub README CSS-only exports.

So bake in the export model now:
	•	RenderCapabilities (supportsDeform, supports3d, supportsPathMorph, supportsFilters)
	•	LoweringPass[] pipeline
	•	Later: CSS exporter reads a restricted subset

Again: plumbing first.

⸻

What you get after this slice (and why it’s the right one)

After this, you can:
	•	drag blocks
	•	connect them safely (typed ports)
	•	compile to a real V4 Program
	•	scrub time through phases
	•	apply a compositor stack
	•	render a real logo-01 line draw animation (already one of your targets)

…and every line of code remains relevant when you add:
	•	particles
	•	morphing
	•	reveal masks
	•	typewriter
	•	text box → targets
	•	svg/css export

Nothing is thrown away.

⸻

The “first animation” to target under this plan

Do logo-01-line-drawing first (you already have a spec).

Why:
	•	it only needs svgPath shapes
	•	only needs basic effects (opacity/glow as style, optional transform2d)
	•	no deform, no particles, no morph d-attribute
	•	it validates Fields + Modes + Phases + Compile step

Then add Transform3D compositor on top to prove compositors work.

⸻

Concrete deliverable you should aim for (definition of done)

When you’re done with the Foundational Slice, you can:
	1.	In the UI, create this patch:

	•	Scene: logo01
	•	Mode: converge
	•	Timing: stagger
	•	Style: neon
	•	Phases: entrance/hold/fold
	•	Compile: lineMorph
	•	Compositor: transform3d (optional)
	•	Output

	2.	Click Play and see the logo draw in.
	3.	Drag the “mode” block from converge → diagonal and immediately see it change.
