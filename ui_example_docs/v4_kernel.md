// kernel.ts — comprehensive, pure animation kernel (TypeScript)
// Focus: semantics + types + minimal reference implementations.
// No DOM, no SVG specifics, no file formats. Backends are interpreters.
//
// Design goals:
// - Pure by default: no ambient randomness, no hidden state.
// - Deterministic: all nondeterminism expressed via Seed/Rand.
// - Composable: strong typed combinators for time, signals, events, programs.
// - Supports: scrubbing, replay, event-driven switching, stateful dynamics.

///////////////////////
// 0) Primitives
///////////////////////

export type Time = number; // seconds
export type Duration = number; // seconds
export type Seed = number;
export type Id = string;

export type Vec2 = { x: number; y: number };

export type Env = {
  viewport: { w: number; h: number };
  // extend freely: dpi, reducedMotion, theme, etc.
};

export type Input = {
  pointer: { x: number; y: number; down: boolean };
  scrollY: number;
  keysDown: ReadonlySet<string>;
};

export type Context = {
  env: Env;
  input: Input;
};

///////////////////////
// 1) Deterministic randomness
///////////////////////

// A pure RNG state. You can swap algorithm without changing the rest of the kernel.
export type RNG = { state: number };

// A pure distribution/sampler. Running it consumes RNG and produces a value.
export type Rand<A> = (rng: RNG) => readonly [A, RNG];

// Helpers to work with Rand.
export const Rand = {
  map:
    <A, B>(ra: Rand<A>, f: (a: A) => B): Rand<B> =>
    (rng) => {
      const [a, r2] = ra(rng);
      return [f(a), r2] as const;
    },

  flatMap:
    <A, B>(ra: Rand<A>, f: (a: A) => Rand<B>): Rand<B> =>
    (rng) => {
      const [a, r2] = ra(rng);
      return f(a)(r2);
    },

  both:
    <A, B>(ra: Rand<A>, rb: Rand<B>): Rand<readonly [A, B]> =>
    (rng) => {
      const [a, r2] = ra(rng);
      const [b, r3] = rb(r2);
      return [[a, b], r3] as const;
    },

  // Run a distribution from a Seed.
  run: <A>(seed: Seed, ra: Rand<A>): A => {
    const [a] = ra({ state: seed >>> 0 });
    return a;
  },
};

// Reference RNG: Mulberry32 (deterministic, fast).
export const RNG = {
  fromSeed: (seed: Seed): RNG => ({ state: seed >>> 0 }),

  nextU32: (rng: RNG): readonly [number, RNG] => {
    let a = (rng.state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    const out = (t ^ (t >>> 14)) >>> 0;
    return [out, { state: a }] as const;
  },

  next01: (rng: RNG): readonly [number, RNG] => {
    const [u32, r2] = RNG.nextU32(rng);
    return [u32 / 4294967296, r2] as const;
  },
};

// Common distributions.
export const D = {
  unit: (): Rand<number> => (rng) => RNG.next01(rng),

  int:
    (minIncl: number, maxIncl: number): Rand<number> =>
    (rng) => {
      const [u, r2] = RNG.next01(rng);
      const n = Math.floor(minIncl + u * (maxIncl - minIncl + 1));
      return [Math.min(maxIncl, Math.max(minIncl, n)), r2] as const;
    },

  range:
    (min: number, max: number): Rand<number> =>
    (rng) => {
      const [u, r2] = RNG.next01(rng);
      return [min + (max - min) * u, r2] as const;
    },

  pick:
    <A>(xs: readonly A[]): Rand<A> =>
    (rng) => {
      if (xs.length === 0) throw new Error("D.pick: empty array");
      const [i, r2] = D.int(0, xs.length - 1)(rng);
      return [xs[i]!, r2] as const;
    },

  // Deterministic "subseed" derivation.
  // Useful for per-element stable random values without sequencing dependence.
  splitSeed: (seed: Seed, salt: number): Seed => {
    let x = (seed ^ (salt * 0x9e3779b9)) >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x7feb352d) >>> 0;
    x ^= x >>> 15;
    x = Math.imul(x, 0x846ca68b) >>> 0;
    x ^= x >>> 16;
    return x >>> 0;
  },
};

///////////////////////
// 2) Time model
///////////////////////

export type TimeTransform = (t: Time) => Time;

// Basic transforms.
export const T = {
  shift: (dt: Duration): TimeTransform => (t) => t - dt,
  scale: (k: number): TimeTransform => (t) => t * k,
  clamp: (t0: Time, t1: Time): TimeTransform => (t) => Math.max(t0, Math.min(t1, t)),
  compose:
    (a: TimeTransform, b: TimeTransform): TimeTransform =>
    (t) => a(b(t)),
};

///////////////////////
// 3) Signals
///////////////////////

// A signal is a pure function of time and context.
export type Signal<A> = (t: Time, ctx: Context) => A;

// Signal combinators (Functor/Applicative-ish).
export const S = {
  of:
    <A>(a: A): Signal<A> =>
    () =>
      a,

  map:
    <A, B>(sa: Signal<A>, f: (a: A) => B): Signal<B> =>
    (t, ctx) =>
      f(sa(t, ctx)),

  ap:
    <A, B>(sf: Signal<(a: A) => B>, sa: Signal<A>): Signal<B> =>
    (t, ctx) =>
      sf(t, ctx)(sa(t, ctx)),

  zip:
    <A, B>(sa: Signal<A>, sb: Signal<B>): Signal<readonly [A, B]> =>
    (t, ctx) =>
      [sa(t, ctx), sb(t, ctx)] as const,

  // Sample a signal at transformed time.
  warp:
    <A>(sa: Signal<A>, tt: TimeTransform): Signal<A> =>
    (t, ctx) =>
      sa(tt(t), ctx),

  // Piecewise: choose between two signals based on predicate.
  choose:
    <A>(cond: Signal<boolean>, onTrue: Signal<A>, onFalse: Signal<A>): Signal<A> =>
    (t, ctx) =>
      cond(t, ctx) ? onTrue(t, ctx) : onFalse(t, ctx),

  // Numeric helpers (common for animation).
  clamp01:
    (sx: Signal<number>): Signal<number> =>
    (t, ctx) => {
      const x = sx(t, ctx);
      return Math.max(0, Math.min(1, x));
    },

  lerp:
    (a: Signal<number>, b: Signal<number>, u: Signal<number>): Signal<number> =>
    (t, ctx) => {
      const aa = a(t, ctx);
      const bb = b(t, ctx);
      const uu = u(t, ctx);
      return aa + (bb - aa) * uu;
    },
};

///////////////////////
// 4) Events
///////////////////////

// An Event is a (possibly empty) set of occurrences at time t.
// We allow multiple occurrences at a single time for completeness.
export type Event<A> = (t: Time, ctx: Context) => readonly A[];

// Core event combinators.
export const E = {
  empty:
    <A>(): Event<A> =>
    () =>
      [],

  of:
    <A>(a: A): Event<A> =>
    () =>
      [a],

  map:
    <A, B>(ea: Event<A>, f: (a: A) => B): Event<B> =>
    (t, ctx) =>
      ea(t, ctx).map(f),

  merge:
    <A>(...es: readonly Event<A>[]): Event<A> =>
    (t, ctx) => {
      const out: A[] = [];
      for (const e of es) out.push(...e(t, ctx));
      return out;
    },

  // Filter occurrences.
  filter:
    <A>(ea: Event<A>, p: (a: A) => boolean): Event<A> =>
    (t, ctx) =>
      ea(t, ctx).filter(p),

  // Gate an event with a condition signal.
  gate:
    <A>(cond: Signal<boolean>, ea: Event<A>): Event<A> =>
    (t, ctx) =>
      cond(t, ctx) ? ea(t, ctx) : [],

  // Convert a boolean signal into an "edge" event.
  // Emits when signal transitions from false->true.
  // Requires state, so this is provided via `scan` (see section 6).
};

///////////////////////
// 5) Fields (compile-time parameterization)
///////////////////////

// A Field is a deterministic generator of per-element values.
// It is evaluated at "compile time" (or whenever seed/env changes).
export type Field<A> = (seed: Seed, index: number, count: number, env: Env) => A;

export const F = {
  constant:
    <A>(a: A): Field<A> =>
    () =>
      a,

  map:
    <A, B>(fa: Field<A>, f: (a: A) => B): Field<B> =>
    (seed, i, n, env) =>
      f(fa(seed, i, n, env)),

  zip:
    <A, B>(fa: Field<A>, fb: Field<B>): Field<readonly [A, B]> =>
    (seed, i, n, env) =>
      [fa(seed, i, n, env), fb(seed, i, n, env)] as const,

  // Deterministic per-element randomness: evaluate a Rand with a split seed.
  fromRand:
    <A>(ra: Rand<A>, salt: number): Field<A> =>
    (seed, i, _n, _env) =>
      Rand.run(D.splitSeed(seed, salt + i * 10007), ra),

  // Common numeric fields:
  linear:
    (start: number, step: number): Field<number> =>
    (_seed, i) =>
      start + step * i,

  jitter:
    (base: Field<number>, radius: number, salt: number): Field<number> =>
    (seed, i, n, env) => {
      const b = base(seed, i, n, env);
      const j = Rand.run(D.splitSeed(seed, salt + i * 92821), D.range(-radius, radius));
      return b + j;
    },
};

///////////////////////
// 6) Stateful dynamics (purely)
///////////////////////

// To remain pure, stateful computation is expressed as an explicit stepper.
// A Stepper consumes (dt, input, state) and returns new state + output.
export type Stepper<State, Out> = (dt: Duration, t: Time, ctx: Context, state: State) => readonly [State, Out];

// A "scan" builds an output Signal by integrating a stepper forward.
// NOTE: For true random-access scrubbing, you either:
// - require a deterministic closed form (no scan), OR
// - provide a caching strategy or event-scripting. This is still pure,
//   but needs an interpreter strategy. Kernel types include both modes.

export type ScanSpec<State, Out> = {
  init: (ctx0: Context) => State;
  step: Stepper<State, Out>;
  // Interpreter hint: fixed dt for stable replay.
  dt: Duration;
};

// An interpreted signal whose value depends on stepping forward from t=0.
// This is still pure as data; evaluation strategy is backend responsibility.
export type StatefulSignal<Out> = {
  kind: "StatefulSignal";
  spec: ScanSpec<any, Out>;
};

// A helper type that unifies pure and stateful signals.
export type AnySignal<A> = Signal<A> | StatefulSignal<A>;

///////////////////////
// 7) Programs (signals + events together)
///////////////////////

// A Program produces both continuous outputs and discrete events.
export type Program<Out, Ev = never> = {
  signal: AnySignal<Out>;
  event: Event<Ev>;
};

// Program combinators.
export const P = {
  of:
    <Out>(out: Out): Program<Out, never> => ({
      signal: S.of(out),
      event: E.empty(),
    }),

  map:
    <A, B, Ev>(pa: Program<A, Ev>, f: (a: A) => B): Program<B, Ev> => ({
      signal: isStateful(pa.signal)
        ? ({ kind: "StatefulSignal", spec: pa.signal.spec } as StatefulSignal<B>) // output mapping must be handled by interpreter
        : S.map(pa.signal as Signal<A>, f),
      event: pa.event,
    }),

  // Parallel product: combine outputs and merge events.
  zip:
    <A, B, EvA, EvB>(pa: Program<A, EvA>, pb: Program<B, EvB>): Program<readonly [A, B], EvA | EvB> => ({
      signal:
        isStateful(pa.signal) || isStateful(pb.signal)
          ? ({ kind: "StatefulSignal", spec: { init: () => null, step: () => [null, null], dt: 1 / 60 } } as any) // kernel: semantics only
          : S.zip(pa.signal as Signal<A>, pb.signal as Signal<B>),
      event: E.merge(pa.event as any, pb.event as any),
    }),

  // Time warp both signal and events.
  warp:
    <Out, Ev>(p: Program<Out, Ev>, tt: TimeTransform): Program<Out, Ev> => ({
      signal: isStateful(p.signal) ? p.signal : S.warp(p.signal as Signal<Out>, tt),
      event: (t, ctx) => p.event(tt(t), ctx),
    }),

  // Switch programs on an event.
  // This is a semantic type; practical evaluation requires an interpreter.
  switch:
    <Out, Ev, Sw>(p: Program<Out, Ev>, on: Event<Sw>, f: (sw: Sw) => Program<Out, Ev>): Program<Out, Ev> => ({
      signal: {
        kind: "StatefulSignal",
        spec: {
          init: (_ctx0) => ({ cur: p, startedAt: 0 as Time }),
          dt: 1 / 60,
          step: (dt, t, ctx, st) => {
            // Semantic placeholder: interpreters handle continuous switching.
            // We keep it as data in kernel; real runtime implements.
            const sws = on(t, ctx);
            const next = sws.length ? f(sws[sws.length - 1]!) : st.cur;
            return [{ cur: next, startedAt: st.startedAt }, null] as const;
          },
        },
      } as StatefulSignal<Out>,
      event: E.merge(p.event, (t, ctx) => {
        const sws = on(t, ctx);
        if (!sws.length) return [];
        const np = f(sws[sws.length - 1]!);
        return np.event(t, ctx);
      }),
    }),
};

function isStateful<A>(s: AnySignal<A>): s is StatefulSignal<A> {
  return typeof s === "object" && (s as any).kind === "StatefulSignal";
}

///////////////////////
// 8) Easing / Clocks
///////////////////////

export type Ease = (u01: number) => number;
export type Clock = Signal<number>; // typically outputs [0,1]

// Common easings (pure).
export const Ease = {
  linear: (u: number) => u,
  smoothstep: (u: number) => {
    u = Math.max(0, Math.min(1, u));
    return u * u * (3 - 2 * u);
  },
  easeOutCubic: (u: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3),
  easeInCubic: (u: number) => Math.pow(Math.max(0, Math.min(1, u)), 3),
};

// Clock builders.
export const Clock = {
  // Ramp from 0 to 1 over duration, starting at t=0.
  ramp:
    (duration: Duration, ease: Ease = Ease.linear): Clock =>
    (t) => ease(Math.max(0, Math.min(1, t / Math.max(1e-6, duration)))),

  // Delay then ramp.
  delayedRamp:
    (delay: Duration, duration: Duration, ease: Ease = Ease.linear): Clock =>
    (t) => {
      const tt = t - delay;
      return Clock.ramp(duration, ease)(tt, { env: { viewport: { w: 0, h: 0 } }, input: dummyInput() });
    },
};

function dummyInput(): Input {
  return { pointer: { x: 0, y: 0, down: false }, scrollY: 0, keysDown: new Set() };
}

///////////////////////
// 9) Phase machines (as data)
///////////////////////

export type PhaseName = string;

export type Phase = {
  name: PhaseName;
  duration: Duration;
  ease?: Ease;
};

export type PhaseMachine = {
  phases: readonly Phase[];
};

// Phase evaluation (pure, scrubbable).
export type PhaseSample = {
  phase: PhaseName;
  u: number;      // eased 0..1 within phase
  uRaw: number;   // raw 0..1 within phase
  tLocal: number; // time since start of machine
};

export const PhaseMachine = {
  total: (pm: PhaseMachine): Duration => pm.phases.reduce((a, p) => a + p.duration, 0),

  sample: (pm: PhaseMachine, tLocal: Time): PhaseSample => {
    const total = PhaseMachine.total(pm);
    const t = Math.max(0, Math.min(tLocal, total));
    let acc = 0;

    for (let i = 0; i < pm.phases.length; i++) {
      const ph = pm.phases[i]!;
      const next = acc + ph.duration;
      if (t <= next || i === pm.phases.length - 1) {
        const uRaw = ph.duration <= 1e-6 ? 1 : (t - acc) / ph.duration;
        const u = ph.ease ? ph.ease(uRaw) : uRaw;
        return { phase: ph.name, u: clamp01(u), uRaw: clamp01(uRaw), tLocal: t };
      }
      acc = next;
    }
    const last = pm.phases[pm.phases.length - 1]!;
    return { phase: last.name, u: 1, uRaw: 1, tLocal: t };
  },
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

///////////////////////
// 10) Render model (backend-agnostic)
///////////////////////

// Abstract scene graph / render tree: stable identity + geometry + style + transforms.
// Backend interpreters can map these to SVG/Canvas/WebGL/DOM.

export type Color =
  | { kind: "rgb"; r: number; g: number; b: number; a?: number }
  | { kind: "hsl"; h: number; s: number; l: number; a?: number };

export type Transform2D = {
  translate?: Vec2;
  rotate?: number; // radians
  scale?: Vec2;
  // Extend: skew, matrix, 3D transforms, etc.
};

export type Style = {
  opacity?: number;
  fill?: Color | { kind: "none" };
  stroke?: Color | { kind: "none" };
  strokeWidth?: number;
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
  glow?: { radius: number; color?: Color };
  // Extend: blur, filters, blend modes, etc.
};

export type PathCmd =
  | { kind: "M"; p: Vec2 }
  | { kind: "L"; p: Vec2 }
  | { kind: "Q"; c: Vec2; p: Vec2 }
  | { kind: "C"; c1: Vec2; c2: Vec2; p: Vec2 }
  | { kind: "A"; rx: number; ry: number; xAxisRot: number; largeArc: 0 | 1; sweep: 0 | 1; p: Vec2 }
  | { kind: "Z" };

export type Geometry =
  | { kind: "path"; cmds: readonly PathCmd[] }
  | { kind: "circle"; c: Vec2; r: number }
  | { kind: "rect"; p: Vec2; w: number; h: number; rx?: number; ry?: number }
  | { kind: "text"; p: Vec2; value: string; font?: { family?: string; size?: number; weight?: number } }
  | { kind: "group"; children: readonly DrawNode[] };

export type DrawNode = {
  id: Id; // stable identity (critical)
  geom: Geometry;
  style?: Style;
  transform?: Transform2D;
  // Extend: masks, clip paths, z-index, etc.
};

export type RenderTree = {
  root: DrawNode;
  // Optional: resources (gradients, filters), symbol defs, etc.
};

export type Renderer = {
  // Interpreter boundary: effectful rendering (not implemented in kernel).
  // This type exists so the kernel can be backend-agnostic.
  render: (tree: RenderTree, ctx: Context) => void;
};

///////////////////////
// 11) Constraints (pure)
///////////////////////

export type Constraint<S> =
  | { kind: "project"; name: string; project: (s: S, env: Env) => S; weight?: number }
  | { kind: "energy"; name: string; energy: (s: S, env: Env) => number; weight?: number };

export type ConstraintSet<S> = {
  constraints: readonly Constraint<S>[];
};

export const ConstraintSet = {
  // Compose energy constraints into one energy function.
  energy:
    <S>(cs: ConstraintSet<S>): ((s: S, env: Env) => number) =>
    (s, env) =>
      cs.constraints.reduce((acc, c) => {
        if (c.kind !== "energy") return acc;
        const w = c.weight ?? 1;
        return acc + w * c.energy(s, env);
      }, 0),

  // Apply all projection constraints (in order).
  project:
    <S>(cs: ConstraintSet<S>): ((s: S, env: Env) => S) =>
    (s0, env) => {
      let s = s0;
      for (const c of cs.constraints) {
        if (c.kind === "project") s = c.project(s, env);
      }
      return s;
    },
};

///////////////////////
// 12) Composition laws (semantic)
///////////////////////

// A few “laws” represented as types/constructors you can build on.
export type Compose =
  | { kind: "parallel" }
  | { kind: "sequence" }
  | { kind: "stagger"; offsets: Field<number> }
  | { kind: "trigger"; on: Event<any> };

///////////////////////
// 13) Kernel “Animation” type
///////////////////////

// In the comprehensive model, an animation is a Program producing RenderTree.
export type Animation<Ev = never> = Program<RenderTree, Ev>;

// Helper to build an Animation from a pure signal (no events).
export const Animation = {
  fromSignal: (tree: Signal<RenderTree>): Animation => ({
    signal: tree,
    event: E.empty(),
  }),
};

///////////////////////
// 14) Notes on evaluation
///////////////////////
//
// - This kernel intentionally separates:
//   * semantics (types + pure constructors)
//   * interpretation (how to sample StatefulSignal, how to schedule events, how to render)
//
// - For truly comprehensive scrubbing, stateful signals should be either:
//   (a) avoided via closed-form expressions, or
//   (b) interpreted with caching/checkpointing, or
//   (c) derived from seed-generated event scripts (so random access is possible).
//
// The kernel types support all three strategies without changing user-level programs.