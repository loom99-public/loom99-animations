Foundational Slice 1: RenderTree + SVG Renderer + Time + Hot Swap

This slice is the bedrock. Everything else (patch compiler, archetypes, compositors, export) depends on it. If this layer is shaky, you’ll feel pain forever.

What you build in this slice

A “real” runtime that can:
	1.	Maintain a single running RAF loop
	2.	Swap in a newly compiled Program<RenderTree> instantly (hot swap)
	3.	Render a RenderTree into an <svg> using stable node ids
	4.	Support a minimal subset of effects that compositors will rely on immediately:
	•	opacityMul
	•	transform2d
	•	(optional now, but architect for it) transform3d semantic node

At the end of this slice, you can drive any program (even a hardcoded one) and see it animate, scrub it, pause it, etc.

⸻

1) Why this must exist first

A) RenderTree is your “IR”

Your whole philosophy is: archetypes + compositors compile to a semantic render tree. That means:
	•	render tree must be expressive enough to carry intent (effects)
	•	renderer must be deterministic and stable (node identity matters)
	•	the whole system must be time-driven (scrubbable)

If you start by rendering “whatever the archetype spits out” without stable IDs and without a consistent render model, you’ll later have to rewrite both the kernel and the editor.

B) Hot swap is non-negotiable

In a patch editor, compilation happens constantly:
	•	drag blocks
	•	tweak params
	•	switch modes
	•	edit text

You need a runtime that can swap programs without resetting the world or leaking DOM nodes.

C) Incremental rendering is how you unlock compositors

Compositors rely on:
	•	stable selection (byTag, byId)
	•	stable node ids for caching and for wrapping

If every frame rebuilds the entire SVG, selection, caching, and even “node is the same thing” becomes muddy.

⸻

2) The exact architecture to implement

2.1 “Player” object (single source of truth)

The runtime should be a small state machine:
	•	holds current programFactory (compiled result)
	•	holds current programInstance (the one being evaluated)
	•	holds current tMs
	•	holds playback mode (playing/scrubbing)
	•	owns RAF loop

type ProgramFactory = (seed: Seed, scene: Scene, ctx: CompileCtx) => Program<RenderTree>;

interface Player {
  setFactory(factory: ProgramFactory): void;
  setSeed(seed: Seed): void;
  setScene(scene: Scene): void;

  play(): void;
  pause(): void;
  scrubTo(tMs: number): void;

  destroy(): void;
}

Why this shape
	•	compilation outputs a factory, not a running program
	•	swapping factory should not restart RAF (preserves user’s time position)
	•	scrubbing shouldn’t depend on RAF at all

2.2 Program lifecycle: instantiate on swap

When factory changes (or seed/scene changes), create a new instance:

programInstance = factory(seed, scene, compileCtx)

Then the loop does:

tree = programInstance.signal(tMs, runtimeCtx)
renderer.render(tree)

Why instance matters
Some programs may capture compiled geometry caches, or precomputed fields, or selection signatures. It’s still pure, but you want a stable “compiled closure” rather than re-creating it per frame.

2.3 Renderer contract: keyed reconciliation

You want a renderer that:
	•	maps node.id → DOM element
	•	updates attributes when node changes
	•	removes nodes that disappeared
	•	renders recursively

Minimum shapes to support now:
	•	svgPath geometry: { kind:"svgPath", d }
	•	optionally circle geometry: { kind:"circle", cx, cy, r }

Minimum effects now:
	•	opacityMul (multiply opacity into subtree)
	•	transform2d (apply transform to subtree)

Implementation strategy (fast + correct)

Represent the SVG DOM as nested <g> groups mirroring your tree:
	•	group node → <g data-id="...">
	•	shape node → <path> or <circle>
	•	effect node → <g> wrapper that applies style/transform

That means effects don’t require renderer to “understand geometry”; they just wrap DOM groups.

This is crucial: it makes compositors trivial to render because compositors mostly insert effect wrappers.

⸻

3) A concrete RenderTree schema for this slice

Keep it close to what you already defined:

type DrawNode =
  | { kind:"group"; id: string; children: DrawNode[]; tags?: string[]; meta?: any }
  | { kind:"shape"; id: string; geom: SvgPathGeom | CircleGeom; style?: Style; tags?: string[]; meta?: any }
  | { kind:"effect"; id: string; effect: Effect; child: DrawNode; tags?: string[]; meta?: any };

type SvgPathGeom = { kind:"svgPath"; d: string };
type CircleGeom = { kind:"circle"; cx: number; cy: number; r: number };

type Effect =
  | { kind:"opacityMul"; mul: number }
  | { kind:"transform2d"; transform: Transform2D }
  | { kind:"transform3d"; transform: Transform3D }; // rendered as best-effort

type Transform2D = {
  translate?: {x:number;y:number};
  rotateDeg?: number;
  scale?: number | {x:number;y:number};
  origin?: {x:number;y:number};
};


⸻

4) How opacityMul and transform2d should work (composition law)

This is where people accidentally make future compositors impossible.

4.1 Opacity must compose multiplicatively down the tree

If you have:
	•	parent opacity = 0.5
	•	child opacity = 0.5

Then effective opacity must be 0.25.

That means renderer needs a recursive “effective style” accumulation.

Pure rule
	•	Effects are semantic nodes
	•	Renderer can implement them by accumulating a rendering context

So your renderer traversal should maintain a context:

ctx.opacity *= mul
ctx.transform = ctx.transform ∘ localTransform

And only when emitting a DOM element do you apply it.

4.2 Transform2D composition order matters

If you don’t pick a consistent convention now, compositors will fight.

Pick this:
	•	transforms are applied parent first, then child (standard)
	•	local transform is post-multiplied into accumulated transform

Even if you don’t implement full matrices yet, define the rule now so later you can swap in matrices without semantic change.

⸻

5) Scrubbing: why the runtime must be “time as input”

Scrubbing is not a feature; it’s a philosophical constraint:
	•	no hidden time integration
	•	no “simulate forward” requirement
	•	no dependence on previous frames

So:
	•	signal(tMs) must be callable at arbitrary times
	•	player must support scrubTo(tMs) by simply setting time and rendering once

This is also what makes CSS export feasible later (sample → keyframes).

⸻

6) Hot swap semantics: what happens when patch changes?

When you compile a new program, you have two options:

Option 1: reset time on swap

Simple but annoying.

Option 2: preserve time (recommended)

When swapping program instance:
	•	keep tMs unchanged
	•	render new program at that time

This is consistent with “time is an input”.

If you later want continuity for stochastic choices, you handle it at the seed/field level, not at runtime.

⸻

7) “Proof program” for this slice (no patch compiler yet)

To test this slice, create a hand-authored Program<RenderTree>:
	•	a single path (or circle)
	•	opacity pulsing
	•	transform translate oscillation

Example tree:
	•	group root
	•	effect transform2d
	•	effect opacityMul
	•	shape path

This validates:
	•	effect wrappers
	•	style accumulation
	•	stable ids
	•	time-driven rendering

⸻

8) “Gotchas” to catch early

A) DOM transform origin in SVG is weird

If you try to use CSS transforms directly on <path>, you’ll run into quirks.

Best approach:
	•	use <g> wrappers and set transform="translate(...) rotate(...) scale(...)" as an SVG attribute, not CSS
	•	implement origin by translating to origin, rotating, translating back

B) IDs must be stable across frames

If the program generates random ids per frame, you lose reconciliation and everything flickers.

Rule:
	•	node ids are compile-time stable (derived from scene ids / indices)
	•	never include time in ids

C) Avoid per-frame allocations where easy

Not for perf right now, but because it hides bugs:
	•	if every render rebuilds the entire tree with new object identities, you can still reconcile by id, but debugging is harder
	•	keep ids stable and don’t reuse ids incorrectly

⸻

9) Definition of Done for Slice 1

You have a page where:
	•	a compiled (or hardcoded) Program<RenderTree> runs in an <svg>
	•	play/pause works
	•	scrubbing the time slider updates correctly
	•	swapping the program factory live replaces the animation without restarting the loop
	•	opacityMul and transform2d work and compose
