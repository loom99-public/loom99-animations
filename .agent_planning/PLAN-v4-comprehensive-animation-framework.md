# V4 Comprehensive Animation Framework Plan

## Executive Summary

Redesign the animation framework around the "comprehensive model" - a pure, composable kernel with 8 primitives that can express ALL 10 animation techniques with full scrub/replay support.

**Goal**: Add a "Compare" button to every animation (60 total) by building a unified V4 framework that can compile all techniques.

---

## Current State Analysis

### What V3 Has
- `Behavior<A>` - time-indexed function `(t, input) => A`
- `Curve<S>` / `Clock` factorization
- `Field<A>` - per-element value generators
- `Mode` - named origin/offset field generators
- `Plan` / `ElementPlan` - compiled animations
- Basic composition: `parallel`, `sequence`, `stagger`, `shift`
- Only **Line Drawing** animation implemented

### What's Missing (from comprehensive model)
1. **Signal<A>** vs **Event<A>** distinction (continuous vs discrete)
2. **scan** primitive for pure state evolution (physics, accumulators)
3. **switch/until** for event-driven phase changes
4. **Rand<A>** as explicit typed effect (not ambient Math.random)
5. **RenderTree** - backend-neutral output (SVG/Canvas/WebGL)
6. **Interpreters** - pluggable render backends

### 10 Animation Techniques to Support
| # | Technique | Current State | Key Challenge |
|---|-----------|--------------|---------------|
| 01 | Line Drawing | V3 implemented | Path morphing, stagger |
| 02 | Particles | HTML only | Canvas rendering, many elements |
| 03 | Morphing | HTML only | Flubber interpolation |
| 04 | Glitch | HTML only | RGB split, pixel effects |
| 05 | Liquid | HTML only | SVG filter (feGaussianBlur), goo |
| 06 | Kinetic | HTML only | Transforms, spring physics |
| 07 | 3D Transforms | HTML only | perspective, rotateX/Y |
| 08 | Reveal Mask | HTML only | Mask geometry animation |
| 09 | Wave Ripple | HTML only | Sine-based deformation |
| 10 | Typewriter | HTML only | Event-driven text insertion |

---

## Architecture: V4 Kernel

### Core Primitives (8)

```
1. Signal<A>        - (t: Time) => A  (continuous, scrubbable)
2. Event<A>         - Stream of (time, value) occurrences
3. map/zip          - Signal combinators
4. delay/stretch/warp - Time transforms
5. switch/until     - Event-driven signal switching
6. scan             - (state, dt, input) => state' (pure state)
7. Rand<A>          - Seedable random sampler
8. RenderTree       - Backend-neutral output
```

### Type Definitions

```typescript
// ============ SIGNALS (continuous) ============
type Signal<A> = (t: Time, input: Input) => A;

// ============ EVENTS (discrete) ============
type EventOccurrence<A> = { time: Time; value: A };
type EventStream<A> = readonly EventOccurrence<A>[];
type EventScript<A> = (seed: Seed) => EventStream<A>;

// ============ RAND (explicit randomness) ============
type Rand<A> = (rng: PRNG) => A;
const runRand = <A>(r: Rand<A>, seed: Seed): A => r(createPRNG(seed));

// ============ SCAN (pure state) ============
type Stepper<S, I> = (state: S, dt: number, input: I) => S;
const scan = <S, I>(
  stepper: Stepper<S, I>,
  initial: S,
  inputSignal: Signal<I>
): Signal<S> => ...

// ============ SWITCH (event-driven) ============
const switchOn = <A>(
  initial: Signal<A>,
  events: EventStream<Signal<A>>
): Signal<A> => ...

const until = <A>(
  signal: Signal<A>,
  event: EventStream<Signal<A>>
): Signal<A> => ...

// ============ RENDER TREE (backend-neutral) ============
type RenderNode =
  | { type: 'path'; id: string; d: string; stroke: string; ... }
  | { type: 'circle'; id: string; cx: number; cy: number; r: number; ... }
  | { type: 'rect'; id: string; x: number; y: number; ... }
  | { type: 'text'; id: string; content: string; ... }
  | { type: 'group'; id: string; children: RenderNode[]; transform?: string }
  | { type: 'filter'; id: string; filterDef: FilterDef; children: RenderNode[] }

type RenderTree = {
  width: number;
  height: number;
  defs?: FilterDef[];
  root: RenderNode;
};

// ============ PROGRAM (the whole animation) ============
type Program<Scene> = (
  input: Signal<Input>,
  seed: Seed,
  scene: Scene
) => Signal<RenderTree>;
```

---

## Implementation Plan

### Phase 1: V4 Kernel (Core Primitives)
**Complexity**: Medium

1. **Signal module** - `signal.ts`
   - `const` / `always` - constant signal
   - `map`, `map2`, `map3`, `mapN` - lifting
   - `zip` - combine signals
   - `sample` - sample at time

2. **Event module** - `event.ts`
   - `EventStream<A>` type
   - `merge`, `filter`, `map` on events
   - `at` - create event at time
   - `fromScript` - events from seed

3. **Time transforms** - `time.ts`
   - `delay(signal, dt)`
   - `stretch(signal, factor)`
   - `warp(signal, clock)`
   - `clamp(signal, start, end)`

4. **Switch/Until** - `switch.ts`
   - `switchOn(initial, events)`
   - `until(signal, event)`
   - `phase(phases: PhaseSpec[])` - derived

5. **Scan** - `scan.ts`
   - `scan(stepper, initial, input)`
   - `integrate(derivative)` - derived for physics

6. **Rand** - `rand.ts`
   - `Rand<A>` monad-like
   - `runRand(rand, seed)`
   - `Field<A>` as `(seed, n, ctx) => A[]` (already have this)

7. **RenderTree** - `render-tree.ts`
   - Node types: path, circle, rect, text, group, filter
   - Transform helpers
   - Style helpers

8. **Interpreters** - `interpreters/`
   - `svg.ts` - RenderTree → SVG DOM
   - `canvas.ts` - RenderTree → Canvas commands (for particles)

### Phase 2: Animation Compilers (Per-Technique)
**Complexity**: High (10 techniques × 3 variants each)

Each technique gets a **compiler** that produces a `Signal<RenderTree>`:

#### 01. Line Drawing (upgrade existing)
- Refactor to use new primitives
- Output `RenderTree` with path nodes
- Already mostly done, needs porting

#### 02. Particles
- Scene compiler: text → Point[]
- Field: startPosField(mode, seed, i, targetPoint)
- Signal: lerp positions with easing
- RenderTree: Canvas interpreter (or SVG circles)

#### 03. Morphing
- Field: startShapeField (random start paths)
- Flubber integration for path interpolation
- Signal: morph progress → interpolated path
- RenderTree: path nodes

#### 04. Glitch
- Field: glitch params (RGB offsets, slice positions)
- Signal: glitch intensity over time
- RenderTree: group with filtered children, transforms

#### 05. Liquid/Goo
- Field: blob params (positions, delays, radii)
- Signal: blob positions/radii over time (piecewise)
- RenderTree: circles + feGaussianBlur filter

#### 06. Kinetic
- Field: per-element motion params
- Signal: transform states (maybe scan for physics)
- RenderTree: groups with transforms

#### 07. 3D Transforms
- Field: rotation/perspective params
- Signal: rotation angles over time
- RenderTree: groups with perspective transforms

#### 08. Reveal Mask
- Field: mask direction/shape params
- Signal: mask geometry over time
- RenderTree: mask element + content

#### 09. Wave Ripple
- Signal: wave function (sine-based deformation)
- RenderTree: transformed paths/elements

#### 10. Typewriter
- EventScript: generate (time, char) events from seed
- scan: fold events into "current text state"
- RenderTree: text nodes + cursor

### Phase 3: SideBySideViewer Generalization

1. **Create generic viewer interface**
```typescript
type AnimationCompiler = {
  compile: (seed: Seed, target: 'logo' | 'text', variant: 'original' | 'varied' | 'procedural') => Signal<RenderTree>;
  duration: number;
};
```

2. **Registry of compilers by technique**
```typescript
const compilers: Record<string, AnimationCompiler> = {
  '01': lineDrawingCompiler,
  '02': particlesCompiler,
  // ...
};
```

3. **Generalized SideBySideViewer**
   - Takes technique ID
   - Looks up compiler
   - Renders HTML original vs V4 implementation
   - Shared scrubbing controls

4. **Update AnimationCard**
   - Remove `cardIndex < 3` restriction
   - Show Compare button for ALL animations once compiler exists

### Phase 4: HTML Parser (Optional - for automatic comparison)

If we want to compare HTML original behavior automatically:
- Parse HTML animations into V4 Programs
- This is complex but enables automated visual regression testing

---

## File Structure

```
gallery/src/anim-v4/
├── core/
│   ├── signal.ts       # Signal<A> + combinators
│   ├── event.ts        # Event<A> streams
│   ├── time.ts         # Time transforms
│   ├── switch.ts       # switch/until
│   ├── scan.ts         # Pure state evolution
│   ├── rand.ts         # Rand<A> + runRand
│   ├── types.ts        # Core type definitions
│   └── index.ts
│
├── render/
│   ├── tree.ts         # RenderTree types
│   ├── svg.ts          # SVG interpreter
│   ├── canvas.ts       # Canvas interpreter
│   └── index.ts
│
├── animations/
│   ├── line-drawing/
│   │   ├── compiler.ts
│   │   ├── scene.ts
│   │   └── index.ts
│   ├── particles/
│   │   ├── compiler.ts
│   │   ├── scene.ts    # text → points
│   │   └── index.ts
│   ├── morphing/
│   │   ├── compiler.ts
│   │   └── index.ts
│   ├── glitch/
│   ├── liquid/
│   ├── kinetic/
│   ├── 3d-transforms/
│   ├── reveal-mask/
│   ├── wave-ripple/
│   └── typewriter/
│
├── react/
│   ├── useSignal.ts    # React hook for signals
│   ├── Viewer.tsx      # Generic animation viewer
│   └── index.ts
│
└── index.ts
```

---

## Work Items (Ordered)

### Kernel (must do first)
- [ ] P0: Define V4 core types (Signal, Event, RenderNode)
- [ ] P0: Implement Signal combinators (map, zip, delay, stretch)
- [ ] P0: Implement Event stream types and operations
- [ ] P0: Implement switch/until
- [ ] P0: Implement scan
- [ ] P1: Implement RenderTree types
- [ ] P1: Implement SVG interpreter
- [ ] P1: Implement Canvas interpreter

### Animation Compilers (parallel work possible)
- [ ] P1: Port Line Drawing to V4
- [ ] P1: Implement Particles compiler
- [ ] P1: Implement Morphing compiler (needs Flubber)
- [ ] P2: Implement Reveal Mask compiler
- [ ] P2: Implement Liquid/Goo compiler
- [ ] P2: Implement Kinetic compiler
- [ ] P2: Implement 3D Transforms compiler
- [ ] P2: Implement Wave Ripple compiler
- [ ] P2: Implement Glitch compiler
- [ ] P3: Implement Typewriter compiler (event-driven)

### UI Integration
- [ ] P1: Create generic SideBySideViewer
- [ ] P1: Create compiler registry
- [ ] P2: Update AnimationCard to show Compare for all
- [ ] P3: Add visual regression tests

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flubber path interpolation complexity | High | Start with simpler morphs, add Flubber later |
| Canvas performance for particles | Medium | Batch rendering, object pooling |
| Typewriter event scripting | Medium | Start scrubbable, can do real-time later |
| Glitch effects need WebGL | Low | SVG filters sufficient for most effects |

---

## Success Criteria

1. All 60 animations have working V4 compilers
2. Compare button visible on every AnimationCard
3. V4 matches HTML original behavior (visual fidelity)
4. All animations are fully scrubbable
5. Same seed produces identical results across scrub/replay

---

## Next Steps

1. **Immediate**: Implement V4 kernel (Phase 1)
2. **Then**: Port Line Drawing as proof-of-concept
3. **Then**: Implement 2-3 more techniques to validate kernel
4. **Finally**: Complete remaining techniques

Start with: `/do:it implement V4 kernel`
