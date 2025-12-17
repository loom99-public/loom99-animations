Below is the canonical, aspirational design document for a complete user session, written as if the system already exists at its intended maturity. This is not constrained by current implementation; it is the north star the product, architecture, and UX should be designed around.

You should be able to hand this to:
	•	an engineer to understand why systems exist,
	•	a designer to understand what must be legible,
	•	a future collaborator to understand what kind of instrument this is.

⸻

Canonical User Session: From Empty Patch to Living Ambient System

0. Opening the Editor: First Contact

The user opens the editor and is greeted not by a timeline, not by lanes, but by space.

What they see
	•	A large, empty Canvas
	•	A Bus Board on the right, already populated
	•	A minimal Transport Bar at the top

Default Buses (pre-seeded)

The Bus Board contains five named buses, softly glowing but currently silent:
	•	phaseA (Signal: phase)
	•	phaseB (Signal: phase)
	•	energy (Signal: number)
	•	pulse (Signal: trigger)
	•	palette (Signal: color)

These are not mandatory. They are musical affordances—like a synth booting with oscillators ready.

Nothing is animating yet.

⸻

1. Creating “Stuff to Animate”

The user clicks Add Source.

Source Dock

A panel slides in:
	•	Drop SVG
	•	Paste SVG
	•	Text
	•	Primitives (circle, grid, spiral)
	•	Presets (glyph cloud, wave line, particle spray)

The user chooses Text → “BREATH”.

Instantly:
	•	A text shape appears on the canvas
	•	The system samples it into elements (points along strokes)
	•	An Element Domain is established (TextStrokeDomain)

Nothing moves yet. That’s good.

⸻

2. First Motion: Time Without Timelines

The user adds a Phase Oscillator block.

It has:
	•	frequency
	•	offset
	•	output: Signal<phase>

They bind its output to the phaseA bus.

What happens
	•	The phaseA bus comes alive
	•	Its sparkline begins cycling
	•	No wires are drawn
	•	The Bus Board shows a single publisher under phaseA

Still, the text does not move.

⸻

3. Interpreting Influence: Perception at the Port

The user selects the text block.

In the Inspector:
	•	Stroke position
	•	Stroke width
	•	Color
	•	Opacity

Each input shows a small bus binding slot.

The user clicks Stroke Offset → Bind to Bus → phaseA.

By default, nothing dramatic happens.

Why?
Because the perception boundary is identity.

They click the small lens icon next to the binding.

Perception Stack Opens
	•	Identity
	•		•	Add Transform

They add:
	•	Map Phase → Range (-10px, +10px)

Now:
	•	The text gently breathes left-right
	•	Phase is interpreted spatially

The same bus, new meaning.

⸻

4. Introducing Energy: Shared Intensity

The user adds:
	•	a Noise LFO
	•	a Decay Envelope triggered by nothing yet

They publish both to the energy bus.

Bus Board state

energy now has:
	•	two publishers
	•	combine mode = sum
	•	a lively but uneven signal

They bind:
	•	Stroke width → energy (with Slew)
	•	Opacity → energy (with Deadzone + Scale)

Now:
	•	When energy rises, strokes thicken and brighten
	•	When it falls, they soften

This already feels alive.

⸻

5. Events Without Timelines: Pulse as Gesture

The user adds a Threshold block:
	•	Input: energy
	•	Output: trigger

They publish this to the pulse bus.

The Bus Board now shows:
	•	pulse firing intermittently

They bind:
	•	Color shift → pulse
	•	Phase offset jump → pulse

With transforms:
	•	Quantize
	•	Hold

Now:
	•	Occasionally, the text “jumps” color and rhythm
	•	No timeline
	•	No randomness
	•	Entirely deterministic

This is a playable system.

⸻

6. Layering Phase: Multiple Clocks, One World

The user adds another oscillator:
	•	Very slow
	•	Publishes to phaseB

They bind:
	•	Rotation → phaseB (wrapped, eased)
	•	Vertical drift → mix(phaseA, phaseB)

Now:
	•	Micro motion (phaseA)
	•	Macro drift (phaseB)
	•	Interference patterns appear

The system has multiple time scales.

⸻

7. Field-Level Influence: Per-Element Variation

The user adds a Stable Hash by ID block:
	•	Input: element id
	•	Output: number

They map it to a range and publish to a new bus:
	•	grain

grain is a Field bus.

They bind:
	•	Per-letter offset → grain
	•	Color jitter → grain

Each letter now has:
	•	its own character
	•	stable across time
	•	responsive to global energy

This is structured complexity, not chaos.

⸻

8. Feedback, Safely

The user wants evolution.

They add:
	•	Integrate(energy)
	•	Publish to tension

Now tension:
	•	slowly accumulates
	•	feeds back into energy scaling
	•	crosses thresholds that change behavior

Because Integrate is a memory boundary, the compiler allows it.

Now the system:
	•	evolves
	•	never repeats exactly
	•	never diverges unpredictably

⸻

9. Regime Switching: Ambient Narrative

They add a Regime Switch block:
	•	Input: tension
	•	Outputs: modeA / modeB

They use it to:
	•	mute some publishers
	•	raise sortKey of others
	•	change palette

The Bus Board reflects this:
	•	publishers enable/disable
	•	priorities shift

The animation enters:
	•	calm
	•	agitation
	•	release
	•	calm again

There is narrative without timeline.

⸻

10. Live Editing Without Breakage

While it runs:
	•	the user adds a new publisher
	•	changes a combine mode
	•	tweaks a perception transform

The system:
	•	recompiles lazily
	•	crossfades state if needed
	•	never snaps or glitches

This is an instrument, not a render graph.

⸻

11. Composing Higher-Level Control

Satisfied, the user selects:
	•	oscillators
	•	envelopes
	•	regime logic

They choose Create Composite → “Breath Engine”.

It collapses into one block:
	•	exposes energy, pulse, phase
	•	hides internals

They reuse it:
	•	on another text
	•	on a particle system
	•	on a background field

Now one system drives many visuals.

⸻

12. Performance Mode

The user switches to Performance Mode.
	•	Bus Board becomes a mixer
	•	Publishers get mute/solo
	•	Sliders appear for sortKey and gain
	•	XY pads map to bus values

They play it live.

⸻

13. Export

They choose:
	•	“Export Ambient Loop”
	•	30s super-loop
	•	SVG + CSS approximation

The system:
	•	bakes chaotic fields
	•	preserves feel
	•	outputs something deployable

⸻

14. What This Session Demonstrates

This single session touches:
	•	Signal buses
	•	Field buses
	•	Perception transforms
	•	sortKey dominance
	•	feedback with memory
	•	multi-scale time
	•	compositing via buses
	•	composites
	•	live editing
	•	performance mode
	•	export

And nowhere did the user:
	•	draw a timeline
	•	manage frames
	•	fight wiring spaghetti
	•	guess what order things run in

⸻

The Canonical Principle (Put This at the Top of the Docs)

Users do not build animations.
They cultivate int

