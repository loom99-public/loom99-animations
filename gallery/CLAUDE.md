# gallery/CLAUDE.md

**See root `/CLAUDE.md` for the current task context (V4 ↔ HTML alignment).**

This file contains gallery-specific technical details.

## Commands

```bash
pnpm install           # Install dependencies
pnpm dev               # Start dev server (binds to 0.0.0.0)
pnpm build             # Build for production
pnpm preview           # Preview production build
pnpm test              # Run all tests
pnpm test <filename>   # Run specific test
pnpm test:ui           # Run tests with UI
pnpm test:coverage     # Run tests with coverage
```

## Architecture

### Two Animation Systems

#### 1. Legacy System (`src/core/`, `src/elements/`, `src/animations/`)

Track + Compositor + Renderer pattern - being superseded by V4:
- `Track<T>` - Time-based value interpolation with easing
- `Element` - Base class for animated elements
- `Animation` - Lifecycle orchestration (entrance/hold/exit/waiting)
- `*Compositor` - PathMorphCompositor, TransformCompositor, etc.

Legacy classes in `src/animations/`:
- `HtmlAnimatedLine.ts` - Direct port of original AnimatedLine
- `LineDrawingAnimation.ts` - Factory for line animations
- `ParticleAnimation.ts` - Factory for particle animations
- `LiquidAnimation.ts` - Factory for liquid animations

#### 2. V4 Animation Framework (`src/anim-v4/`) - PRIMARY

Purely functional, deterministic, composable animation system.

**Non-negotiable principles:**
- Animations are time-indexed programs: `Signal<A> = (t: Time, ctx: Context) => A`
- All randomness is explicit, seeded, evaluated at compile-time
- No `Math.random()` at runtime - breaks scrubbing/replay
- Full separation of compile-time, run-time, render-time

**Directory structure:**
```
src/anim-v4/
├── core/                    # 8 kernel primitives
│   ├── types.ts            # Signal, Event, Field, Program, etc.
│   ├── signal.ts           # Signal constructors and combinators
│   ├── event.ts            # Event streams
│   ├── time.ts             # Time transforms, easing
│   ├── rand.ts             # Seedable PRNG
│   ├── scan.ts             # Pure state evolution
│   └── switch.ts           # Event-driven signal switching
├── render/                  # Backend-neutral rendering
│   ├── tree.ts             # RenderTree, RenderNode types
│   └── svg.ts              # SVG interpreter
└── animations/              # Animation archetypes
    ├── line-morph/         # Technique 01
    ├── particles/          # Technique 02
    ├── path-morph/         # Technique 03
    ├── glitch/             # Technique 04
    ├── liquid/             # Technique 05
    ├── kinetic/            # Technique 06
    ├── transform3d/        # Technique 07
    └── typewriter/         # Technique 10
```

### Key Abstractions

**Signal<A>**: Continuous time-indexed value
```typescript
type Signal<A> = (t: Time, ctx: Context) => A
```

**Field<T>**: Per-element compile-time values (BULK FORM)
```typescript
type Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[]
```
**CRITICAL**: Always use BULK form. See `ui_example_docs/scalar-vs-bulk-field.md`.

**Program<Out>**: Complete animation
```typescript
type Program<Out> = {
  signal: Signal<Out>;
  event: EventFn<Ev>;
}
```

**PhaseMachine**: Animation lifecycle (entrance → hold → exit)

### Archetype Pattern

Each archetype in `animations/{name}/`:
```
├── types.ts        # Scene, Fields, Spec interfaces
├── compiler.ts     # BULK FIELD evaluation → Program<RenderTree>
├── modes.ts        # Field generators (original/varied/procedural)
├── render.ts       # Renderer implementation
├── index.ts        # Public exports
└── __tests__/      # Tests
```

### Viewer Components

- `V4Viewer.tsx` - Generic V4 animation viewer with scrubbing
- `SideBySideViewer.tsx` - HTML vs V4 comparison
- `AnimationCard.tsx` - Gallery card routing to viewers

### Testing

- vitest with happy-dom environment
- Tests in `__tests__/` alongside source
- Focus on smoke tests: compile + sample at entrance/hold/exit

### Common Pitfalls

1. **DON'T** use scalar Field form: `(seed, i, n, ctx) => T`
   **DO** use bulk Field form: `(seed, n, ctx) => readonly T[]`

2. **DON'T** call fields inside loops per-frame
   **DO** evaluate all fields once at compile-time

3. **DON'T** use `Math.random()` anywhere
   **DO** use `createPRNG(seed)` for all randomness

4. **DON'T** bake rendering into animation logic
   **DO** produce `RenderTree` and use renderer abstraction
