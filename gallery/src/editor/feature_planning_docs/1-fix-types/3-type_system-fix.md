Below is the type system that will make Loom approachable and keep your kernel honest, followed by a blunt evaluation of the composite-block plan (it’s a good direction, but a couple adjustments will save you months).

⸻

1) The approachable type system you need

You don’t actually need a “fancier” type system. You need a more opinionated one with:
	•	a small number of user-visible concepts,
	•	explicit adapters,
	•	and a rule that prevents “mystery compatibility.”

1.1 Two-world model (this should be the top-level UX)

Every port lives in exactly one of these worlds:

Signal

“One value over time.”
Examples: speed, phase, hue, beat, camera shake.

Field

“One value per element over time.”
Examples: per-particle size, per-path delay, per-glyph progress.

In UI: every port badge starts with S or F. If you do only one thing, do this.

⸻

1.2 User-facing domains (keep it small)

Then each port has a domain. Keep the set tight and opinionated:

Core domains
	•	num (scalar)
	•	vec2 (point/2D vector)
	•	color
	•	bool
	•	trigger (events, pulses)

Time domains (critical for looping)
	•	phase (cyclic 0..1)
	•	time (seconds) — call it time in UX, not Duration
	•	rate (1/seconds or Hz) — optional, but helpful

Structure domains (advanced; keep mostly hidden)
	•	id (stable hash / element id)
	•	index (integer-ish)

Transport (strong recommendation)

Do not expose Transport as a general-purpose pluggable type.
Make it a structural/internal thing with a controlled “readout” surface:
	•	transport.phase : phase
	•	transport.t : time
	•	transport.dt : time
	•	transport.trigger : trigger (optional)
	•	transport.gate : bool (optional)

Why: once users can plug Transport into random places, you’ll never regain intuitive wiring. It’s an implementation carrier, not a creative medium.

So: ports should almost never be Field<Transport> in UX. They should be “Field phase” or “Field time” and a dedicated block can produce or consume transport internally.

⸻

1.3 Units + semantics: separate “what it is” from “how it’s stored”

The confusion you called out (“Field but it feels like progress”) is a semantic typing problem, not a generic typing problem.

Fix this by adding a lightweight semantic tag layer:
	•	num with semantics: { plain | amount | opacity | size | angle | signed }
	•	time semantics: { offset | length | cooldown }
	•	phase semantics: { progress | loopPhase }
	•	vec2 semantics: { point | direction }

This is UI/validation metadata, not kernel math.

Rule: Ports must match on:
	1.	world (S vs F)
	2.	domain (num/phase/time/vec2/…)
	3.	optional semantics (warn or adapt)

Semantics mismatch should not hard-error in v1, but should either:
	•	show a warning badge on the wire (“treating time as progress”), or
	•	auto-insert an adapter if one exists (see below).

⸻

1.4 Compatibility rules (the “no mystery” contract)

Make these rules explicit and consistent:

Hard rules
	•	Signal cannot connect to Field (or vice versa) without an adapter.
	•	Different domains do not connect without an adapter. (time ≠ phase ≠ num)

Soft rules
	•	Semantics mismatch is allowed but visible (badge/warning) unless it’s truly nonsense.

This eliminates the “are all Fields compatible?” question. The answer becomes: no, only via adapters.

⸻

1.5 The adapter set (small, explicit, auto-insertable)

These are the “training wheels” that make patching feel musical instead of technical.

World adapters
	•	Broadcast: Signal<A> -> Field<A>
	•	Reduce: Field<A> -> Signal<A> with min/max/avg/first/byId (start with avg + byId)
	•	MapField: Field<A> -> Field<B> (function-ish wrapper; in UI it can be “Convert…”)

Time/loop adapters (mandatory for ambient UX)
	•	TimeToPhase: time -> phase (needs a period/loop length input)
	•	PhaseToTime: phase -> time (needs a period)
	•	WrapPhase: phase -> phase
	•	PhaseQuantize: phase -> phase or phase -> index
	•	PhaseTrigger: phase -> trigger (on wrap / thresholds)

Numeric shapers (make everything feel good)
	•	RangeMap: num -> num
	•	Curve: num -> num
	•	Slew: num -> num
	•	Softclip/Deadzone: num -> num

Transport readouts (if Transport exists)
	•	TransportReadout: Transport -> (phase, time, dt, trigger, gate)
…and that’s it. Don’t allow arbitrary Transport connections.

Auto-insertion policy

When a user connects incompatible ports:
	•	try to auto-insert exactly one adapter (or a known pair like Signal↔Field + domain cast)
	•	show it as a tiny “chip” on the wire (“Broadcast”, “Time→Phase”)
	•	clicking the chip opens its params (period, reduce mode, etc.)

This is the UX bridge between “typed correctness” and “playable exploration.”

⸻

1.6 How to rename / reframe your current confusing blocks

The specific confusion you cited is exactly what this system fixes:
	•	“Burst Stagger” output should be labeled F · time(offset), not Field<Duration>
	•	“Per-Element Progress” should output F · phase(progress), not Field<Duration>
	•	“Per-Element Transport” should not output Transport to general ports; it should expose phase/time/dt directly.

If you keep Transport as a core internal abstraction, treat it like an engine part: visible in debug, not in the creative UI.

⸻

1.7 What to do with Field<T> in the codebase

You can keep Field<T> and Program<T> exactly as they are.

But you need TypeDescriptor metadata in the registry for every port, something like:
	•	world: 'signal' | 'field'
	•	domain: 'num' | 'phase' | 'time' | 'vec2' | 'color' | 'bool' | 'trigger' | ...
	•	semantics?: string
	•	units?: string
	•	suggestedAdapters?: AdapterId[]

…and the patcher uses that metadata for:
	•	wire validation
	•	adapter suggestions
	•	library search (“show me things that output Field phase”)

This is how you make the editor usable without users reading code.

⸻

