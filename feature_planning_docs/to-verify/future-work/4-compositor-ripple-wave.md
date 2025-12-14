You can keep the same “purity story” as your discrete archetypes. The trick is to treat deformation as a semantic effect that can be realized by different backends, and to provide a “pure lowering” path when a backend only understands discrete geometry.

There are two clean implementations that preserve your philosophy:

⸻

1) Make WaveRipple a compositor (semantic), not an archetype

In your render tree you already have:
	•	archetypes that produce discrete nodes (shape, group)
	•	compositors that wrap nodes with semantic effect nodes

So WaveRipple becomes:

Program<RenderTree> → Program<RenderTree> by wrapping content in { kind:"effect", effect:{ kind:"deform", field: D } }

Add one effect type

type Effect =
  | { kind: "deform"; field: DeformField; domain?: "object" | "screen" }
  | ...;

type DeformField = {
  kind: "waveRipple";
  amplitudePx: number;
  wavelengthPx: number;
  speed: number;
  direction?: Vec2;
  origin?: Vec2;
  // secondary wave etc.
};

Now you have maximal purity: the program says “this subtree is deformed by this field”, without committing to how.

⸻

2) Provide two backends for the same effect

A) Renderer-native deformation (SVG filter / WebGL shader)

If the renderer can do it, it directly interprets the deform node:
	•	WebGL: pass field params to shader (best fidelity)
	•	SVG: map it to a filter stack (turbulence + displacementMap) or a prebuilt displacement texture if you go fancy

This path is purely renderer-level.

B) Pure lowering: “deform by rewriting geometry”

When the renderer cannot deform, you “compile away” the deform effect into more primitive geometry.

This is still pure because it’s just:
	•	precompute a discretization once (geometry cache)
	•	per frame, compute new geometry as a deterministic function of (t, seed, params)

No state, scrub-safe.

⸻

3) The lowering strategy that stays elegant

Step 1: add a “deformable geometry adapter” interface

Your kernel shouldn’t assume geom is deformable. So define an adapter:

interface DeformAdapter {
  canDeform(shapeGeom: unknown): boolean;

  // compile-time: discretize the geometry into a representation that can be deformed fast
  bake(shapeGeom: unknown, quality: number, cache: GeometryCache): BakedGeom;

  // runtime: apply deformation to baked geometry and return a new renderer-native geom
  deform(baked: BakedGeom, field: (p: Vec2) => Vec2, cache: GeometryCache): unknown;
}

For SVG paths, BakedGeom is typically:
	•	a polyline (points along the path) + stroke style
	•	or per-segment samples

Step 2: precompute geometry once (cache)

For each shape node under the deform effect:
	•	parse/flatten the path to a polyline at some quality (arc-length sampling)
	•	store in cache keyed by (nodeId, quality, sourceGeomHash)

Step 3: per frame, displace points and rebuild

At time t:
	•	build a function Δ(p,t) from your ripple parameters
	•	for each point in the baked polyline: p' = p + Δ(p,t)
	•	rebuild a path string (M p0 L p1 L ...) or your renderer’s path primitive

That is “discrete elements”, just at a finer granularity.

And it’s philosophically consistent: you’re still producing a RenderTree where geometry is explicit at time t.

⸻

4) Where this fits in your kernel architecture

You now have three layers, all pure:
	1.	Program layer: archetypes + compositors produce semantic effects
	2.	Lowering layer (optional): rewrite semantic effects into primitive geometry when needed
	3.	Renderer layer: draw primitive geometry and/or interpret remaining effects

This is the same pattern as compilers:
	•	keep high-level IR
	•	lower when targeting a restricted backend (like SVG/CSS export)

⸻

5) How to keep it “maximally pure”

Treat deformation as a coordinate map, not “mutation”

The pure definition is:
	•	Each frame output is G(t) = deform(G0, D_t)
	•	D_t is a deterministic function of t (and compile-time params)

No previous state. No random per frame. Scrub-safe.

Make deformation domain explicit

Wave ripple needs a choice:
	•	screen space: ripple field is global across whole scene
	•	object space: ripple is relative to each node’s local coordinates

Add domain to the effect. That removes ambiguity and keeps composition lawful.

Ensure effect ordering is explicit

Deform ∘ Transform3D is not the same as Transform3D ∘ Deform.

In your compositor stack, order is already explicit. Great.

⸻

6) What about fidelity vs file size?

This architecture gives you a principled export story too:
	•	If exporting to “CSS-only SVG”: deformation is not representable → lowering chooses either:
	•	bake frames (highest fidelity, huge SVG), or
	•	degrade to opacity/transform-only effects

Same mechanism, same purity: “target-dependent lowering.”

⸻

7) Concrete recommendation for WaveRipple in your system
	1.	Implement WaveRipple as a compositor that wraps a subtree with effect: { kind:"deform", field:"waveRipple" }.
	2.	Add a LoweringPass that:
	•	finds deform effects
	•	if renderer supports them: leave as-is
	•	else: rewrite subtree by baking+deforming shapes into explicit geometry

That preserves your “v4 discrete archetypes” feel, while still allowing truly general “field over arbitrary content” semantics.