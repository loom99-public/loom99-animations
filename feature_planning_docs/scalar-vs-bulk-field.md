We got two different (both valid) ways to model the same concept, and we’ve been casually switching between them.

What i is

i is the instance index: “the i-th stroke / particle / part / glyph target”. It’s how a field can say:
	•	“give me a delay for element i”
	•	“give me an origin for element i”
	•	“give me a color for element i”

So i exists whenever the thing you’re generating is per-element.

⸻

The two Field signatures are just two evaluation styles

Style A: “scalar per index” (what I used in the spec prose)

type Field<T> = (seed: Seed, i: number, n: number, env: Env) => T;

This reads nicely and is great when writing compilers because you can call:
	•	delay(seed, i, n, env)
	•	origin(seed, i, n, env)

Style B: “bulk vector” (what your kernel types show)

type Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[];

This is also great because:
	•	it encourages vectorized generation
	•	it makes it easier to cache/optimize
	•	it clearly enforces “evaluate once at compile time”

⸻

They are equivalent (you can derive either from the other)

Wrap scalar → bulk

function fieldFromScalar<T>(
  f: (seed: Seed, i: number, n: number, ctx: CompileCtx) => T
): (seed: Seed, n: number, ctx: CompileCtx) => readonly T[] {
  return (seed, n, ctx) => {
    const out = new Array<T>(n);
    for (let i = 0; i < n; i++) out[i] = f(seed, i, n, ctx);
    return out;
  };
}

Wrap bulk → scalar

function scalarFromField<T>(
  f: (seed: Seed, n: number, ctx: CompileCtx) => readonly T[]
): (seed: Seed, i: number, n: number, ctx: CompileCtx) => T {
  return (seed, i, n, ctx) => f(seed, n, ctx)[i]!;
}

So the “two signatures” are just API surface choices.

⸻

Which one should you standardize on?

Given your stated goal (“maximally pure and composable”), I’d standardize on your bulk form:

Field<T> = (seed, n, ctx) => readonly T[]

…and make i a consumer detail inside compilers:

const delays = fields.delay(seed, n, ctx);
const d_i = delays[i];

That keeps your determinism boundary crisp: fields produce whole per-instance arrays exactly once.

⸻

Why the docs drifted

When designing abstractions, it’s common to talk in the scalar form because it matches the mental model (“a field gives a value at index i”). Your kernel chose the more implementation-friendly bulk form. Both describe the same thing.

RESULTS: STANDARDIZE ON BULK FORM