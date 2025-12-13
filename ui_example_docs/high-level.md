Here are high-level porting overviews for each of the logo animations you uploaded, framed in terms of the kernel concepts (SceneSpec + Fields + PhaseMachine + Program→RenderTree). I’m keeping this tight.

⸻

logo-02-particles-procedural

What it is: Sample points along logo paths, spawn one particle per point, animate particles from randomized starts to targets with optional “behavior” perturbations (spiral/wave/bounce), then exit/restart.  ￼
Kernel shape:
	•	SceneSpec: logo paths + per-path color; derived targets: Vec2[] by path sampling.
	•	Fields (compile-time): startPos, size, phase, delay/duration, behaviorMode, colorShift.
	•	Trajectory: pos(t)=lerp(start,target,ease(u)) + behaviorOffset(u,phase); opacity=min(1,2u).  ￼
	•	Renderer: Canvas circle draw ops (or RenderTree circles) with glow.
	•	PhaseMachine: entrance → hold → exit → restart.  ￼

⸻

logo-03-morphing-procedural

What it is: Multiple independent SVG paths morph from randomized start shapes into final logo paths; per-path delays/durations; glow/stroke variance; heavy color shifts.  ￼
Kernel shape:
	•	SceneSpec: final logo path d per element + base palette.
	•	Fields: startShape (random shape generator), delay, duration, strokeWidth, glowRadius, paletteShift, easingChoice.  ￼
	•	Trajectory: morphProgress=u; geometry interpolation is the renderer’s job (your file currently parses+interpolates commands).  ￼
	•	Renderer: SVG path DrawNodes; compute d(u) via morph/interpolator.
	•	PhaseMachine: entrance (per-path stagger) → hold → exit/restart (pattern is consistent with your other procedural files even if truncated here).  ￼

⸻

logo-04-glitch-procedural

What it is: Three overlay layers (R/G/B) of the same logo get random offsets, opacity flicker, skew/rotate transforms, plus main logo jitter; stabilizes; then exit/restart.  ￼
Kernel shape:
	•	SceneSpec: base logo geometry as a group; three “glitch layer” instances that reference it.
	•	Fields: rgbOffset, jitterMax, skewAmount, glitchDuration, etc.  ￼
	•	Trajectory: signals for layerTransform(t), layerOpacity(t), filterOffset(t); importantly this must be made seeded (your current code uses per-frame Math.random() a lot).  ￼
	•	Renderer: SVG group + filter params + per-layer transforms.
	•	PhaseMachine: “wild glitch” → “stabilize” → hold → exit.  ￼
Note: This one benefits most from converting randomness into a precomputed event/script or piecewise noise signal (so scrubbing works).

⸻

logo-05-liquid-procedural

What it is: Gooey blob circles fall/spread into letter shapes with an SVG goo filter; each blob has delay/duration and a piecewise motion (drop/spread then settle).  ￼
Kernel shape:
	•	SceneSpec: target “blob anchors” approximating the logo (your code hardcodes point sets per letter).  ￼
	•	Fields: per-blob startX/startY/startR, targetX/Y/R with wildness, delay, duration, dropVelocity, hue, gooStrength.  ￼
	•	Trajectory: piecewise closed-form function of progress (no integrator needed unless you want real fluid).  ￼
	•	Renderer: SVG circles + filter resource parameters (stdDeviation, etc.).  ￼
	•	PhaseMachine: entrance → hold → exit → restart.  ￼

⸻

logo-06-kinetic-procedural

What it is: Each logo part starts off-screen with random translation/rotation/scale, then “slams” into place with an overshoot easing; opacity ramps in; then exit/restart.  ￼
Kernel shape:
	•	SceneSpec: the 6 logo parts (paths/circles) with final transforms = identity.
	•	Fields: per-part startOffset, startRotation, startScale, delay, duration, overshoot.  ￼
	•	Trajectory: transform interpolation driven by easeOutBack(u), opacity min(1,2u).  ￼
	•	Renderer: SVG nodes with transforms + opacity (RenderTree Transform2D).
	•	PhaseMachine: entrance → hold → exit.  ￼

⸻

logo-07-3d-transforms

What it is: Whole logo group does a 3D entrance: rotateY from ~360°, rotateX/Z oscillation, translateZ, scale/opacity; then hold and exit.  ￼
Kernel shape:
	•	SceneSpec: full logo as a single group node.
	•	Fields: entrance duration, perspective params (environment), maybe oscillation amplitudes.
	•	Trajectory: transform(t) = composed 3D-ish transform (you can model this as extended Transform type or as CSS-transform string in backend).
	•	Renderer: DOM/SVG interpreter that supports 3D transforms (backend concern).
	•	PhaseMachine: entrance → hold → exit.  ￼

⸻

logo-08-reveal-mask

What it is: A mask rectangle slides across, revealing the logo; a gradient edge + glow line follow the reveal edge; then hold/exit/restart.  ￼
Kernel shape:
	•	SceneSpec: logo geometry + a mask node + glow line node.
	•	Fields: reveal direction, mask start/end positions, entrance duration, easing.
	•	Trajectory: maskX(u) drives maskRect.x and glowLine.x; glow opacity is a function like sin(pi*u).  ￼
	•	Renderer: SVG mask resources + line.
	•	PhaseMachine: entrance → hold → exit.  ￼
This is the cleanest “first port” after line-drawing because it’s fully closed-form and scrubbable.

⸻

logo-09-wave-ripple

What it is: Each logo part oscillates in translate/scale/rotate like a traveling wave; amplitude decays over the entrance duration; exit collapses inward with wave.  ￼
Kernel shape:
	•	SceneSpec: logo parts as separate nodes with per-part bbox centers (or precomputed anchors).
	•	Fields: waveCount, frequencies, per-part phase offset, entrance duration.
	•	Trajectory: transform signal T_i(t)=wave(i,t)*decay(t); then snap to identity at end of entrance.  ￼
	•	Renderer: SVG transforms.
	•	PhaseMachine: entrance (decaying wave) → hold → exit.  ￼

⸻

logo-10-typewriter

What it is: DOM text “loom99” is built one character at a time with a cursor; then hold; then delete characters quickly; restart.  ￼
Kernel shape:
	•	SceneSpec: target string + styling; cursor node.
	•	Fields: char delay, delete delay, per-char pop animation policy.
	•	Events: this is fundamentally event-script driven (insert/remove).  ￼
	•	Program: generate a deterministic event schedule from seed; fold events into a text state signal; render as Geometry.text + cursor.
	•	PhaseMachine: entrance (emit Insert events) → hold → exit (emit Delete events) → restart.  ￼

Great — here is Particles, done at the same level of concreteness and restraint as the line-drawing overview. No kernel re-explanation, no code, no outer space.

⸻

Particles — High-Level Kernel Port Overview

1. What the animation is (semantic core)

Particles is a many-element assembly animation:
	•	A large set of small, simple primitives (points / circles)
	•	Each particle has:
	•	a start position (often random / off-shape)
	•	a target position (derived from the logo/text geometry)
	•	Over time, particles move toward their targets
	•	Optional perturbations (spiral, wave, jitter) modulate the motion
	•	Identity is preserved for the duration of the animation

This is transport, not morphing.

⸻

2. What is invariant vs variable

Invariant (Scene / Constraint):
	•	The set of target positions that form the logo
	•	The number of particles
	•	Particle identity (index → target mapping)

Variable (Fields):
	•	Start position distribution
	•	Timing (delay, duration)
	•	Motion perturbation parameters
	•	Size, color, glow variance

The animation must satisfy:

At full progress, every particle is at its assigned target.

⸻

3. SceneSpec (what exists)
	•	Scene contains:
	•	targets: Vec2[]
(usually sampled from logo paths or outlines)
	•	Nothing else:
	•	no timing
	•	no randomness
	•	no behavior

This makes the constraint explicit.

⸻

4. Compile-time parameterization (Fields)

Per-particle fields evaluated from (seed, index, count, env):
	•	startPos : Field<Vec2>
	•	delay : Field<number>
	•	duration : Field<number>
	•	radius : Field<number>
	•	color : Field<Color>
	•	behavior : Field<BehaviorKind> (optional)

Procedural vs Varied = same fields, different variance envelopes.

⸻

5. Trajectory (the behavior)

Particles follow a single reusable motion law:

basePos(u) = lerp(startPos, targetPos, ease(u))
pos(u)     = basePos(u) + perturbation(u, behavior)

Key properties:
	•	u is already eased (clock responsibility)
	•	Perturbation is:
	•	bounded
	•	deterministic
	•	usually zero at u = 1
	•	No geometry mutation
	•	No identity switching

This is a pure transport curve.

⸻

6. Timing & coordination
	•	Each particle has its own:
	•	delay
	•	duration
	•	Coordination emerges from:
	•	shared target constraint
	•	staggered clocks
	•	No particle “knows” about others

This is important: cohesion is emergent, not explicit.

⸻

7. Phase structure

Typically:
	•	Entrance
	•	particles move to targets
	•	Hold
	•	particles remain static (or very subtle drift)
	•	Exit (optional)
	•	reverse transport or disperse

Phase rules may change:
	•	whether perturbation is active
	•	whether opacity decays

⸻

8. Rendering responsibility

Renderer does:
	•	draw one primitive per particle
	•	apply position, size, style
	•	possibly batch (Canvas)

Renderer does not:
	•	decide motion
	•	sample randomness
	•	manage timing

⸻

9. What makes this archetype reusable

Once implemented, the same particle animation can produce:
	•	logo assembly
	•	text assembly
	•	image dissolve
	•	scatter → reform
	•	background effects

By changing only:
	•	target field
	•	start field
	•	variance envelope

⸻

10. Canonical description (one sentence)

Particles is deterministic transport of many simple elements toward a geometric constraint, with optional bounded perturbations and staggered clocks.

