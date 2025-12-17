1) The type problem is not “too many types” — it’s missing type affordances + adapters

Right now users are seeing things like:
	•	Field<Duration>
	•	Field<Transport>
	•	Field<Duration> that “feels like progress”
	•	Field<Point> that “feels like position”

…and they don’t know:
	•	what a Field is (in UX terms),
	•	what the type means behaviorally,
	•	whether any Field plugs into any Field,
	•	what “compatible” even means.

A. Give users a stable mental model: Signal vs Field

You don’t need to rename the kernel types internally, but the UI needs a simpler “two-world” framing:
	•	Signal = one value over time (global).
Examples: speed, phase, beat, seed, lfo.
	•	Field = per-element value over time (indexed by element id).
Examples: per-particle delay, per-path progress, per-particle position.

That’s already what your system is doing; it’s just not presented.

UX change: every port badge should show:
	•	a big icon: S or F
	•	then a small tag: num, vec2, color, phase, duration, transport, etc.

So “Burst Stagger” is not Field<Duration>—it’s:

F · duration (per-element timing offset)

That alone reduces panic.

B. Decide and enforce one critical rule

You need one rule that users can trust:

Rule: Fields are not “all compatible.”
Only compatible if:
	•	same “shape world” (Signal vs Field), and
	•	same base domain (num/vec2/color/phase/transport…), or
	•	there’s an explicit adapter between domains.

If your app currently “thinks so” because it’s using a loose structural check, that’s the source of the opacity. Tighten the type checker, then make adapters frictionless.

C. Add a tiny set of explicit adapters (and auto-insert them)

This is the make-or-break move. You do not want users thinking about Duration vs “point vs progress”.

Add these adapters as first-class blocks but allow the UI to auto-insert them and show them as a small “shim chip” on the wire.

Minimum adapters that will save you:

World adapters
	•	Signal → Field: “Broadcast” (same value for all elements)
	•	Field → Signal: “Reduce” (min/max/avg/by-id) — often used for global reactions
	•	Field Map: Field<A> -> Field<B> (apply a pure function elementwise)

Domain adapters
	•	Duration ↔ Phase
This is huge for looping. “Duration” is felt-time; “Phase” is cyclic-time.
	•	Transport → Phase / Progress
If Transport encodes per-element time mapping, it must have a clean readout:
	•	transport.phase (0..1)
	•	transport.t (seconds)
	•	transport.progress (if that’s meaningfully distinct)

Disambiguators (UX gold)
	•	Interpret as… adapters that don’t change bits, just meaning:
	•	“Treat number as Duration (seconds)”
	•	“Treat number as Phase (0..1)”
	•	“Treat duration as Offset” vs “duration as Length”
These are “unit casts” that prevent silent nonsense.

Result: users don’t ask “is any Field compatible?” because they see what conversion is happening.

D. Fix the naming: “Progress” should not be Duration

If “Per-Element Progress” outputs Field<Duration>, that’s a semantic smell unless “progress” literally means “elapsed time”.

For UX sanity, reserve:
	•	Progress = phase (0..1) or normalized scalar
	•	Duration = seconds/beats (unitful)
	•	Point = vec2/vec3

Even if internally Duration is number, the label matters. People build intuition from the label.

### 2.7. Improving the type UX

Without changing kernel types, you can significantly improve UX:

1. **Tighten editor-level compatibility** (`areTypesCompatible`):
   - Prefer exact matches for `Field<X>`; only allow or whitelist:
     - `Field<Point>` ↔ `Field<Point>` (or `Field<vec2>`).
     - Maybe `Field<Point>` ↔ `Field<vec2>` as a special case.
   - Drop the blanket “any Field<*> to any Field<*>” rule.
2. **Keep semantic labels**:
   - Continue to label ports as `Field<Duration>`, `Field<Point>`, etc. in the UI.
   - Treat these as UX hints describing *units* (seconds vs pixels) rather than deeply distinct types.
3. **Use explicit adapters instead of implicit compatibility**:
   - E.g. `DurationScale` (`Field<Duration>` × `Scalar:number` → `Field<Duration>`),
   - `PointMagnitude` (`Field<Point>` → `Field<number>`),
   - `LiftScalarToField` is already present (`lift.scalarToFieldNumber`).
4. **Visual domain hints**:
   - Reuse lane flavors (“Motion”, “Timing”, “Style”) at port level:
     - Color-code ports as “Spatial / Timing / Style”.
   - This provides an at-a-glance cue about what should connect where.

---

## 2. Fields, Progress, Transport – Semantics and Type Confusion

### 2.1. `Field<T>` vs `Signal<T>`

Conceptually:

- **Field<T>**: per-element, time-independent parameter.
  - In compiler types (`compiler/types.ts`):
    ```ts
    export type Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[];
    ```
  - Used for start positions, per-element delays/durations, sizes, colors, wobble params, etc.
- **Signal<T>**: time-varying value.
  - Used for progress over time (`Signal<Unit>`), positions (`Signal<vec2>`), phase machines, etc.

In the editor UI (`SlotType` in `types.ts`), fields include:

- `Field<Point>`, `Field<Duration>`, `Field<number>`, `Field<string>`, `Field<Path>`, `Field<Wobble>`, etc.
- Signals: `Signal<Point>`, `Signal<number>`, `Signal<Unit>`, `Signal<Time>`, `Signal<PhaseSample>`, etc.

At compiler level, most of the **numeric** fields collapse to:

- `Field:number` for scalar quantities (including “Duration” in seconds).
- `Field:vec2` for 2D positions (points).

So `Field<Duration>` in the UI is essentially `Field<number>` in seconds; `Field<Point>` is `Field:vec2`.

### 2.2. Why “any Field” looks compatible now

Editor-type compatibility lives in `portUtils.ts`:

```ts
// Field compatibility: Field<Point> can connect to Field<*> inputs
// For now, be lenient with Field types
if (outputType.startsWith('Field<') && inputType.startsWith('Field<')) {
  return true; // TODO: tighten this with proper generics
}
```

This means:

- Any `Field<*>` output highlights as compatible with any `Field<*>` input.
- From a UX standpoint, it looks like “all Fields are interchangeable”, even when they aren’t semantically compatible.

At compile time, the kernel is stricter:

- `Artifact.kind` distinguishes `'Field:number'`, `'Field:string'`, `'Field:boolean'`, `'Field:color'`, `'Field:vec2'`, etc.
- Port compatibility is checked via `isPortTypeAssignable` in `compiler/compile.ts`, based on `ValueKind`.

So the *real* type system is stricter; the **editor’s wiring hints are currently too permissive**, which is a known TODO and explains much of the confusion.

### 2.3. `Burst Stagger` (`LinearStagger`) and `Field<Duration>`

In the macros (`macros.ts`), “Burst Stagger” is:

- A `LinearStagger` block:
  - UI output type: `Field<Duration>`.
  - Compiler output kind: `'Field:number'` (seconds).
  - Implementation (`compiler/blocks/fields/LinearStagger.ts`):
    - For element `i`, `delay[i] = i * baseStagger + jitterTerm`.
    - `baseStagger` and `jitter` are parameters.

Semantically:

- “Burst Stagger” = per-element **start delay in seconds**.

### 2.4. `PerElementTransport` – what it actually is

UI definition (`blocks.ts`):

- Inputs:
  - `targets: SceneTargets`
  - `positions: Field<Point>`
  - `delays: Field<Duration>`
  - `phase: Signal<PhaseSample>`
- Output:
  - `program: Program`

Compiler (`compiler/blocks/compose/PerElementTransport.ts`):

- Inputs:
  - `TargetScene`
  - `Field:vec2` (start positions)
  - `Field:number` (delays in seconds)
  - `PhaseMachine`
- It:
  - Evaluates start positions and delays at compile time (bulk).
  - Normalizes delays, generates per-element exit targets (scatter).
  - At runtime, for each element and time:
    - Uses `PhaseMachine.sample(tMs)` (`PhaseSample` with `phase`, `u`, `tLocal`).
    - In entrance: lerps from start → target with stagger and easing.
    - In hold: stays at target.
    - In exit: lerps from target → exitTarget with fading opacity.
  - Renders particles directly as circles with glow; returns a `RenderTreeProgram`.

Conceptually:

- `PerElementTransport` is already a **complete transport program**:
  - It owns per-element timing and motion logic.
  - It bakes in the entrance/hold/exit semantics.
  - It renders circles; not just computes positions.

If you ever want a proper `Field<Transport>` type, you would separate:

- A `Field<Transport>` representing per-element transport parameters:

  ```ts
  type Transport = {
    start: Vec2;
    end: Vec2;
    delay: number;   // seconds
    duration: number;// seconds
    easing: string;
    path: 'linear' | 'curve' | ...;
  };
  ```

- A block that turns `Field<Transport> + Signal<Time>` into a `Signal<vec2>` for positions.

Right now, `PerElementTransport` compresses these steps into one convenience primitive.

### 2.5. `PerElementProgress` – what it does differently

UI definition (`blocks.ts`):

- Inputs:
  - `phase: Signal<PhaseSample>`
  - `delays: Field<Duration>`
  - `durations: Field<Duration>`
- Output:
  - `progress: Signal<Unit>` (conceptually “0–1 progress”).

Compiler (`compiler/blocks/compose/PerElementProgress.ts`):

- Treats delays/durations as `Field<number>` in seconds.
- Uses `PhaseMachine.sample(tMs)` to get a `PhaseSample` with `tLocal` in the current phase.
- For each element `i`:
  - `delayMs = delays[i] * 1000`.
  - `durationMs = durations[i] * 1000`.
  - `localT = phaseSample.tLocal - delayMs`.
  - `uRaw = localT / durationMs`, then `uClamped = clamp01(uRaw)`.
  - `progress[i] = easing(uClamped)` (e.g. ease-out, ease-in-out).
- Returns:
  - A `Signal` that produces a `ProgressArray` (array of per-element 0–1 values) per frame.
  - Typed as `Signal:Unit` for now; the type system doesn’t fully express “array of Unit per element”.

Conceptually:

- `PerElementProgress` computes **per-element micro-timelines** (0–1), factoring in:
  - Global phase time (`PhaseMachine`).
  - Per-element start delay (`Field<Duration>`).
  - Per-element duration (`Field<Duration>`).
  - Optional per-element easing choice.
- It does not impose any specific exit behavior or rendering; it’s a reusable **progress field**.

### 2.6. Are these “compatible”?

Semantically:

- `Field<Duration>` / numeric fields:
  - Inputs to both `PerElementTransport` and `PerElementProgress` as delays/durations.
  - Represent seconds.
- `PerElementProgress`:
  - Outputs per-element 0–1 progress over time.
  - Intended to drive `LerpPoints`, opacities, stroke-dashoffset, etc.
- `PerElementTransport`:
  - Consumes a phase machine + per-element delays.
  - Encodes its own notion of progress + exit behavior internally.
  - Outputs a full `Program<RenderTree>` with its own particle rendering.

So:

- They are **complementary**, not variants of the same type:
  - Use `PerElementTransport` for “plug-and-play particle transport to logo”.
  - Use `PerElementProgress` when you want to own the rendering and re-use progress in multiple channels.
- The confusion mainly comes from:
  - UI-level `Field<*>` compatibility being too permissive.
  - The `Field<Duration>` label implying a separate type when it’s really just `Field<number>` in kernel land.

