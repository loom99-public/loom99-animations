Got it — thank you for the correction. You’re right, and this is on me.
Below is just the compiler, written to sit on top of the kernel/types you already have, with no redefinitions, no re-explaining phases, no scene/type boilerplate.

I’ll assume the following already exist in your codebase (as we’ve discussed repeatedly):
	•	Field<T>
	•	PhaseMachine
	•	Program<RenderTree>
	•	Scene / LineScene (strokes with final geometry)
	•	ModeSystem (resolves fields)
	•	RenderTree + path renderer
	•	Env, Seed

I will only show how the Line Morph archetype is compiled.

⸻

LineMorphCompiler — Reference Implementation

Purpose (one sentence)

Compile line-drawing / morphing strokes by mapping a scalar morph progress into geometry interpolation, coordinated by per-stroke fields.

⸻

Compiler Signature

export function compileLineMorph(
  scene: LineScene,
  modes: readonly ModeKey[],
  phaseMachine: PhaseMachine,
  modeSystem: ModeSystem<LineMorphModeFields>,
  seed: Seed,
  env: Env
): Program<RenderTree>


⸻

Core Idea (very compact)

For each stroke i:
	•	fields decide when it animates
	•	phase machine decides global progress
	•	renderer derives geometry from:

morph = clamp((t - delay) / duration)


	•	geometry interpolation happens inside render, not here

⸻

Implementation

export function compileLineMorph(
  scene: LineScene,
  modes: readonly ModeKey[],
  phaseMachine: PhaseMachine,
  modeSystem: ModeSystem<LineMorphModeFields>,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const count = scene.strokes.length;

  // Resolve stacked modes into one composed bundle
  const composed = modeSystem.resolve(modes);

  // Pull required fields (fallbacks omitted for brevity)
  const originF       = composed.fields.origin!;
  const delayF        = composed.fields.delay!;
  const durationF     = composed.fields.duration!;
  const strokeWidthF  = composed.fields.strokeWidth!;
  const glowRadiusF   = composed.fields.glowRadius!;
  const colorF        = composed.fields.color!;
  const opacityF      = composed.fields.opacity ?? (() => 1);

  // Precompute per-stroke static params (determinism boundary)
  const params = scene.strokes.map((_, i) => ({
    origin:       originF(seed, i, count, env),
    delay:        delayF(seed, i, count, env),
    duration:     durationF(seed, i, count, env),
    strokeWidth:  strokeWidthF(seed, i, count, env),
    glowRadius:   glowRadiusF(seed, i, count, env),
    color:        colorF(seed, i, count, env),
    opacity:      opacityF(seed, i, count, env),
  }));

  // ---- PROGRAM ----

  return {
    signal: (t) => {
      const phaseSample = PhaseMachine.sample(phaseMachine, t);

      const nodes = scene.strokes.map((stroke, i) => {
        const p = params[i]!;

        // Local time for this stroke
        const localT = phaseSample.tLocal - p.delay;
        const uRaw   = p.duration <= 0 ? 1 : localT / p.duration;
        const u      = clamp01(uRaw);

        // Phase-aware morph rule
        const morph =
          phaseSample.phase === "entrance" ? u :
          phaseSample.phase === "hold"     ? 1 :
          phaseSample.phase === "fold"     ? 1 :
          1;

        // Tail position rule (only moves during entrance)
        const tail =
          phaseSample.phase === "entrance"
            ? lerp(p.origin, stroke.p0, morph)
            : stroke.p0;

        return renderMorphStroke({
          id: stroke.id,
          stroke,
          tail,
          morph,
          style: {
            stroke: p.color,
            strokeWidth: p.strokeWidth,
            opacity: p.opacity,
            glowRadius: p.glowRadius,
          },
        });
      });

      return { root: { id: scene.id, children: nodes } };
    },

    event: () => [],
  };
}


⸻

What This Compiler Does Not Do (by design)
	•	❌ parse SVG path strings
	•	❌ compute geometry interpolation math
	•	❌ manage easing curves
	•	❌ handle randomness
	•	❌ know anything about UI

Those live in:
	•	scene derivation
	•	renderer
	•	phase machine
	•	fields / modes

⸻

Where Morphing Actually Happens

Not here.

This compiler produces:

{ tail: Vec2, morph: number }

Your renderer interprets that as:

straight scaffold (origin → p0)
   → interpolate points → final stroke geometry

That keeps the compiler:
	•	tiny
	•	archetype-specific
	•	testable
	•	swappable

⸻

Why This Is the “Correct” Shape

This compiler is:
	•	Archetype-specific (line morph semantics)
	•	Kernel-compliant (pure, deterministic)
	•	Mode-driven (no branching logic)
	•	UI-agnostic
	•	Composable (fits the unified editor)

You can write the Particles compiler, RevealMask compiler, etc. with the same structural shape.

⸻

If you want next, I strongly recommend one of these (short, surgical):
	1.	renderMorphStroke(...) reference implementation
	2.	Minimal LineScene derivation from SVG paths
	3.	How line morph modes (converge / cascade / diagonal) plug into this compiler

Just say which.