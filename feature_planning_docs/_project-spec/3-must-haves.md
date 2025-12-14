3) Must-haves

These are the things you must implement to keep the project coherent, fun, and extensible—especially given your pivot toward ambient/infinite “visual instrument” behavior. I’m going to be specific about why each one is a must-have, and what “done” means.

I’m assuming you already have some of these partially working (patch → compile → program → render), but the list is about what must be solidified so you don’t build future features on sand.

⸻

Must-have 1: A stable “Program Timeline Hint” contract

Why it’s must-have

You can’t make looping seamless-by-default, or auto-size loops, or do meaningful transitions, if the player has no idea what the “natural duration” of a program is.

Right now: hardcoded 10 seconds → mismatch with actual animation structure → jank.

What “done” means
	•	Program can optionally expose:
	•	finite duration (durationMs) and optional cue points
	•	or “infinite” with a recommended presentation window
	•	Compilers for archetypes that have phases/staggers compute a real durationMs from fields + phases.
	•	Player uses this hint by default for loop sizing.

This one change unlocks:
	•	loop sizing
	•	phase markers on scrub
	•	seed scheduling by loop index
	•	clean “play once vs loop” behavior

⸻

Must-have 2: Player-owned PlaybackPolicy (time mapping)

Why it’s must-have

Looping, pingpong, clamping, rate scaling, scrub smoothing—these are playback concerns, not animation semantics. If you leak them into specs, you’ll regret it.

What “done” means

Player has a single mapping:

transportTime → programTime

with:
	•	loop mode: none / loop / pingpong
	•	duration source: program-hint / user override
	•	rate: continuous
	•	scrub smoothing optional (view-level, not semantic)

This gives you “instrument mode” without corrupting the kernel.

⸻

Must-have 3: Hot-swap without popping (Transition wrapper)

Why it’s must-have

Your ambient/instrument vision lives or dies on this:

“I can rewire live and it never interrupts playback.”

If recompiling causes DOM tears, resets, or a visual cut, it will feel broken no matter how correct the math is.

What “done” means
	•	When a new Program<RenderTree> replaces an old one, the player does not instantly swap outputs.
	•	Instead it wraps them in a transition program:
	•	default transition = crossfade 300–800ms
	•	transition is deterministic and scrubbable
	•	Existing playback continues; transition starts at the current transport time.

Even if you later add fancy bridges (particles→lines), this default wrapper is the “never janky” base.

⸻

Must-have 4: Output root selection must be explicit (or unambiguous)

Why it’s must-have

As patches grow, “which program is the output?” becomes the #1 source of confusion.

What “done” means
	•	The patch has an explicit output block (core.outputProgram) or explicit root port.
	•	Compiler errors clearly when:
	•	no output exists
	•	multiple competing outputs exist

This is essential for non-technical users because it turns “why isn’t anything showing?” into a precise, local fix.

⸻

Must-have 5: Compiler error mapping → UI decorations (no modal errors)

Why it’s must-have

Unbreakable UX requires the graph itself to explain what’s wrong.

What “done” means
	•	Every compile error is attributed to:
	•	block, port, wire, or global
	•	UI highlights:
	•	incompatible ports
	•	missing required inputs
	•	cycles
	•	missing block types
	•	When patch is broken:
	•	keep last good program running (no interruption)
	•	show errors visually

This is the “never interrupt the instrument” guarantee.

⸻

Must-have 6: Control Surfaces as first-class editor metadata

Why it’s must-have

If users are stuck editing text fields, the tool will not feel like an instrument.

Control surfaces are the primary interface for non-technical play, especially in ambient mode.

What “done” means
	•	A surface can be authored per macro/archetype
	•	Controls are typed and bounded (sliders/XY/enums/colors)
	•	Bindings are explicit, visible, and debuggable
	•	Reset and dice/seed are built-in patterns

You don’t need modulators immediately, but surfaces must exist.

⸻

Must-have 7: A seed model you can grow (global seed + loop index)

Why it’s must-have

Variety and “super loops” are central to your vision.

If seed is just a single number passed once at compile time, you’ll paint yourself into a corner.

What “done” means (phase 1)
	•	There is a clear concept of:
	•	globalSeed
	•	loopIndex
	•	Programs/specs can access a derived seed:
	•	seedForLoop = hash(globalSeed, loopIndex)
	•	Player increments loopIndex on loop wrap (finite programs).

This alone enables: “every loop is a little different.”

What you don’t need yet
	•	per-block seeds
	•	seed routing graphs
But you should not design anything that makes them painful later.

⸻

Must-have 8: A “loop-safe defaults” posture in Simple Mode

Why it’s must-have

You said:

“Looping should be first-class and seamless by default.”

That means Simple Mode should bias toward loop-safe:
	•	periodic noise over random walk
	•	phase machines that come back to a compatible state
	•	“seam meters” later

What “done” means
	•	Simple-mode presets/macro defaults are loop-safe
	•	Player defaults to loop mode
	•	Export defaults to loopable format when possible

⸻

Must-have 9: RenderTree stability (identity continuity)

Why it’s must-have

To avoid jank during live edits and transitions, the renderer needs stable element identity across frames.

What “done” means
	•	RenderTree nodes have stable ids
	•	Renderer performs keyed updates (not full rebuild)
	•	Changing a param doesn’t recreate the entire DOM subtree if it can be updated in place

This is a huge part of “smoothness” and perceived quality.

⸻

Must-have 10: A single canonical “Program lane” chain model

Why it’s must-have

To make the “instrument” intuitive, there should be a clear place where:
	•	the base program is compiled
	•	compositors stack
	•	transitions wrap

What “done” means
	•	The UI strongly suggests:
	•	compile produces Program<RenderTree>
	•	compositors consume/produce Program<RenderTree>
	•	output consumes Program<RenderTree>
	•	Auto-wiring supports this chain.

This is the backbone of a live effects rack.

⸻

Priority order (if you’re sequencing work)

If you want the fastest path to your “ambient instrument” feel while preserving everything:
	1.	TimelineHint + PlaybackPolicy
	2.	Transition wrapper hot-swap
	3.	Keep last-good program on compile failure
	4.	Explicit output root + strong errors
	5.	Control surfaces (replace text fiddling)
	6.	Loop-safe defaults + seed/loopIndex
	7.	RenderTree identity stability

Everything else builds on these.

⸻

Why these must-haves are the “unlock set”

Because they establish three non-negotiable user experiences:
	1.	I can play forever (loop sizing, seamless loop defaults)
	2.	I can change things live (hot swap transitions, no interruption)
	3.	I can understand what’s wrong (decorations, last-good run)

If you hit those, the project becomes “sticky” and people will forgive missing features.

⸻

If you say next, I’ll do the fourth message: Should-haves (the high-leverage capabilities that massively improve power/fun but can safely land after the must-haves).