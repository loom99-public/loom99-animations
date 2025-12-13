# Plan: V3 Animation Framework Implementation

## Goal
Implement a clean, foundational animation framework based on the concepts in WHAT_IS_AN_ANIMATION.md. The framework should be:
- Pure at its core (no React dependency in the fundamentals)
- Wrapped in React for gallery integration
- Side-by-side comparable with HTML Original and React Port (3-way comparison)

## Architecture

### Layer 1: Pure Animation Core (`gallery/src/anim-v3/core/`)
No React, no DOM. Pure functions and types.

```
core/
  types.ts        # Fundamental types: Behavior, Curve, Clock, Field, Mode, Plan, etc.
  prng.ts         # Seeded PRNG (mulberry32)
  fields.ts       # Field generators (origin, offset, variance)
  modes.ts        # Named modes (converge, cascade, diagonal)
  curves.ts       # Curve generators (morphProgress, opacity)
  clocks.ts       # Clock functions (ramp, eased)
  compose.ts      # Combinators (shift, parallel, stagger)
  compile.ts      # Plan compilers (shootIn, etc.)
```

### Layer 2: Renderers (`gallery/src/anim-v3/render/`)
Takes Plan + time → mutations. Still no React.

```
render/
  svg.ts          # SVG path renderer (morphProgress → d string)
  types.ts        # RenderContext, etc.
```

### Layer 3: React Integration (`gallery/src/anim-v3/react/`)
Thin wrapper that connects Plan to React lifecycle.

```
react/
  useAnimation.ts    # Hook: compiles plan, manages RAF/scrubbing
  AnimationSVG.tsx   # Component: renders SVG container, delegates to renderer
```

### Layer 4: Line Drawing Implementation (`gallery/src/anim-v3/animations/`)
Specific animation implementations using the framework.

```
animations/
  line-drawing/
    scene.ts      # SceneElements from LOGO_PATHS
    compiler.ts   # shootIn compiler for line drawing
    index.ts      # Exports Plan compiler
```

## Implementation Steps

### Phase 1: Core Types and PRNG
1. Create `types.ts` with all fundamental types
2. Create `prng.ts` with seeded random

### Phase 2: Fields and Modes
3. Create `fields.ts` with Field type and noise utilities
4. Create `modes.ts` with converge/cascade/diagonal modes

### Phase 3: Curves and Clocks
5. Create `curves.ts` with curve generators
6. Create `clocks.ts` with ramp, eased clocks

### Phase 4: Composition and Compilation
7. Create `compose.ts` with shift, parallel, stagger
8. Create `compile.ts` with generic plan compilation

### Phase 5: Renderer
9. Create `render/types.ts` with RenderContext
10. Create `render/svg.ts` with morphProgress → d interpolation

### Phase 6: React Integration
11. Create `useAnimation.ts` hook
12. Create `AnimationSVG.tsx` component

### Phase 7: Line Drawing Animation
13. Create `animations/line-drawing/scene.ts` - convert LOGO_PATHS to SceneElements
14. Create `animations/line-drawing/compiler.ts` - shootIn plan compiler
15. Create barrel export

### Phase 8: Gallery Integration
16. Update SideBySideViewer to support 3-way comparison
17. Update CSS for new layout (row-based, 3 panels)
18. Wire up V3 animation to comparison view
19. Update AnimationCard to show 3-way compare for line drawing animations

## File Structure Preview

```
gallery/src/anim-v3/
├── core/
│   ├── types.ts
│   ├── prng.ts
│   ├── fields.ts
│   ├── modes.ts
│   ├── curves.ts
│   ├── clocks.ts
│   ├── compose.ts
│   └── compile.ts
├── render/
│   ├── types.ts
│   └── svg.ts
├── react/
│   ├── useAnimation.ts
│   └── AnimationSVG.tsx
├── animations/
│   └── line-drawing/
│       ├── scene.ts
│       ├── compiler.ts
│       └── index.ts
└── index.ts
```

## Key Design Decisions

1. **Plan is compiled once** - Mode selection, field sampling, all randomness happens at compile time
2. **Behavior is a pure function** - `(t, input) => state`, no side effects
3. **Renderer is separate** - Same Plan could render to Canvas or WebGL
4. **React is a thin shell** - useAnimation hook + SVG container, nothing more
5. **Modes own their fields** - Each mode bundles origin + offset + envelope

## Success Criteria

- [ ] V3 animation visually matches HTML Original when using same seed
- [ ] 3-way comparison works in gallery
- [ ] Core can be extracted without React (no React imports in core/)
- [ ] Adding new modes is just adding a Mode object
- [ ] Phases (entrance/hold/fold) are explicit in the Plan

## Testing Approach

1. Unit test PRNG determinism
2. Unit test field generators produce expected distributions
3. Visual comparison in 3-way viewer
4. Scrubbing works identically across all 3 implementations
