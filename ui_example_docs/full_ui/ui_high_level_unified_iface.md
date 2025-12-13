They can share a single unified interface — you just need to unify at the right level.

Yes, different archetypes have different natural skeletons (Particles has “Origin→Transport”, Typewriter has “Event Script→Fold”), but you can present one UI if you treat every animation as the same thing:

A Program that produces a RenderTree, built from modules that transform Signals, Events, Fields, and Render.

The trick

Use one universal patch-bay with a few fixed lanes, and let archetypes be presets/templates that populate those lanes with sensible defaults.

⸻

A single unified UI skeleton that represents everything

Lane A: Scene
	•	“What exists / constraints / assets”
	•	target geometry, text, sampled points, groups

Lane B: Parameterization
	•	Fields (seeded, per-element): origin, delay, duration, size, color, etc.
	•	everything here is “compile-time-ish”

Lane C: Time
	•	Clocks / easings / phase machines
	•	global speed and per-track timing

Lane D: Dynamics
	•	optional stateful modules: integrators, spring, noise signals
	•	(most archetypes leave this empty)

Lane E: Composition
	•	parallel / sequence / stagger / group / trigger
	•	“how many things relate”

Lane F: Render
	•	renderer backend + post effects (glow, goo, mask, blur)
	•	output is always a RenderTree

That’s one interface. Every archetype just uses a different subset.

⸻

How archetypes fit without changing the UI

Particles
	•	Scene: targets (points)
	•	Fields: startPos, delay, duration, radius, color, behavior
	•	Time: phase machine
	•	Dynamics: usually empty
	•	Render: circles + glow

Line drawing
	•	Scene: final paths + correspondence
	•	Fields: origin, delay, duration, style
	•	Time: phase machine
	•	Render: path interpolation

Reveal mask
	•	Scene: logo + mask geometry
	•	Fields: direction, mask bounds
	•	Time: entrance/hold/exit
	•	Render: mask + edge glow

Typewriter
	•	Scene: final string + layout
	•	Fields: charDelay, deleteDelay
	•	Composition/Dynamics lane: event script generator + fold
	•	Render: text nodes + cursor

So archetypes don’t require different skeletons — they require different default module sets inside the same lanes.

⸻

Make it “drag-and-drop and unbreakable”

To keep it impossible to break, you don’t allow arbitrary wiring. You use:

1) Typed slots inside each lane

Example:
	•	Field slot expects Field<T>
	•	Motion slot expects Trajectory<T>
	•	Script slot expects Event<Op>
	•	Fold slot expects scan-like reducer

So users can drag anything anywhere, but it only snaps where it type-checks.

2) Every lane has a valid default

If a slot is empty, it falls back to:
	•	identity transform
	•	constant field
	•	no-op effect
So the animation always runs.

3) “Adapters” are first-class blocks

These are your secret sauce for unification:
	•	Event → Signal (hold last value)
	•	Signal → Event (threshold crossings)
	•	Field → Signal (freeze compiled params)
	•	Scene → Targets (sample paths into points)

Adapters let very different archetypes still live in one UI.

⸻

How it feels to users

Users see one consistent workspace:
	•	left: block library (Fields, Time, Motion, Events, Effects)
	•	center: lanes with slots (Scene, Fields, Time, Dynamics, Composition, Render)
	•	right: inspector for the selected block
	•	bottom: timeline scrubber + seed + intensity

They drag blocks in; everything still looks cool because:
	•	ranges are clamped
	•	defaults are aesthetic
	•	every block has preview + safe envelopes

⸻

Practical recommendation

Make archetypes a template button, not a different editor:
	•	“Particles”
	•	“Line Draw”
	•	“Reveal”
	•	“Typewriter”
Clicking one just drops a pre-wired set of blocks into the same lanes.

⸻

If you want, I can sketch:
	1.	the exact lanes + slot types (as TypeScript “UI schema”), and
	2.	the minimal adapter blocks that make the unified UI actually work (Field→Signal, Event→Signal, etc.).