# CLAUDE.md

Project instructions for Claude Code working on loom99-animations.

## Quick Reference

```bash
cd gallery && pnpm dev      # Start gallery dev server (binds to 0.0.0.0)
cd gallery && pnpm test     # Run tests
cd gallery && pnpm build    # Build for production
```

## Current Task: V4 ↔ Original HTML Animation Alignment

**Goal**: Ensure each V4 animation implementation visually matches its corresponding original HTML animation.

### Animation Inventory (60 total: 10 techniques × 2 targets × 3 variants)

| Technique | Name           | V4 Status | Files                                              |
|-----------|----------------|-----------|---------------------------------------------------|
| 01        | Line Drawing   | ✅ Done   | `anim-v4/animations/line-morph/`                  |
| 02        | Particles      | ✅ Done   | `anim-v4/animations/particles/`                   |
| 03        | Path Morph     | ✅ Done   | `anim-v4/animations/path-morph/`                  |
| 04        | Glitch         | ✅ Done   | `anim-v4/animations/glitch/`                      |
| 05        | Liquid         | ✅ Done   | `anim-v4/animations/liquid/`                      |
| 06        | Kinetic        | ⚠️ Partial| `anim-v4/animations/kinetic/`                     |
| 07        | 3D Transforms  | ⚠️ Partial| `anim-v4/animations/transform3d/`                 |
| 08        | Reveal Mask    | ❌ TODO   | (not yet implemented)                             |
| 09        | Wave Ripple    | ❌ TODO   | (not yet implemented)                             |
| 10        | Typewriter     | ⚠️ Partial| `anim-v4/animations/typewriter/`                  |

### Key Locations

**Original HTML Animations** (the reference/ground truth):
```
animations/logo/logo-{01-10}-{technique}.html           # Original variants
animations/logo/logo-{01-10}-{technique}-varied.html    # Varied variants
animations/logo/logo-{01-10}-{technique}-procedural.html # Procedural variants
animations/text/text-{01-10}-{technique}*.html          # Text target variants
```

**V4 Implementation**:
```
gallery/src/anim-v4/animations/{archetype}/
├── types.ts        # Scene, Fields, Spec interfaces
├── compiler.ts     # BULK FIELD evaluation → Program<RenderTree>
├── modes.ts        # Field generators (original/varied/procedural)
├── render.ts       # Renderer implementation
├── index.ts        # Public exports
└── __tests__/      # Tests
```

**Viewers for Comparison**:
- `gallery/src/components/animations/V4Viewer.tsx` - V4 animation viewer with scrubbing
- `gallery/src/components/animations/SideBySideViewer.tsx` - HTML vs V4 side-by-side comparison
- `gallery/src/components/AnimationCard.tsx` - Gallery card that routes to viewers

**Gallery Data**:
- `gallery/src/data/animations.ts` - All 60 animation metadata entries
- `gallery/src/data/techniques.ts` - Technique definitions
- `gallery/src/data/pathData.ts` - SVG path data for logo/text targets

### Alignment Workflow

For each technique, follow this process:

1. **Open original HTML** in browser:
   ```bash
   open animations/logo/logo-{XX}-{technique}.html
   ```

2. **Run gallery dev server** and navigate to the animation:
   ```bash
   cd gallery && pnpm dev
   # Open http://localhost:5173 (or network IP)
   ```

3. **Compare side-by-side** using the Compare button in the gallery card

4. **Check these aspects for alignment**:
   - **Timing**: Entrance duration, hold duration, exit duration
   - **Easing**: Same easing functions (easeOutQuart, easeOutBack, etc.)
   - **Visual style**: Stroke width, colors, opacity
   - **Animation behavior**: Start positions, trajectories, final positions
   - **Phase transitions**: Smooth entrance → hold → exit flow

5. **Make adjustments** in the V4 compiler/modes files

6. **Run tests** to ensure nothing broke:
   ```bash
   cd gallery && pnpm test
   ```

### Archetype-to-Technique Mapping

| V4 Archetype  | Technique | Original HTML Class      | Key Differences to Watch |
|---------------|-----------|--------------------------|--------------------------|
| line-morph    | 01        | AnimatedLine             | Fold phase, stroke dash  |
| particles     | 02        | ParticleElement          | Trajectory, color shift  |
| path-morph    | 03        | PathMorphCompositor      | Interpolation curves     |
| glitch        | 04        | Canvas-based             | RGB split, noise pattern |
| liquid        | 05        | BlobElement + SVG filter | Goo filter, drop timing  |
| kinetic       | 06        | KineticElement           | Transform composition    |
| transform3d   | 07        | CSS transform3d          | Perspective projection   |
| (reveal)      | 08        | Mask-based               | Mask animation           |
| (wave)        | 09        | SVG transforms           | Sine wave propagation    |
| typewriter    | 10        | Canvas text              | Character timing         |

### V4 Architecture Reminders

**BULK Field Form** (CRITICAL - see `ui_example_docs/scalar-vs-bulk-field.md`):
```typescript
// CORRECT: Bulk form - evaluated once at compile time
type Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[]

// WRONG: Scalar form - DO NOT USE
// (seed, i, n, ctx) => T
```

**Compiler Pattern**:
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

**Phase Machine**:
- Typical phases: `entrance` → `hold` → `exit`
- Use `PhaseMachines.sample(machine, t)` to get current phase info
- Duration values differ by variant (original/varied/procedural)

### Specific Files to Check When Aligning

**Technique 01 - Line Drawing**:
- Original: `animations/logo/logo-01-line-drawing.html` (lines 85-200: AnimatedLine class)
- V4: `gallery/src/anim-v4/animations/line-morph/compiler.ts`
- Key: Match `easeOutQuart`, fold phase timing, stroke-dasharray behavior

**Technique 02 - Particles**:
- Original: `animations/logo/logo-02-particles.html`
- V4: `gallery/src/anim-v4/animations/particles/compiler.ts`
- Key: Start pattern (center explosion), trajectory curves, color shifting

**Technique 03 - Path Morph**:
- Original: `animations/logo/logo-03-morphing.html`
- V4: `gallery/src/anim-v4/animations/path-morph/compiler.ts`
- Key: Source/target shape interpolation, per-path timing

**Technique 04 - Glitch**:
- Original: `animations/logo/logo-04-glitch.html`
- V4: `gallery/src/anim-v4/animations/glitch/compiler.ts`
- Key: RGB split offsets, scanline effects, noise generation

**Technique 05 - Liquid**:
- Original: `animations/logo/logo-05-liquid.html`
- V4: `gallery/src/anim-v4/animations/liquid/compiler.ts`
- Key: Goo filter settings, drop entrance timing, blob spread

**Technique 06-10**: Similar pattern - check corresponding HTML and V4 files

### Reference Documentation

Authoritative specs in `ui_example_docs/`:
- `prompt.md` - Core philosophy
- `scalar-vs-bulk-field.md` - **MUST READ** for Field form
- `v4_kernel.md` - 8 kernel primitives
- `high-level.md` - Architecture overview
- `archetypes/*.md` - Per-technique specifications

### Common Alignment Issues

1. **Timing mismatch**: Original uses different duration constants
2. **Easing mismatch**: V4 using different easing function
3. **Start position**: Particles/lines starting from wrong origin
4. **Color handling**: Original may use gradients or dynamic colors
5. **Exit behavior**: V4 may be missing exit animation entirely
6. **Opacity**: Original snaps to 1, V4 might be fading

### Dev Server Notes

- Bind to `0.0.0.0` for network access (already configured in vite.config.ts)
- Gallery runs on default Vite port (usually 5173)
- Use V4Viewer scrubbing to pause at specific frames for comparison
