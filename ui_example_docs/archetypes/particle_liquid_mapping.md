Cool — #4 = cross-archetype reuse: Particles ↔ Liquid, at the same “high-level but not outer-space” level.

The punchline: Liquid is just Particles with different render geometry + a goo constraint/filter, and a different trajectory family. Everything else (scene/fields/phases/UI) mostly ports 1:1.

⸻

Particles ↔ Liquid: Canonical Reuse Plan

1) Shared core: “many things moving toward targets”

Both are Transport archetypes:
	•	many indexed elements
	•	each has a start + target
	•	progress drives movement
	•	staggered timing is common
	•	identity is stable

So you should share a TransportSpec skeleton and treat Particles and Liquid as two interpreters / specializations.

⸻

2) The minimal generalization: Transport of “instances”

Define a common mental model:
	•	Instance i has:
	•	startPose(i) → pose
	•	targetPose(i) → pose
	•	u(i,t) → progress
	•	pose(i,t) = transport law

Then:
	•	Particles = instances render as circles (or points)
	•	Liquid = instances render as circles plus a global goo filter and often bigger radii / overlap

So structurally they share:
	•	Scene = targets
	•	Fields = start/timing/style
	•	Phases = entrance/hold/exit
	•	Only trajectory + renderer differ

⸻

3) SceneSpec: identical shape, different semantics

ParticlesScene
	•	targets: Vec2[]

LiquidScene (same, but richer targets)

Liquid benefits from “pose targets”:
	•	targets: { p: Vec2; r: number }[] (target radius matters)

So the shared abstraction is:
	•	targets: Target[] where Target can be:
	•	Vec2 (particles)
	•	{p,r} (liquid blobs)

If you want maximum reuse, lift Particles to also treat radius as part of target pose (even if constant).

⸻

4) Fields: 80% identical

Shared fields (same UI panels!)
	•	startPosition
	•	delay, duration
	•	color
	•	(optional) behavior

Differences
	•	Liquid needs startRadius + targetRadius (or radius field is allowed to vary a lot more)
	•	Liquid often has a group/shared style field:
	•	gooStrength
	•	blur/threshold parameters
	•	“viscosity feel” knobs

So your field layer should allow:
	•	per-instance fields
	•	global fields

⸻

5) Trajectory: same “spine”, different offset law

Both should share the same “transport spine”:

base(u) = lerp(start, target, u)

Where they differ:

Particles trajectory
	•	offset is decorative (spiral/wave/jitter)
	•	motion reads as independent points

Liquid trajectory
	•	offset is physically suggestive:
	•	drop + spread + settle
	•	squash/stretch implied by radius changes
	•	sometimes slight lateral drift
	•	the offset and radius evolution should be piecewise:
	•	Phase A (drop): accelerate down + maybe widen
	•	Phase B (spread): lateral settle + radius stabilizes

So: same base signature, different family of offset(u) and radius(u) laws.

⸻

6) Renderer: primary difference

Particles renderer
	•	many circles with glow

Liquid renderer
	•	many circles plus a filter resource
	•	the visual “liquidness” is almost entirely:
	•	blur + threshold (goo)
	•	overlap
	•	correct radii / spacing
	•	also often:
	•	global background glow
	•	slight per-blob gradient

This means in kernel terms:
	•	Particles: DrawNode(kind: circle)*
	•	Liquid: DrawNode(kind: circle)* AND RenderTree.resources.filter = GooFilter(params)

If you don’t want resources in the kernel yet, treat goo filter as a renderer-specific global parameter.

⸻

7) Phase mapping: identical

Both are typically:
	•	entrance → hold → exit
	•	sometimes exit is just fade/scale down

The same PhaseMachine UI applies.

⸻

8) UI reuse: nearly perfect

You can reuse the Particles UI panels almost unchanged:
	•	Origin
	•	Timing
	•	Color/Glow
	•	Behavior

Liquid adds:
	•	Blob size (range + evolution)
	•	Goo strength panel (global)
	•	“cohesion” feel (really just overlap + blur threshold)

Crucially: it still edits fields + envelopes, never runtime behavior.

⸻

9) Canonical conclusion

Particles and Liquid are the same archetype.
Liquid is a specialization where:
	•	Instance geometry is larger circles
	•	Radius evolution matters
	•	Renderer uses a goo filter
	•	Trajectory is piecewise “drop/spread/settle” instead of spiral/wave

Everything else — scene, determinism, phase, timing, orchestration — is shared.

⸻

If you want the next step in the same style (still not code), I can give you a canonical LiquidSpec header that is literally “ParticlesSpec + radius evolution + goo params”, mirroring what we did for Particles.