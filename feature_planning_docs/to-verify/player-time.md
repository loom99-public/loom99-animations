Do both, but with a very specific split of responsibilities:
	•	Blocks decide “animation time structure” (phases, durations, holds, delays, etc.).
	•	The Player decides “playback policy” (looping, ping-pong, clamp, rate, smoothing, seeking).

Then you connect them with one missing concept: a Duration/Timeline contract that programs can expose optionally, without infecting the whole kernel.

⸻

The core problem with “hardcoded 10s”

Your Player currently treats time like an unbounded axis and then you clamp/loop it manually. But “how long is this animation?” is not a player concern in the abstract, because:
	•	different programs have different natural lengths
	•	some are infinite (noise drift, idle shimmer)
	•	some depend on seed/scene/field evaluation (stagger, duration variance)

So you need a way for a Program to say:
	•	“I have a meaningful finite cycle length L”
	•	or “I’m effectively infinite / don’t loop me”

⸻

The right abstraction: Program optional metadata

Keep your existing Program<T> pure. Add an optional method or side-channel that returns timing hints:

interface Program<T> {
  signal(tMs: number, rt: RuntimeCtx): T;
  event(ev: KernelEvent): KernelEvent[];
  // optional:
  timeline?: (rt: RuntimeCtx) => TimelineHint;
}

type TimelineHint =
  | { kind: "finite"; durationMs: number; recommendedLoop?: "loop" | "pingpong"; cuePoints?: CuePoint[] }
  | { kind: "infinite"; recommendedLoop?: "none" | "loop"; windowMs?: number };

type CuePoint = { tMs: number; label: string };

Why this is clean:
	•	doesn’t change what an animation is
	•	doesn’t make the renderer/player know archetypes
	•	lets archetypes report their natural “length” through compilation

If you don’t want to touch Program, you can also return { program, hint } from the compiler, but the optional method is ergonomically nicer.

⸻

Where does the duration come from?

From the same place the truth comes from: the compiled spec / fields.

Example: your entrance/hold/fold line drawing has a natural duration:
	•	entranceDuration
	•	holdDuration
	•	foldDuration
	•	plus the max per-stroke delay + max per-stroke duration (because staggered lines extend the envelope)

So the compiler already knows:
	•	n strokes
	•	delay field evaluated across n
	•	duration field evaluated across n

It can compute:

totalMs =
  entranceBaseMs
  + max(delay[i] + duration[i])   // for entrance completion
  + holdMs
  + foldMs

For particles, maybe:
	•	entrance ramp + hold + exit
or infinite if it’s a continuous emitter.

This also naturally supports “size itself to animation”.

⸻

Player playback policy: separate and composable

Add a small “playback transform” that maps wall-clock time → program time.

type LoopMode = "none" | "loop" | "pingpong";
type PlaybackPolicy = {
  loopMode: LoopMode;
  durationMs?: number;     // if known/finite
  rate: number;            // time scale
  startOffsetMs: number;   // for aligning phases
  smoothSeekMs: number;    // optional easing for scrubs
};

Then in the player:
	1.	ask program for timeline() when you instantiate it
	2.	set policy.durationMs if program reports finite duration
	3.	map time each frame:

tProg = applyPolicy(tWall, policy)
tree = program.signal(tProg, rt)

This keeps “looping behavior” out of the animation spec (good), but uses the animation’s reported length (also good).

Loop mapping (simple + correct)
	•	loop: t % L
	•	pingpong: reflect sawtooth
	•	none: clamp to [0, L]

⸻

Should loop be a block?

Not as the primary mechanism.

Looping is a presentation choice:
	•	preview loop for authoring
	•	export might want a finite loop
	•	user might want pingpong while designing, but final is “play once”

So loop belongs in Player UI.

However: phase structure and duration absolutely belong in blocks/specs. That’s the difference.

⸻

What makes playback “smooth” beyond looping?

A few things that matter a lot in practice:

1) Stable timestep integration for dt spikes

RAF dt varies. If you just do t += dt, you’ll get hiccups.

Fix: clamp dt and optionally substep for physicsy programs:

dt = clamp(dt, 0, 33) // cap at ~30fps jump
t += dt

If you later support physics/integration, you’ll want a separate “simulation clock”. But for your scrub-safe system, dt clamping is usually enough.

2) Scrub smoothing (optional)

Scrub jumps can feel harsh. Add an optional “seek smoothing” that eases the displayed time toward target time over ~100ms.

Important: this is a view smoothing, not changing the program semantics.

3) Phase-aware cue points (nice UX)

If timeline() returns cue points (entrance end, hold end, fold end), you can:
	•	show markers on scrub bar
	•	snap-to-phase boundaries (optional)
	•	display “current phase” label

This makes playback feel intentional and “sized”.

⸻

Concrete recommendation for your next step
	1.	Add timeline?: () => TimelineHint to Program.
	2.	Update each archetype compiler to compute a duration hint when it’s naturally finite.
	3.	Update the Player to:
	•	default duration to program hint if present
	•	default loopMode to hint recommendation (or user preference)
	4.	Add a small transport UI:
	•	loop mode selector (none/loop/pingpong)
	•	“use program duration” toggle
	•	rate slider
	•	scrub bar with cue markers

That will immediately make playback feel “aware” of the animation rather than arbitrary.

⸻

Quick rules of thumb
	•	If the program has phases or a designed beginning/end → finite duration hint
	•	If the program is a continuous idle / infinite field → kind:"infinite" and let player decide a preview window (e.g. 10s)
	•	If the program can be finite but depends on text length / scene size → compute from compiled scene (that’s exactly what compilers are for)
