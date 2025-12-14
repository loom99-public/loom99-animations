# PLAN: Complete Macro Coverage for Animation Recipes

**Date**: 2025-12-13
**Status Reference**: STATUS-2025-12-13-macros.md

## Objective

Ensure every animation recipe from `feature_planning_docs/high-level.md` has:
1. A corresponding macro in `macros.ts`
2. All necessary primitive blocks in `blocks.ts`

## Implementation Order

Priority ordering based on:
- Existing block availability (less work = higher priority)
- Recipe complexity
- V4 archetype implementation status

---

## Phase 1: Macros Using Existing Blocks

These macros can be built entirely from existing primitive blocks.

### 1.1 macro:revealMask
**Complexity**: Low
**Existing Blocks**: MaskReveal, PhaseMachine, SVGPathSource, PathRenderer
**Recipe**: logo-08-reveal-mask

```
Blocks needed:
- SVGPathSource → PathRenderer → MaskReveal → Canvas
- PhaseMachine → PhaseProgress → MaskReveal
- Optional: GlowFilter for edge glow
```

### 1.2 macro:liquid
**Complexity**: Medium
**Existing Blocks**: GooFilter, RegionField, TopDropOrigin, WobbleParams
**Recipe**: logo-05-liquid

```
Blocks needed:
- SVGPathSource → SceneToTargets
- TopDropOrigin (start positions above)
- RandomStagger (delays)
- WobbleParams (perturbation)
- GooFilter
- PerElementCircles with larger radii
```

---

## Phase 2: Macros Needing New Blocks

### 2.1 macro:kinetic
**Complexity**: Medium
**Recipe**: logo-06-kinetic
**New Block Needed**: OvershootTransform

**OvershootTransform block definition**:
```typescript
{
  type: 'OvershootTransform',
  category: 'Fields',
  inputs: [],
  outputs: [{ id: 'transforms', type: 'Field<Transform>' }],
  params: {
    startOffsetX: { min: -500, max: 500 },
    startOffsetY: { min: -500, max: 500 },
    startRotation: { min: -720, max: 720 },
    startScale: { min: 0, max: 2 },
    overshoot: { min: 0, max: 2 },
    variation: { min: 0, max: 1 }
  }
}
```

**Macro structure**:
```
SVGPathSource → SceneToTargets
OvershootTransform (randomized starts)
LinearStagger (delays)
PhaseMachine
→ TransformRenderer → Canvas
```

### 2.2 macro:glitch (Enhanced)
**Complexity**: Medium
**Recipe**: logo-04-glitch
**New Block Needed**: GlitchLayers

**GlitchLayers block definition**:
```typescript
{
  type: 'GlitchLayers',
  category: 'Compose',
  inputs: [
    { id: 'content', type: 'RenderTree' },
    { id: 'jitter', type: 'Field<Jitter>' }
  ],
  outputs: [{ id: 'tree', type: 'RenderTree' }],
  params: {
    rgbOffsetMax: 10,
    opacityFlicker: true,
    skewAmount: 5
  }
}
```

### 2.3 macro:waveRipple
**Complexity**: Medium
**Recipe**: logo-09-wave-ripple
**New Block Needed**: WaveTransform

**WaveTransform block definition**:
```typescript
{
  type: 'WaveTransform',
  category: 'Compose',
  inputs: [
    { id: 'content', type: 'RenderTree' },
    { id: 'wave', type: 'Field<Wave>' },
    { id: 'progress', type: 'Signal<Unit>' }
  ],
  outputs: [{ id: 'tree', type: 'RenderTree' }],
  params: {
    waveDirection: 'horizontal' | 'vertical' | 'radial'
  }
}
```

### 2.4 macro:pathMorph
**Complexity**: High
**Recipe**: logo-03-morphing
**New Block Needed**: PathMorphBlend

**PathMorphBlend block definition**:
```typescript
{
  type: 'PathMorphBlend',
  category: 'Compose',
  inputs: [
    { id: 'startPaths', type: 'Field<Path>' },
    { id: 'endPaths', type: 'Field<Path>' },
    { id: 'progress', type: 'Signal<Unit>' }
  ],
  outputs: [{ id: 'paths', type: 'Signal<Path[]>' }],
  params: {
    interpolation: 'linear' | 'cubic'
  }
}
```

**Also needs**: RandomShapeGenerator block
```typescript
{
  type: 'RandomShapeGenerator',
  category: 'Fields',
  outputs: [{ id: 'paths', type: 'Field<Path>' }],
  params: {
    shapeType: 'polygon' | 'blob' | 'squiggle',
    complexity: { min: 3, max: 20 }
  }
}
```

### 2.5 macro:transform3D
**Complexity**: High
**Recipe**: logo-07-3d-transforms
**New Block Needed**: Transform3D

**Transform3D block definition**:
```typescript
{
  type: 'Transform3D',
  category: 'Compose',
  inputs: [
    { id: 'content', type: 'RenderTree' },
    { id: 'progress', type: 'Signal<Unit>' }
  ],
  outputs: [{ id: 'tree', type: 'RenderTree' }],
  params: {
    perspective: 1000,
    rotateXStart: 0, rotateXEnd: 0,
    rotateYStart: 360, rotateYEnd: 0,
    rotateZStart: 0, rotateZEnd: 0,
    translateZStart: -500, translateZEnd: 0,
    oscillation: { amplitude: 5, frequency: 2 }
  }
}
```

### 2.6 macro:typewriter
**Complexity**: High
**Recipe**: logo-10-typewriter
**New Block Needed**: TypewriterComposer

**TypewriterComposer block definition**:
```typescript
{
  type: 'TypewriterComposer',
  category: 'Compose',
  inputs: [
    { id: 'text', type: 'Scene' },  // from TextSource
    { id: 'phase', type: 'Signal<PhaseSample>' }
  ],
  outputs: [{ id: 'program', type: 'Program' }],
  params: {
    charDelay: 0.1,
    deleteDelay: 0.05,
    cursorStyle: 'block' | 'line' | 'underscore',
    cursorBlink: true
  }
}
```

---

## Implementation Tasks

### Task 1: Create Phase 1 Macros
1. Add `macro:revealMask` to macros.ts
2. Add `macro:liquid` to macros.ts
3. Add block definitions to blocks.ts
4. Test both macros in editor

### Task 2: Create OvershootTransform Block
1. Add OvershootTransform to blocks.ts
2. Implement compiler for OvershootTransform
3. Add `macro:kinetic` to macros.ts

### Task 3: Create GlitchLayers Block
1. Add GlitchLayers to blocks.ts
2. Implement compiler (R/G/B layer generation)
3. Update `macro:glitchStorm` or create separate `macro:glitch`

### Task 4: Create WaveTransform Block
1. Add WaveTransform to blocks.ts
2. Implement compiler (traveling wave + decay)
3. Add `macro:waveRipple` to macros.ts

### Task 5: Create PathMorphBlend + RandomShapeGenerator Blocks
1. Add PathMorphBlend to blocks.ts
2. Add RandomShapeGenerator to blocks.ts
3. Implement compilers
4. Add `macro:pathMorph` to macros.ts

### Task 6: Create Transform3D Block
1. Add Transform3D to blocks.ts
2. Implement compiler (CSS 3D transform string generation)
3. Add `macro:transform3D` to macros.ts

### Task 7: Create TypewriterComposer Block
1. Add TypewriterComposer to blocks.ts
2. Implement compiler (event schedule generation)
3. Add `macro:typewriter` to macros.ts

---

## Acceptance Criteria

For each macro:
- [ ] Drops into editor without errors
- [ ] Expands into correct primitive blocks
- [ ] Connections are properly wired
- [ ] Preview renders animation
- [ ] Matches visual style of original HTML animation

## Files to Modify

- `gallery/src/editor/blocks.ts` - Add new block definitions
- `gallery/src/editor/macros.ts` - Add new macros
- `gallery/src/editor/compiler/blocks/*.ts` - Add block compilers

## Estimated Complexity

| Task | New Blocks | New Macros | Complexity |
|------|------------|------------|------------|
| 1 | 0 | 2 | Low |
| 2 | 1 | 1 | Medium |
| 3 | 1 | 1 | Medium |
| 4 | 1 | 1 | Medium |
| 5 | 2 | 1 | High |
| 6 | 1 | 1 | High |
| 7 | 1 | 1 | High |
| **Total** | **7** | **8** | |
