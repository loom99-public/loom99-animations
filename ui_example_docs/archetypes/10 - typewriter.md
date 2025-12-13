
Logo-10 Typewriter Archetype Document

This document defines everything you need (beyond the kernel) to implement logo-10-typewriter in the new kernel.

This archetype is discrete reveal (events + masking), not morphing:
	•	characters (or glyph paths) are revealed in order
	•	optional caret/blink
	•	optional per-character jitter/ink effect
	•	hold
	•	exit (fade or wipe)

It includes:
	•	Spec
	•	Compiler
	•	Renderer contract
	•	Geometry cache entries
	•	Reference helpers
	•	Mode hooks (procedural vs varied)

⸻

1) Archetype identity

Typewriter = reveal a sequence of tokens over time.

Core abstraction:
	•	a token stream T = [t0, t1, …, tN-1]
	•	at time t, the visible prefix length k(t) determines what’s rendered
	•	optionally render a caret at the insertion point

This archetype is fundamentally event-scripted even if you compute k(t) continuously.

⸻

2) Scene spec (immutable constraints)

Typewriter can be done in two interchangeable scene representations:

A) Text-first (preferred)

export interface TypewriterTextScene {
  id: "logo-10";
  text: string;
  layout: {
    fontFamily: string;
    fontSizePx: number;
    letterSpacingPx?: number;
    lineHeightPx?: number;
    maxWidthPx?: number;
    align?: "left" | "center" | "right";
    origin: Vec2; // baseline start
  };
}

B) Glyph geometry (for SVG path text)

export interface GlyphDef {
  id: string;
  advance: number;   // x advance
  bounds?: Bounds;
  node: DrawNode;    // static glyph geometry
}

export interface TypewriterGlyphScene {
  id: "logo-10";
  glyphs: readonly GlyphDef[];
  origin: Vec2;
}

Invariant: scene contains the full final text, no animation logic.

⸻

3) Fields (compile-time parameterization)

Evaluated once (determinism boundary).

export interface TypewriterFields {
  // timing
  startDelay: Field<number>;        // ms
  charInterval: Field<number>;      // ms per character (or token)
  intervalJitter?: Field<number>;   // ms variability
  burstChance?: Field<number>;      // chance to type 2–4 chars quickly (varied)
  burstSize?: Field<number>;        // max burst length

  // visual
  opacity?: Field<number>;
  color: Field<Color>;

  // caret
  caretEnabled?: Field<boolean>;
  caretBlinkHz?: Field<number>;
  caretWidthPx?: Field<number>;
  caretHeightPx?: Field<number>;

  // “ink” feel (optional)
  perCharFadeMs?: Field<number>;    // char fades in over this duration
  perCharJitterPx?: Field<number>;  // tiny jitter on new chars
}


⸻

4) Phase structure

Typewriter is naturally:
	•	entrance: typing occurs until full length
	•	hold
	•	exit: fade out (or reverse typing)

export interface TypewriterPhases {
  machine: PhaseMachine; // typing → hold → exit

  /** optional exit policy */
  exit?: (sample: { phase: string; u: number; uRaw: number }) => {
    opacityMul?: number;
  };
}


⸻

5) Renderer contract

Renderer must support:
	•	render prefix of tokens/glyphs
	•	compute caret position
	•	optionally apply per-character alpha ramp

Keep it declarative:

export interface TypewriterRenderer {
  render(args: {
    id: string;

    // scene can be text or glyphs; pick one path in your codebase
    scene: TypewriterTextScene | TypewriterGlyphScene;

    // dynamic inputs produced by compiler
    visibleCount: number;        // number of tokens visible
    perCharAlpha?: (i: number) => number; // optional fade curve

    // caret
    caret?: {
      index: number;           // insertion point
      visible: boolean;
      color: Color;
      widthPx: number;
      heightPx: number;
    };

    // style
    color: Color;
    opacity: number;
  }): DrawNode;

  compose(rootId: string, node: DrawNode): RenderTree;
}


⸻

6) Geometry cache requirements

If you use glyph scene:
	•	cache glyph layout positions and caret anchor points

Cache entries:
	1.	{ kind: "TypeLayout", sceneId } → { positions: Vec2[], caretPosAt(i): Vec2 }

If you use text-first:
	•	cache shaped glyph runs if you implement shaping (optional)
	•	or just cache per-character positions for monospace/simple layout

⸻

7) Spec

export interface TypewriterSpec {
  scene: TypewriterTextScene | TypewriterGlyphScene;
  fields: TypewriterFields;
  phases: TypewriterPhases;
  renderer: TypewriterRenderer;
  geom: GeometryCache;
}


⸻

8) Compiler (reference implementation shape)

Key idea:
	•	compute a deterministic “schedule” for token times at compile time
	•	at runtime, visibleCount = number of tokens whose scheduled time <= t
	•	this preserves scrubbing determinism even with “bursts” and jitter

8.1 Compile-time schedule

export interface TypeSchedule {
  timesMs: readonly number[]; // length N, monotonically increasing
}

8.2 Compiler

export function compileTypewriter(
  spec: TypewriterSpec,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const { scene, fields, phases, renderer, geom } = spec;

  const tokens = tokenizeScene(scene); // chars or glyphs (deterministic)
  const N = tokens.length;

  // compile-time params (determinism boundary)
  const startDelay = fields.startDelay(seed, 0, 1, env);
  const interval = fields.charInterval(seed, 0, 1, env);
  const jitter = fields.intervalJitter ? fields.intervalJitter(seed, 0, 1, env) : 0;

  const burstChance = fields.burstChance ? fields.burstChance(seed, 0, 1, env) : 0;
  const burstSize = fields.burstSize ? fields.burstSize(seed, 0, 1, env) : 1;

  const baseOpacity = fields.opacity ? fields.opacity(seed, 0, 1, env) : 1;
  const color = fields.color(seed, 0, 1, env);

  const caretEnabled = fields.caretEnabled ? fields.caretEnabled(seed, 0, 1, env) : true;
  const caretBlinkHz = fields.caretBlinkHz ? fields.caretBlinkHz(seed, 0, 1, env) : 2;
  const caretW = fields.caretWidthPx ? fields.caretWidthPx(seed, 0, 1, env) : 3;
  const caretH = fields.caretHeightPx ? fields.caretHeightPx(seed, 0, 1, env) : 18;

  const perCharFadeMs = fields.perCharFadeMs ? fields.perCharFadeMs(seed, 0, 1, env) : 0;

  // deterministic schedule for token reveal times
  const schedule = buildTypeSchedule({
    seed,
    N,
    startDelay,
    interval,
    jitter,
    burstChance,
    burstSize,
  });

  return {
    signal: (t, ctx) => {
      const ps = PhaseMachine.sample(phases.machine, t);

      // "typing phase time" is just ps.tLocal; you can also gate by phase name
      const timeMs = ps.tLocal;

      let visibleCount =
        ps.phase === "typing"
          ? countRevealed(schedule.timesMs, timeMs)
          : ps.phase === "hold" || ps.phase === "exit"
            ? N
            : 0;

      // optional per-character alpha ramp (ink fade-in)
      const perCharAlpha = perCharFadeMs > 0
        ? (i: number) => {
            const ti = schedule.timesMs[i] ?? 0;
            const u = clamp01((timeMs - ti) / perCharFadeMs);
            return u; // linear fade; can be eased
          }
        : undefined;

      // caret blink (deterministic, scrub-safe)
      const caretVisible =
        caretEnabled &&
        ps.phase !== "exit" &&
        ((Math.floor((timeMs / 1000) * caretBlinkHz) % 2) === 0);

      const caret = caretEnabled
        ? {
            index: Math.min(visibleCount, N),
            visible: caretVisible,
            color,
            widthPx: caretW,
            heightPx: caretH,
          }
        : undefined;

      const exit = phases.exit ? phases.exit({ phase: ps.phase, u: ps.u, uRaw: ps.uRaw }) : undefined;
      const opacity = clamp01(baseOpacity * (exit?.opacityMul ?? 1));

      const node = renderer.render({
        id: `${scene.id}-typewriter`,
        scene,
        visibleCount,
        perCharAlpha,
        caret,
        color,
        opacity,
      });

      return renderer.compose(scene.id, node);
    },

    event: () => [],
  };
}


⸻

9) Reference helpers (small, essential)

9.1 Tokenization

export function tokenizeScene(scene: TypewriterTextScene | TypewriterGlyphScene): readonly any[] {
  if ("text" in scene) return Array.from(scene.text); // naive char tokens
  return scene.glyphs; // already tokenized
}

9.2 Deterministic schedule builder

This is the key to “varied typing” without nondeterminism.

export function buildTypeSchedule(args: {
  seed: number;
  N: number;
  startDelay: number;
  interval: number;
  jitter: number;
  burstChance: number;
  burstSize: number;
}): TypeSchedule {
  const times: number[] = new Array(args.N);

  let t = args.startDelay;

  for (let i = 0; i < args.N; i++) {
    // burst logic (deterministic)
    const roll = hash01(args.seed, "burst", i);
    const doBurst = roll < args.burstChance;

    const burstLen = doBurst ? 1 + Math.floor(hash01(args.seed, "burstLen", i) * Math.max(1, args.burstSize)) : 1;
    const localInterval = args.interval;

    // schedule current token
    times[i] = t;

    // advance time
    const j = args.jitter > 0 ? (hashSigned(args.seed, "jitter", i) * args.jitter) : 0;
    const step = Math.max(1, localInterval + j);

    // if burst, next few tokens share a much smaller step
    if (doBurst) {
      const burstStep = Math.max(1, step * 0.25);
      for (let k = 1; k < burstLen && i + k < args.N; k++) {
        times[i + k] = t + burstStep * k;
      }
      t = t + burstStep * burstLen;
      i += (burstLen - 1);
    } else {
      t = t + step;
    }
  }

  return { timesMs: times };
}

9.3 Count revealed

export function countRevealed(timesMs: readonly number[], tMs: number): number {
  // binary search
  let lo = 0, hi = timesMs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((timesMs[mid] ?? 0) <= tMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

9.4 Hash helpers (scrub-safe randomness)

export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}
export function hash01(seed: number, tag: string, i: number): number {
  const h = hash32(`${seed}|${tag}|${i}`);
  return (h >>> 0) / 0xffffffff;
}
export function hashSigned(seed: number, tag: string, i: number): number {
  return hash01(seed, tag, i) * 2 - 1;
}
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}


⸻

10) Mode hooks (procedural vs varied)

Timing modes
	•	steady: fixed interval, no jitter, no bursts
	•	human: small jitter, occasional bursts
	•	fast: shorter interval
	•	dramatic: longer interval + pauses (implemented by schedule adding “pause tokens” or bigger jitter envelopes)

Caret modes
	•	caretOn: enabled, blink 2Hz
	•	caretOff
	•	caretFastBlink: 4–6Hz

Ink modes
	•	inkFade: perCharFadeMs > 0
	•	inkJitter: perCharJitterPx > 0 (renderer uses it for newly typed glyphs)

Procedural vs Varied
	•	procedural: steady or mild human typing, cohesive look
	•	varied: stronger jitter, bursts enabled, per-character fade/ink effects, optional tint shifts

No compiler changes; only field envelopes and renderer styling.

⸻

If you say next, tell me whether you want to continue with the text versions (text-01..text-10) or stop here (logos done).