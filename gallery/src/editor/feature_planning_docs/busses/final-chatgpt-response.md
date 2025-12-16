This is a really solid start — you’ve correctly spotted that you already have a more structured “world/domain” notion in ValueKind, and you’re trying to bridge SlotType → something bus-usable without breaking existing patches.

That said, if you ship the mapping as written, you’ll accidentally recreate the exact usability problem you’re trying to fix: too many opaque types (just moved into TypeDesc.domain). And there are two architectural mismatches that will bite you:
	1.	Your current Field is not “lazy” (it’s bulk array materialization).
	2.	Your TypeDesc world/domain set is too wide for buses (it mixes control signals with engine/resource types).

Below is how I’d adjust it so it stays aligned with the bus vision and your existing codebase.

⸻

1) Fix the big conceptual mismatch: Field is currently bulk, not lazy

You wrote:

Field: Already in correct bulk form: (seed, n, ctx) => readonly T[]

That’s the opposite of the “lazy Field” decision. We want to do this the best future looking way possible.

(recommended, forward-looking): introduce a lazy FieldExpr interface without breaking the compiler

Keep the bulk form for compatibility, but add a second internal representation that can fuse:

type FieldBulk<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[];

type FieldExpr<T> =
  | { kind: "const"; value: T }
  | { kind: "map"; src: FieldExpr<any>; fnId: string }
  | { kind: "zip"; a: FieldExpr<any>; b: FieldExpr<any>; fnId: string }
  | { kind: "source"; blockId: string; port: string }
  // etc.

Then implement a single evaluator:

evalFieldExpr(expr, seed, n, ctx, out?: T[]): T[]

This lets bus-combine produce FieldExpr wrappers (cheap), and you only materialize once at the final consumer (particles/paths/etc).

don’t describe the current Field as “already correct.” It isn’t for the bus ambition.

⸻

2) Don’t let TypeDesc become “SlotType 2.0”

Right now your domain includes things like wobble, jitter, wave, spiral, renderTree, sceneTargets, etc.

That’s understandable as an internal mapping layer, but it defeats the purpose for UX because a bus list full of:

F wobble, F jitter, S phaseMachine, special sceneTargets

…is not a learnable creative vocabulary.

Recommendation: split TypeDesc into Core vs Internal/Resource

Keep a small bus-facing lattice, and treat the rest as internal.

Concretely:

Bus-eligible core domains (what users see everywhere)
	•	number, vec2, color, boolean
	•	time, phase, rate
	•	trigger (replace “event” for bus routing)

Internal/resource domains (not bus-eligible by default)
	•	program, renderTree, renderNode, filterDef, strokeStyle, scene*, etc.

You can still keep those in TypeDesc.domain if it helps migration, but add:

busEligible: boolean
category: "core" | "internal"

and enforce:
	•	Bus Board only allows category: core (at least for v1)
	•	“special/internal” types can still be wired directly in the graph if needed

This keeps buses from becoming a dumping ground for engine plumbing.

⸻

3) Tighten the “world” story: avoid scalar and special as worlds

Your world currently has:
	•	signal | field | scalar | special

That will confuse both type rules and the UI.

Cleaner approach

Make world only:
	•	signal | field

…and treat “scalar” as just a domain or semantics under signal:number.

So:
	•	Scalar:number → { world: "signal", domain: "number", semantics: "scalar" }

Then keep “special” as category: internal, not a world.

If you must keep compatibility, do it like:
	•	world: signal | field
	•	category: core | internal
	•	domain: ...

That makes compatibility and adapters far simpler.

⸻

4) Events: don’t model them as bus types (use trigger + optional payload later)

You mapped:
	•	Event<string> → { world: special, domain: event }

For buses, I strongly recommend:
	•	Only allow trigger as the bus-level event type.
	•	Treat Event<string> as internal wiring only (or as a future “message bus” feature).

Bus-driven animation becomes far more playable if events are just:
	•	pulses (with timing), not arbitrary payload types.

⸻

5) Defaults: avoid any, and be careful with time units

Your DEFAULT_VALUES.duration = 1000 smells like milliseconds, but your UX and “time” system probably wants seconds/beats.

Two fixes:
	•	Represent time in seconds everywhere in bus/core types.
	•	If you must store ms internally, make the unit explicit in unit.

Also: vec2 default as {x,y} is fine, but many systems use [x,y] for JSON compactness — either is okay as long as consistent.

⸻

6) Adapter implications: your compatibility checker is too strict for the bus world

This function:

a.world === b.world && a.domain === b.domain

is fine for “direct connect,” but the bus system needs convertible edges too.

So I’d define three functions:
	•	isDirectlyCompatible(a,b)
	•	getConvertiblePaths(a,b) (uses your adapter table)
	•	isBusEligible(typeDesc) (filters bus picker)

That avoids cramming everything into a single boolean.

⸻

7) Practical mapping improvements for your specific SlotTypes

A few concrete remaps I’d do:
	•	Field<Duration> → { world:"field", domain:"time", semantics:"offset" }
(Don’t keep duration as a domain; it’s a semantic of time.)
	•	Signal<Unit> → likely { world:"signal", domain:"number", semantics:"unit(0..1)" }
	•	Signal<PhaseSample> → { world:"signal", domain:"phase", semantics:"sample" } (fine)
	•	Field<Wobble>, Field<Jitter>, Field<Wave>:
These should probably not be bus-visible types. Either:
	•	treat them as internal structs (category internal), or
	•	explode them into core bus types (e.g. publish wobbleAmount: F number, wobblePhase: F phase) via readout blocks.

If those are “modulator configs,” they shouldn’t be flowing around as bus values.

⸻

What I recommend you do next (actionable, minimal churn)

A) Adjust TypeDesc shape
	•	world: "signal" | "field"
	•	domain: (small core list) + (internal list)
	•	add category: "core" | "internal"
	•	add busEligible: boolean (or derive from category/domain)

B) Keep your SLOT_TYPE_TO_TYPE_DESC mapping, but mark most “special” as internal

This preserves compatibility without polluting the bus UX.

C) Decide now how you’ll implement “lazy Field”

Pick Path A (FieldExpr) if you want maximum long-term power.
Pick Path B (fusion) if you want less refactor now.

Either way, write it into your Phase 2 compiler plan explicitly.

⸻