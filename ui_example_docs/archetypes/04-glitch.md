Logo-04 Glitch Archetype Document

This document defines everything you need (beyond the kernel + Morphing bedrock) to implement logo-04-glitch-procedural in the new kernel.

This animation is not morphing. It’s a static-geometry, multi-layer glitch compositor:
	•	a main logo layer
	•	three RGB separation layers (R/G/B) created as tinted copies with feColorMatrix + feOffset
	•	time-varying offsets, opacity flicker, and transforms (translate / skew / rotate)
	•	a two-stage entrance: violent glitch → stabilization
	•	then hold → exit glitch+fade

⸻

1) Archetype identity

GlitchComposite = render the same scene multiple times with:
	•	per-layer color channel extraction (or tint)
	•	per-layer offset jitter
	•	per-layer transform jitter
	•	per-layer opacity flicker
	•	global stabilization envelope + exit envelope

⸻

2) Scene spec (immutable constraint)

The scene is just the logo geometry (paths/circles/etc). No animation logic.

export interface GlitchScene {
  id: "logo-04";
  root: DrawNode;          // static geometry tree
  bounds?: Bounds;         // optional (center for transforms)
}

In your HTML, this corresponds to the <g id="logo-main">…</g> that is reused by <use …/>.

⸻

3) Fields (compile-time parameterization)

These are evaluated once at compile time (determinism boundary).
They replace the HTML’s initializeParameters() and all Math.random() use.

export interface GlitchFields {
  // core glitch knobs (per run)
  rgbOffset: Field<number>;        // pixels, e.g. 5..25
  jitterMax: Field<number>;        // pixels, e.g. 15..40
  skewAmount: Field<number>;       // degrees, e.g. 5..25
  rotateMax?: Field<number>;       // degrees, small, e.g. 0..4

  // timing (per run)
  glitchDuration: Field<number>;   // ms, e.g. 600..1800
  stabilizeDuration: Field<number>; // ms, such that glitch+stabilize = entranceTotal (see phases)
  holdDuration: Field<number>;     // ms, default 2000
  exitDuration: Field<number>;     // ms, default 250

  // style
  mainOpacity?: Field<number>;     // default 1
  layerOpacityMax?: Field<number>; // default ~0.5..1 (varies by phase)
}

Important kernel rule: all “randomness over time” must be seeded noise functions of time, not RNG calls each frame.

⸻

4) Phase structure (matches the HTML)

Your HTML entrance is effectively two sub-phases:
	•	wild glitch for glitchDuration
	•	stabilization until entrance total hits ~2500ms

Then:
	•	hold (default 2000ms)
	•	exit (250ms) where RGB offsets blow up and then fade out

Represent it directly:

export interface GlitchPhases {
  machine: PhaseMachine; // phases: glitch → stabilize → hold → exit
}

Canonical defaults (procedural HTML):
	•	glitch: duration = sampled glitchDuration
	•	stabilize: duration = (2500 - glitchDuration) or a sampled stabilizeDuration
	•	hold: default 2000 (URL param)
	•	exit: default 250

⸻

5) Time-varying signals (deterministic “glitch noise”)

Instead of Math.random() < 0.1 pauses and per-frame random offsets, use seeded noise.

You need three families of signals:

5.1 Layer offset signals (R/G/B)

For each layer L ∈ {R,G,B}, sample:
	•	dxL(t) in pixels
	•	dyL(t) in pixels

5.2 Layer transform signals

For each RGB layer and optionally the main layer:
	•	tx(t), ty(t) translation
	•	skewX(t) degrees
	•	rot(t) degrees

5.3 Flicker signals

For each RGB layer:
	•	opacity(t) multiplier

All of these should be functions of:
	•	global seed
	•	layer id
	•	time t

No state.

⸻

6) Renderer contract

This archetype relies on “render same geometry multiple times with different filter/transform”.

There are two valid backends:

Option A — SVG filter backend (closest to HTML)

Renderer supports:
	•	feColorMatrix channel isolation
	•	feOffset(dx,dy)
	•	per-layer transform + opacity

Option B — Generic backend (Canvas/WebGL)

Renderer supports:
	•	tinting the geometry to red/green/blue
	•	shifting the rendered layer in screen space

So the contract is:

export interface GlitchRenderer {
  // create one layer (main or rgb)
  layer(args: {
    id: string;
    content: DrawNode;               // static scene root
    channel: "main" | "r" | "g" | "b";
    offset: { dx: number; dy: number };
    transform: { tx: number; ty: number; skewXDeg: number; rotDeg: number };
    opacity: number;
  }): DrawNode;

  compose(rootId: string, layers: readonly DrawNode[]): RenderTree;
}


⸻

7) Spec

export interface GlitchSpec {
  scene: GlitchScene;
  fields: GlitchFields;
  phases: GlitchPhases;
  renderer: GlitchRenderer;
}


⸻

8) Compiler (reference implementation shape)

Compiler responsibilities:
	•	evaluate run-level parameters once
	•	per frame:
	•	sample phase
	•	compute envelopes (intensity/stabilize/exit)
	•	sample deterministic noise for offsets/transforms/flicker
	•	build the four layers and compose

export function compileGlitch(
  spec: GlitchSpec,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const { scene, fields, phases, renderer } = spec;

  // compile-time params (determinism boundary)
  const rgbOffset      = fields.rgbOffset(seed, 0, 1, env);
  const jitterMax      = fields.jitterMax(seed, 0, 1, env);
  const skewAmountDeg  = fields.skewAmount(seed, 0, 1, env);
  const rotateMaxDeg   = (fields.rotateMax ? fields.rotateMax(seed, 0, 1, env) : 3);

  const glitchDur      = fields.glitchDuration(seed, 0, 1, env);
  const stabilizeDur   = fields.stabilizeDuration(seed, 0, 1, env);
  const holdDur        = fields.holdDuration(seed, 0, 1, env);
  const exitDur        = fields.exitDuration(seed, 0, 1, env);

  // ensure phase machine durations line up with sampled numbers
  // (either you build the machine from these, or the machine is already built with them)
  // This doc assumes machine already matches.

  const mainBaseOpacity = fields.mainOpacity ? fields.mainOpacity(seed, 0, 1, env) : 1;

  return {
    signal: (t, ctx) => {
      const ps = PhaseMachine.sample(phases.machine, t);

      // Envelopes (match HTML behavior)
      // glitch: intensity starts high then decays
      // stabilize: intensity decays to 0
      // hold: intensity 0
      // exit: intensity rises then fades with exitProgress
      const e = glitchEnvelopes(ps);

      const layers = (["r","g","b"] as const).map((ch) => {
        // deterministic “glitch noise” for this channel at time t
        const dx = e.rgbAmp * rgbOffset * noiseSigned(seed, ch, "dx", t, e.rateHz);
        const dy = e.rgbAmp * rgbOffset * noiseSigned(seed, ch, "dy", t, e.rateHz);

        const tx = e.jitterAmp * jitterMax * noiseSigned(seed, ch, "tx", t, e.rateHz * 0.7);
        const ty = e.jitterAmp * jitterMax * noiseSigned(seed, ch, "ty", t, e.rateHz * 0.7);

        const skew = e.skewAmp * skewAmountDeg * noiseSigned(seed, ch, "skew", t, e.rateHz * 0.5);
        const rot  = e.rotAmp  * rotateMaxDeg  * noiseSigned(seed, ch, "rot",  t, e.rateHz * 0.4);

        const op = clamp01(e.layerOpacityBase * (0.6 + 0.4 * noise01(seed, ch, "op", t, e.rateHz)));

        return renderer.layer({
          id: `glitch-${ch}`,
          content: scene.root,
          channel: ch,
          offset: { dx, dy },
          transform: { tx, ty, skewXDeg: skew, rotDeg: rot },
          opacity: op,
        });
      });

      // main logo jitter (violent early, subtle later; matches HTML “logo.style.transform”)
      const mainTx = e.mainJitterAmp * (jitterMax * 0.6) * noiseSigned(seed, "main", "tx", t, e.rateHz * 0.6);
      const mainTy = e.mainJitterAmp * (jitterMax * 0.6) * noiseSigned(seed, "main", "ty", t, e.rateHz * 0.6);
      const mainRot = e.mainJitterAmp * rotateMaxDeg * noiseSigned(seed, "main", "rot", t, e.rateHz * 0.4);

      const main = renderer.layer({
        id: "glitch-main",
        content: scene.root,
        channel: "main",
        offset: { dx: 0, dy: 0 },
        transform: { tx: mainTx, ty: mainTy, skewXDeg: 0, rotDeg: mainRot },
        opacity: mainBaseOpacity * e.mainOpacityMul,
      });

      return renderer.compose(scene.id, [main, ...layers]);
    },

    event: () => [],
  };
}


⸻

9) Reference helpers (small, required)

9.1 Envelope logic (phase → amplitudes)

This captures the procedural HTML’s feel: strong glitch, then stabilize, then hold, then exit-blast/fade.

export function glitchEnvelopes(ps: { phase: string; u: number; uRaw: number }) {
  // Default rates: higher in glitch, lower in stabilize, high again in exit
  const rateHz =
    ps.phase === "glitch" ? 45 :
    ps.phase === "stabilize" ? 18 :
    ps.phase === "exit" ? 55 :
    0;

  if (ps.phase === "glitch") {
    const intensity = 1 - ps.u; // 1 → 0
    return {
      rateHz,
      rgbAmp: intensity,
      jitterAmp: intensity,
      skewAmp: intensity,
      rotAmp: intensity,
      layerOpacityBase: 0.9 * intensity,
      mainJitterAmp: intensity,
      mainOpacityMul: 1,
    };
  }

  if (ps.phase === "stabilize") {
    const k = 1 - ps.u; // decays to 0
    return {
      rateHz,
      rgbAmp: 0.35 * k,
      jitterAmp: 0.35 * k,
      skewAmp: 0.2 * k,
      rotAmp: 0.2 * k,
      layerOpacityBase: 0.35 * k,
      mainJitterAmp: 0.25 * k,
      mainOpacityMul: 1,
    };
  }

  if (ps.phase === "hold") {
    return {
      rateHz: 0,
      rgbAmp: 0,
      jitterAmp: 0,
      skewAmp: 0,
      rotAmp: 0,
      layerOpacityBase: 0,
      mainJitterAmp: 0,
      mainOpacityMul: 1,
    };
  }

  // exit
  // In the HTML exit: RGB offsets get huge early, then fade out by exitProgress.
  if (ps.phase === "exit") {
    const exitProgress = ps.u;
    const intensity = 1 - exitProgress;
    return {
      rateHz,
      rgbAmp: 2.0 * intensity,
      jitterAmp: 2.0 * intensity,
      skewAmp: 1.4 * intensity,
      rotAmp: 1.0 * intensity,
      layerOpacityBase: 1.0 * intensity,
      mainJitterAmp: 1.4 * intensity,
      mainOpacityMul: intensity,
    };
  }

  // fallback
  return {
    rateHz: 0,
    rgbAmp: 0,
    jitterAmp: 0,
    skewAmp: 0,
    rotAmp: 0,
    layerOpacityBase: 0,
    mainJitterAmp: 0,
    mainOpacityMul: 1,
  };
}

9.2 Deterministic time-noise (no RNG, scrub-safe)

You want “random-looking” but deterministic jitter. Use hash-based noise sampled at a rate.

export function noise01(seed: number, channel: string, tag: string, tMs: number, rateHz: number): number {
  if (rateHz <= 0) return 0.5;
  const step = Math.floor((tMs / 1000) * rateHz);
  const h = hash32(`${seed}|${channel}|${tag}|${step}`);
  return (h >>> 0) / 0xffffffff;
}

export function noiseSigned(seed: number, channel: string, tag: string, tMs: number, rateHz: number): number {
  return noise01(seed, channel, tag, tMs, rateHz) * 2 - 1;
}

export function hash32(s: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

This replaces the HTML’s per-frame Random.range and “pause” randomness with a stable function of time.

⸻

10) Geometry cache usage (optional but recommended)

Glitch doesn’t need heavy derived geometry, but you can cache:
	•	the static scene.root render node
	•	bounds.center (for transform origin)

Key examples:
	•	{ kind: "SceneRoot", sceneId }
	•	{ kind: "Bounds", sceneId }

⸻

11) Mode hooks

This archetype composes beautifully with your Mode System:
	•	GlitchIntensity mode → scales rgbOffset/jitterMax/skewAmount
	•	Timing mode → sets phase durations (glitch/stabilize/hold/exit)
	•	Palette mode → sets gradient / stroke colors of the base scene (if you want variation)
	•	Procedural vs Varied → widens variance envelopes in the Fields (not compiler)

