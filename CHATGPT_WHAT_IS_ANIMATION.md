The “modes as named origin-field generators + a variance envelope + a perceptual quotient” framing is the kind of thing that stays powerful as you scale.

Here’s a toy system design that’s “true to the root” while still being implementable in a browser without turning into a thousand special cases.

⸻

The core move: split authoring-time from run-time

Most animation code gets messy because it mixes:
•    choosing which motion family (mode),
•    sampling time,
•    coordinating many elements,
•    and rendering.

So: compile a “Plan” once, then sample it many times.

Two-stage model

Compile stage (pure, deterministic):
(\text{Seed}, \text{Scene}, \text{Context}) \rightarrow \text{Plan}

Run stage (reactive sampling):
(\text{Plan}, t, \text{Inputs}) \rightarrow \text{Frame}

This is the single best way to keep “big blocks that do a million things” from happening.

⸻

The “real root” types

Below is a minimal set of abstractions that naturally includes your origin field, offsets, phases, constraints, determinism boundary, and composition.

1) Behavior: time-indexed program

A Behavior is a function from time + inputs → value.

type Time = number; // seconds
type Seed = number;

type Input = {
pointer: { x: number; y: number; down: boolean };
viewport: { w: number; h: number };
// plus any other reactive signals you want
};

type Behavior<A> = (t: Time, input: Input) => A;

This is your “Animation: (Time, Context) → VisualState”, but you keep “Context” split into:
•    compile-time context (seed, viewport, elementCount, layout constraints)
•    run-time input (pointer, scroll, etc.)

2) Curve + clock factorization (your γ ∘ τ)

Keep the separation explicit, but composable:

type Unit = number; // [0,1]
type Curve<S> = (u: Unit) => S;
type Clock = Behavior<Unit>; // time-warp, scrubbable

Then an animation over time is just:

type Anim<S> = { curve: Curve<S>; clock: Clock };
const sampleAnim = <S>(a: Anim<S>): Behavior<S> =>
(t, input) => a.curve(a.clock(t, input));

3) Fields: initial conditions + orchestration signals

Your origin-field and offset-field idea is gold because it’s the missing abstraction.

type Field<A> = (seed: Seed, n: number, ctx: CompileCtx) => A[];

type CompileCtx = {
viewport: { w: number; h: number };
// any static scene info available at compile time
};

    •    Field<Point> = origin field
    •    Field<number> = time-offset field
    •    Field<any> = per-element variation parameters

4) Plan: compiled, element-wise behaviors

A Plan is what you run. It’s the “score” for all elements.

type ElementId = string;

type ElementPlan<S> = {
id: ElementId;
behavior: Behavior<S>;
};

type Plan<S> = {
elements: ElementPlan<S>[];
};

5) Render: projection from abstract state to output

Keep renderer separate so SVG/Canvas/WebGL are swappable.

type Renderer<S> = (frame: { [id: string]: S }) => void;


⸻

Composition that doesn’t collapse into spaghetti

Treat composition as operations over Behaviors and Plans.

Behavior combinators (tiny, universal)

const map = <A, B>(b: Behavior<A>, f: (a: A) => B): Behavior<B> =>
(t, input) => f(b(t, input));

const shift = <A>(b: Behavior<A>, dt: number): Behavior<A> =>
(t, input) => b(t - dt, input);

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (duration: number): Clock =>
(t) => clamp01(t / duration);

Plan combinators (orchestration level)

const parallel = <S>(...plans: Plan<S>[]): Plan<S> => ({
elements: plans.flatMap(p => p.elements),
});

const stagger = <S>(plan: Plan<S>, offsets: (id: ElementId, idx: number) => number): Plan<S> => ({
elements: plan.elements.map((e, i) => ({
...e,
behavior: shift(e.behavior, offsets(e.id, i)),
})),
});

Phase structure as a first-class thing

Phases aren’t just “seq”; they’re a state machine with different rules.

type Phase<S> = {
name: string;
duration: number;
plan: (localT: Time) => Plan<S>; // can freeze parts, change clocks, etc.
};

type PhaseMachine<S> = {
phases: Phase<S>[];
};

const runPhaseMachine = <S>(pm: PhaseMachine<S>): Plan<S> => {
// returns a Plan whose element behaviors consult the current phase
// (implementation detail: compute phase index from t, then delegate)
throw new Error("sketch");
};

This is where “entrance → hold → fold (with different rules)” lives cleanly.

⸻

Modes as named perceptual equivalence classes

You already have the right shape:
•    A mode is primarily a field generator (origins, offsets, params).
•    A variance envelope is a bound on noise.
•    A perceptual quotient is a canonicalization that buckets many parameters into one named mode.

Define Mode explicitly

type Point = { x: number; y: number };

type Mode = {
name: string;

origin: Field<Point>;
offset: Field<number>;

// “variance envelope” as a contract:
envelope: {
originRadius: number;   // cohesion bound
offsetJitter: number;   // temporal cohesion
};

// optional: canonicalizer, your quotient map
canonicalize?: (ctx: CompileCtx) => string;
};

Converge is then simply a named origin-field with a cohesion radius + offset-field.

Your “why exactly 3 modes?” becomes: you picked 3 canonicalizers / representatives.

⸻

Constraints without killing elegance

Constraints are best modeled as: the curve must end on a manifold.

In practice for a toy system, implement constraints as a projection at the end of the curve:

type Constraint<S> = (s: S, ctx: CompileCtx) => S;

// Example: “end exactly at logo path pose”

Then your curve becomes:

const constrainedCurve = <S>(curve: Curve<S>, projectEnd: Constraint<S>): Curve<S> =>
(u) => u < 1 ? curve(u) : projectEnd(curve(1), /*ctx*/ null as any);

If you want it smoother, you can “blend in” the projection near the end (soft constraint).

⸻

Identity / continuity as a deliberate layer

For “line 0 is the same thing across frames,” you want identity to exist before animation:
•    Stable ElementIds
•    Stable correspondence for morphs (path segments, points)

So make “correspondence” a compile-time artifact:

type Correspondence = {
// whatever mapping your morph compositor needs
};

type SceneElement = {
id: ElementId;
final: any; // final pose / final path
correspondence?: Correspondence;
};

Now “continuity” is not an emergent property of the animation. It’s an explicit input to compilation.

⸻

Putting it together: your shoot-in pattern as a reusable compiler

This is the key: “shootIn” is not runtime logic; it’s a Plan compiler.

type Pose = { p: Point; opacity: number /* etc */ };

function shootIn(elements: SceneElement[], mode: Mode, seed: Seed, ctx: CompileCtx): Plan<Pose> {
const n = elements.length;
const origins = mode.origin(seed, n, ctx);
const offsets = mode.offset(seed, n, ctx);

return {
elements: elements.map((el, i) => {
const finalP = /* derive from el.final */;
const startP = origins[i];

      const curve: Curve<Pose> = (u) => ({
        p: { x: lerp(startP.x, finalP.x, u), y: lerp(startP.y, finalP.y, u) },
        opacity: u,
      });

      const clock: Clock = (t) => ramp(0.7)(t - offsets[i], {} as any); // toy

      const behavior = sampleAnim({ curve, clock });

      return { id: el.id, behavior };
    }),
};
}

Now:
•    “mode” changes origins/offsets
•    “varied” is just a mode with noise fields
•    stagger is just an offset generator
•    phases wrap Plans, not the other way around

⸻

The minimal system I’d actually build

If you build only one thing, build this pipeline:
1.    PRNG(seed) and Field generators
2.    Plan compiler functions (like shootIn, fadeIn, morphTo)
3.    PhaseMachine wrapper
4.    Renderer for SVG (start here)
5.    A Driver that samples t via requestAnimationFrame or a scrubber

That’s enough to express your “deep structure” without getting lost in framework complexity.

⸻

A small “truthy” checklist (helps keep the system honest)

When you add a feature, force it into one bucket:
•    Field (compile-time variation / initial conditions)
•    Clock (time mapping; scrubbing/pausing/sync)
•    Curve (what changes in state space)
•    Constraint (what must be true)
•    Composition (parallel/seq/shift/switch)
•    Render (projection)
•    Identity (correspondence, stable IDs)

If something doesn’t fit, it’s a smell that you’re mixing levels again.

⸻

If you tell me what your state S is for your toy (e.g., {d: string} for SVG paths, or {x,y,rot,scale,opacity}), I can sketch a tight TypeScript file that implements:
•    seeded PRNG
•    Field + a few modes (converge/cascade/diagonal)
•    shootIn compiler
•    PhaseMachine (entrance/hold/fold)
•    an SVG renderer loop

…in a way that keeps the abstraction boundaries clean.