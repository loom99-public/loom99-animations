3) The UX shift to infinite/ambient is mostly a transport model + time UI change

You asked: not technically—what does it look like?

Right now the UI screams “5 second clip”: scrub bar, start/end, entrance/hold/exit.

For ambient/infinite, the user needs two simultaneous truths:
	1.	it runs forever,
	2.	it has repeating structure at multiple scales (“rhyming time”).

A. Introduce a global Time Mode switch (top bar)
	•	Clip (finite, scrub-first)
	•	Loop (cycle-first, scrub ok)
	•	Ambient (performance-first, scrub is “reintegrate from start”)

This switch should visibly change the editor:

In Loop mode
	•	the timeline becomes a Cycle Viewer (0..1 phase)
	•	“Loop Length” is a big control (seconds or beats)
	•	show “Loop Seam” and guarantee seamlessness by default

In Ambient mode
	•	timeline shows a moving window (last 10s / 30s / 2m)
	•	plus a small Cycle Ring indicator if any cycles exist
	•	scrubbing warns: “Re-simulate from Initial Conditions”

B. Add a “Loop Stack” panel (this is the “music” metaphor made tangible)

Ambient visuals that “rhyme” come from layered periodicities:
	•	micro loop: 1–4s (wiggles, strokes, shimmer)
	•	mid loop: 8–32s (formation changes, groupings)
	•	macro loop: 1–5m (regime drift, palette evolution)

Represent these as named loop layers:
	•	Loop A: 4s
	•	Loop B: 16s
	•	Loop C: 2m

Each loop exposes a Phase signal (0..1) and optional triggers at boundaries.

Now the user can see the interwoven loops and intentionally map them.

C. “Infinite but repeating some part of it”

That’s basically: stable cycles + slow deterministic drift.

UX-wise, make Drift explicit:
	•	a knob: Drift Rate
	•	a knob: Drift Amount
	•	a dropdown: drift target (palette / camera / emitter / spacing / mode)

Under the hood drift can be:
	•	very low-frequency phase modulation,
	•	attractor readouts,
	•	state morph between initial conditions,
	•	slow parameter walk driven by deterministic dynamics.

But the UX is: “it repeats, but it doesn’t get stale.”