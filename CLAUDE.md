# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
just dev                       # Start gallery dev server (port 8889, binds 0.0.0.0)
cd gallery && pnpm dev         # Alternative: default vite port
cd gallery && pnpm test        # Run tests (vitest + happy-dom)
cd gallery && pnpm test:ui     # Tests with UI dashboard
cd gallery && pnpm build       # Production build
cd gallery && pnpm lint        # ESLint

# Single test file
cd gallery && pnpm test src/anim-v4/__tests__/kernel.test.ts

# Serve original HTML animations (for comparison)
just serve-html                # Python http.server on port 8888
```

## Architecture Overview

This is a **visual animation editor** with a **node-based patch bay** interface. Two major systems:

1. **Gallery** (`gallery/src/`) - React app with animation viewer and visual editor
2. **V4 Animation Framework** (`gallery/src/anim-v4/`) - Purely functional animation kernel

### Routes

- `http://localhost:5173/` - Gallery view (browse 60 animations)
- `http://localhost:5173/#/editor` - Visual editor (patch bay)

## Editor Architecture (`gallery/src/editor/`)

A visual programming environment for building animations. ~5K lines of TypeScript/React.

### Core Files

| File | Purpose |
|------|---------|
| `store.ts` | MobX state: blocks, connections, lanes, UI state |
| `types.ts` | Type system: SlotType, Block, Connection, Lane, Patch |
| `blocks.ts` | Block registry with ParamSchema for inspector generation |
| `laneLayouts.ts` | Layout presets (Simple: 5 lanes, Detailed: 9 lanes) |
| `portUtils.ts` | Port compatibility checking, connection logic |

### UI Components

| Component | Purpose |
|-----------|---------|
| `Editor.tsx` | Main container, DnD context setup |
| `PatchBay.tsx` | Renders lanes, blocks, ports, connection wires |
| `BlockLibrary.tsx` | Draggable block palette with filtering |
| `Inspector.tsx` | Property editor for selected block, port wiring panel |
| `Transport.tsx` | Playback controls (play/pause, scrub, seed, speed) |
| `PreviewPanel.tsx` | Live animation preview |
| `LogWindow.tsx` | System log viewer |

### Key Concepts

**Lanes** organize blocks by value domain (not timeline):
- Scene → Phase → Fields → Spec → Program → Output

**Slot Types** enforce type-safe connections (14 types):
```typescript
'Scene' | 'SceneTargets' | 'Field<Point>' | 'Field<Duration>' |
'Signal<Unit>' | 'Signal<PhaseSample>' | 'Program' | 'RenderTree' | ...
```

**Block lifecycle**: Library → Drag to lane → Wire ports → Configure params → Compile → Render

## V4 Animation Framework (`gallery/src/anim-v4/`)

Purely functional, deterministic, composable animation system.

### 8 Kernel Primitives (`core/`)

| Primitive | Type | Purpose |
|-----------|------|---------|
| Signal | `(t, ctx) => A` | Continuous time-indexed value |
| Event | `{ signal, occurrences[] }` | Discrete timestamped occurrences |
| map/zip | combinators | Functional signal composition |
| time transforms | delay/stretch/warp | Non-destructive time manipulation |
| switch/until | event-driven | Signal switching on events |
| scan | pure state | Physics simulation, accumulation |
| Rand | `(seed, n, ctx) => T[]` | Seedable PRNG, compile-time only |
| RenderTree | tree structure | Backend-neutral render output |

### Non-Negotiable Principles

1. **No `Math.random()` at runtime** - Breaks scrubbing/replay
2. **All randomness seeded, evaluated at compile-time**
3. **Animations are time-indexed programs**: `Signal<A> = (t, ctx) => A`
4. **Full separation**: compile-time → run-time → render-time

### CRITICAL: Bulk Field Form

```typescript
// CORRECT: Bulk form - evaluated once at compile time
type Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[]

// WRONG: Scalar form - DO NOT USE in V4
// (seed, i, n, ctx) => T
```

Usage pattern in compilers:
```typescript
// Evaluate ALL fields once, OUTSIDE the map
const delays = fields.delay(seed, n, ctx);
const durations = fields.duration(seed, n, ctx);

// Then map over parts, indexing into pre-evaluated arrays
const params = scene.parts.map((part, i) => ({
  delay: delays[i]!,
  duration: durations[i]!,
}));
```

### Animation Archetypes (`animations/`)

Each archetype follows this structure:
```
{archetype}/
├── types.ts        # Scene, Fields, Spec interfaces
├── compiler.ts     # BULK FIELD evaluation → Program<RenderTree>
├── modes.ts        # Field generators (original/varied/procedural)
├── render.ts       # Renderer implementation
└── index.ts        # Public exports
```

Implemented: line-morph, particles, path-morph, glitch, liquid, kinetic, transform3d, typewriter

## Animation Inventory (60 total: 10 techniques × 2 targets × 3 variants)

| Technique | Name | V4 Status | Archetype |
|-----------|------|-----------|-----------|
| 01 | Line Drawing | ✅ Done | line-morph |
| 02 | Particles | ✅ Done | particles |
| 03 | Path Morph | ✅ Done | path-morph |
| 04 | Glitch | ✅ Done | glitch |
| 05 | Liquid | ✅ Done | liquid |
| 06 | Kinetic | ⚠️ Partial | kinetic |
| 07 | 3D Transforms | ⚠️ Partial | transform3d |
| 08 | Reveal Mask | ❌ TODO | - |
| 09 | Wave Ripple | ❌ TODO | - |
| 10 | Typewriter | ⚠️ Partial | typewriter |

## Key Locations

**Original HTML** (ground truth for alignment):
```
animations/logo/logo-{01-10}-{technique}*.html
animations/text/text-{01-10}-{technique}*.html
```

**V4 Implementation**:
```
gallery/src/anim-v4/animations/{archetype}/
```

**Comparison Viewers**:
- `gallery/src/components/animations/V4Viewer.tsx` - V4 with time scrubbing
- `gallery/src/components/animations/SideBySideViewer.tsx` - HTML vs V4 side-by-side

**Gallery Data**:
- `gallery/src/data/animations.ts` - 60 animation metadata entries
- `gallery/src/data/pathData.ts` - SVG path data for targets

## Reference Documentation

Authoritative specs in `ui_example_docs/`:
- `scalar-vs-bulk-field.md` - **MUST READ** for Field form
- `v4_kernel.md` - 8 kernel primitives
- `high-level.md` - Architecture overview
- `archetypes/*.md` - Per-technique specifications
- `foundational_slice/*.md` - Editor architecture docs

## Alignment Workflow (V4 ↔ HTML)

1. Open original: `open animations/logo/logo-{XX}-{technique}.html`
2. Run gallery: `just dev` → `http://localhost:8889`
3. Use SideBySideViewer to compare
4. Check: timing, easing, visual style, animation behavior, phase transitions
5. Adjust V4 compiler/modes files
6. Run tests: `cd gallery && pnpm test`

## Common Pitfalls

**V4 Animation**:
- DON'T use scalar Field form
- DON'T call fields inside per-frame loops
- DON'T use `Math.random()` anywhere
- DO produce RenderTree and use renderer abstraction

**Editor**:
- Port types determine connection validity (not lane placement)
- Lanes are UI organization, not semantic constraints
