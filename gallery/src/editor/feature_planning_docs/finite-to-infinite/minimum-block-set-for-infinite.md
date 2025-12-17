4) Minimum block set to actually achieve “infinite but rhyming”

If I had to prune and re-found the block library around ambient/looping without adding “magic chaos”, I’d anchor it on time primitives + mapping + state.

A. Time primitives (foundational)
	•	Cycle / Loop Phase (global) → Signal<Phase>
	•	Phase Accumulator (local) + reset input
	•	WrapPhase
	•	Beat/Clock (optional if you want musical time)
	•	Quantize Phase (turn continuous phase into steps)

B. Mapping primitives (so wiring becomes musical)
	•	Map Range
	•	Curve (ease/s-curve)
	•	Slew
	•	Sample/Hold
	•	Deadzone / Softclip
	•	(optional) Wavefolder

C. State/dynamics primitives (explicit)
	•	Integrate (+ integrator mode hidden from novices, but present)
	•	DelayLine (for feedback and “memory”)
	•	Reset / Crossfade State (a policy block, not a math block)

D. “Power blocks” (as macros, later)
	•	Chaotic LFO / Attractor / Delay-feedback oscillator
…but don’t ship these until the adapter/type UX is fixed, or they’ll just add more opaque outputs.

⸻
