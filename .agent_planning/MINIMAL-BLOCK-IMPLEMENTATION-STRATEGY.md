# Minimal Block Implementation Strategy

**Created**: 2025-12-18
**Status**: Draft - Awaiting Approval
**Complexity**: High (foundational architecture work)

## Executive Summary

This document outlines the strategy for implementing a minimal set of **canonical primitive blocks** that fully exercise the system architecture, with **buses as first-class citizens** (not wires). The goal is to validate the complete pipeline before migrating or evaluating existing blocks.

Key insight from design docs: **Domain is the primitive**, not "GridPoints". Arrangement patterns (grid, circle, line) are mappers that take a Domain and output `Field<vec2>`.

---

## Guiding Principles

### 1. Buses First
> "Everyone has wires. Buses are what make this unique."

Direct wiring is an "advanced users only" escape hatch. The default workflow is:
- Blocks publish to buses
- Blocks subscribe to buses (with optional lens transforms)
- Buses provide named semantic channels (phaseA, energy, pulse, palette)

### 2. Domain is Identity
The **Domain** is the atomic unit of "these elements exist with stable identity". Everything per-element flows from Domain:
- Fields are parameterized by Domain
- Element IDs are stable across recompiles
- Mappers don't create/kill identity, they only assign attributes

### 3. Lazy Field Evaluation
Fields compile to **FieldExpr** DAGs, not eager arrays. Materialization happens at renderer sinks.

### 4. No Block Bundles Axes
Every primitive does exactly one thing. "GridPoints" bundles Domain + Mapper + Renderer, so it's a **composite**, not a primitive.

---

## Implementation Order (from Design Docs)

### Phase 0: Core Types & Infrastructure

Before any blocks, we need:

#### 0.1 Domain as First-Class Type

**Current state**: Domain exists in `unified/Domain.ts` but is not integrated into the type system.

**Required**:
```typescript
// In types.ts - add Domain as special type
export type TypeWorld = 'scalar' | 'signal' | 'field' | 'special';

// New domain type
export type SpecialDomain = 'domain' | 'renderTree' | 'bounds' | 'path';

// TypeDesc for Domain
const DOMAIN_TYPE: TypeDesc = {
  world: 'special',
  domain: 'domain',
  category: 'core',
  busEligible: false, // Domains don't flow through buses
};
```

**Domain contract** (non-negotiable):
```typescript
interface Domain {
  readonly id: string;           // Unique domain identifier
  readonly count: number;        // Element count
  readonly elements: readonly ElementId[];  // Stable IDs
  readonly seed?: number;        // For per-ID hashing
}
```

#### 0.2 Field Bus Compilation (BLOCKING)

**Current state**: `compileBusAware.ts` rejects Field buses with `FieldBusNotSupported` error.

**Required work**:
1. Implement `combineFieldArtifacts()` in `compileBusAware.ts`
2. Support combine modes: `sum`, `average`, `max`, `min`, `last`
3. Wire FieldExpr for lazy combination (no eager materialization)

```typescript
// New artifact kind for FieldExpr
| { kind: 'FieldExpr:number'; value: FieldExpr<number>; domain: Domain }
| { kind: 'FieldExpr:vec2'; value: FieldExpr<Vec2>; domain: Domain }
| { kind: 'FieldExpr:color'; value: FieldExpr<Color>; domain: Domain }
```

#### 0.3 Default Signal Buses

Ship v1 with these default buses (from StarterCompositeLibrary.md):
- `phaseA: signal:phase` - Primary animation phase
- `phaseB: signal:phase` - Secondary/slow phase
- `energy: signal:number` - Intensity/amplitude
- `pulse: signal:trigger` - Event triggers
- `palette: signal:color` - Color bias

---

### Phase 1: Domain Primitives

#### 1.1 DomainN

**Purpose**: Create a stable population of N elements.

```typescript
// Block definition
DomainN: {
  form: 'primitive',
  inputs: [
    { name: 'n', type: 'scalar:number' },
    { name: 'seed', type: 'scalar:number', optional: true },
  ],
  outputs: [
    { name: 'domain', type: 'special:domain' },
  ],
}
```

**No-jank contract**:
- If n increases: append new IDs deterministically
- If n decreases: keep first K IDs (stable)
- IDs = `[0, 1, 2, ..., n-1]` (simplest policy)

**Test**:
```typescript
test('DomainN produces stable IDs across recompiles', () => {
  const domain1 = DomainN.compile({ n: 10, seed: 42 });
  const domain2 = DomainN.compile({ n: 10, seed: 42 });
  expect(domain1.elements).toEqual(domain2.elements);
});

test('DomainN grows/shrinks stably', () => {
  const domain10 = DomainN.compile({ n: 10 });
  const domain15 = DomainN.compile({ n: 15 });
  // First 10 IDs unchanged
  expect(domain15.elements.slice(0, 10)).toEqual(domain10.elements);
});
```

---

### Phase 2: Field Primitives (Mappers)

#### 2.1 PositionMapGrid

**Purpose**: Map Domain element IDs to grid positions.

```typescript
PositionMapGrid: {
  form: 'primitive',
  inputs: [
    { name: 'domain', type: 'special:domain' },
    { name: 'rows', type: 'scalar:number' },
    { name: 'cols', type: 'scalar:number' },
    { name: 'spacing', type: 'scalar:number' },
    { name: 'origin', type: 'scalar:vec2' },
    { name: 'order', type: 'scalar:string' }, // 'rowMajor' | 'serpentine'
    { name: 'fit', type: 'scalar:string' },   // 'wrap' | 'crop'
  ],
  outputs: [
    { name: 'pos', type: 'field:vec2' },
  ],
}
```

**Critical rule**: Output MUST provide a position for every element ID, regardless of rows*cols vs domain.count mismatch.

#### 2.2 PositionMapCircle

```typescript
PositionMapCircle: {
  form: 'primitive',
  inputs: [
    { name: 'domain', type: 'special:domain' },
    { name: 'center', type: 'scalar:vec2' },
    { name: 'radius', type: 'scalar:number' },
    { name: 'startAngle', type: 'scalar:number' },
    { name: 'winding', type: 'scalar:number' }, // +1/-1
    { name: 'distribution', type: 'scalar:string' }, // 'even' | 'goldenAngle'
  ],
  outputs: [
    { name: 'pos', type: 'field:vec2' },
  ],
}
```

#### 2.3 FieldConstNumber / FieldConstColor

**Purpose**: Uniform per-element value.

```typescript
FieldConstNumber: {
  form: 'primitive',
  inputs: [
    { name: 'domain', type: 'special:domain' },
    { name: 'value', type: 'scalar:number' },
  ],
  outputs: [
    { name: 'out', type: 'field:number' },
  ],
}
```

Compiles to: `FieldExpr { kind: 'const', value, domain }`

#### 2.4 FieldHash01ById

**Purpose**: Deterministic per-element variation in [0,1).

```typescript
FieldHash01ById: {
  form: 'primitive',
  inputs: [
    { name: 'domain', type: 'special:domain' },
    { name: 'seed', type: 'scalar:number' },
  ],
  outputs: [
    { name: 'u', type: 'field:number' },
  ],
}
```

**Critical**: Hash must be stable for element ID + seed, NOT depend on element index ordering.

```typescript
// Implementation
const hash = (elementId: string, seed: number): number => {
  // Use element ID, not index
  const h = cyrb53(elementId, seed);
  return (h % 1000000) / 1000000; // [0, 1)
};
```

#### 2.5 FieldMapNumber / FieldZipNumber

**Purpose**: Lazy field combinators (compile to FieldExpr, not arrays).

```typescript
FieldMapNumber: {
  form: 'primitive',
  inputs: [
    { name: 'x', type: 'field:number' },
    { name: 'fn', type: 'scalar:string' }, // 'neg' | 'abs' | 'sin' | 'smoothstep' | ...
    // optional params per fn
  ],
  outputs: [
    { name: 'y', type: 'field:number' },
  ],
}

FieldZipNumber: {
  form: 'primitive',
  inputs: [
    { name: 'a', type: 'field:number' },
    { name: 'b', type: 'field:number' },
    { name: 'op', type: 'scalar:string' }, // 'add' | 'sub' | 'mul' | 'min' | 'max'
  ],
  outputs: [
    { name: 'out', type: 'field:number' },
  ],
}
```

---

### Phase 3: Signal Primitives

#### 3.1 PhaseClock

**Purpose**: Scrub-safe derived phase signal.

```typescript
PhaseClock: {
  form: 'primitive',
  inputs: [
    { name: 'period', type: 'scalar:number' }, // ms
    { name: 'offset', type: 'scalar:number', optional: true },
    { name: 'phaseOffset', type: 'scalar:number', optional: true }, // [0,1]
  ],
  outputs: [
    { name: 'phase', type: 'signal:phase' },
  ],
}
```

**Implementation**:
```typescript
phase(t) = fract((t + offset) / period + phaseOffset)
```

**No-jank**: Phase derives from absolute time, not accumulated frames. Editing params shifts phase, doesn't reset state.

#### 3.2 TriggerOnWrap

```typescript
TriggerOnWrap: {
  form: 'primitive',
  inputs: [
    { name: 'phase', type: 'signal:phase' },
  ],
  outputs: [
    { name: 'trig', type: 'signal:trigger' },
  ],
}
```

---

### Phase 4: Renderer Primitives

#### 4.1 RenderInstances2D

**Purpose**: Draw one instance per domain element. This is the primary Field materialization sink.

```typescript
RenderInstances2D: {
  form: 'primitive',
  inputs: [
    { name: 'domain', type: 'special:domain' },
    { name: 'pos', type: 'field:vec2' },
    { name: 'shape', type: 'scalar:string' }, // 'circle' | 'square' | 'triangle' | 'path'
    { name: 'pathAsset', type: 'special:path', optional: true },
    { name: 'size', type: 'field:number' },
    { name: 'rot', type: 'field:number', optional: true },
    { name: 'fill', type: 'field:color' },
    { name: 'opacity', type: 'field:number', optional: true },
  ],
  outputs: [
    { name: 'tree', type: 'special:renderTree' },
  ],
}
```

**Implementation note**: Evaluate FieldExprs into typed buffers once per frame for the domain. Emit efficient RenderTree (ideally instanced layer, not N nodes).

#### 4.2 LayerCombine

```typescript
LayerCombine: {
  form: 'primitive',
  inputs: [
    { name: 'a', type: 'special:renderTree' },
    { name: 'b', type: 'special:renderTree' },
    { name: 'mode', type: 'scalar:string' }, // 'over' | 'add' | 'multiply'
  ],
  outputs: [
    { name: 'out', type: 'special:renderTree' },
  ],
}
```

---

### Phase 5: Composites (Proof of System)

#### 5.1 GridPoints Composite

**Purpose**: Validate composite expansion works. This is what users actually drop.

```typescript
registerComposite({
  id: 'composite:gridPoints',
  label: 'Grid Points',
  description: 'Structured grid population with rendering',
  subcategory: 'Sources',
  laneKind: 'Scene',

  graph: {
    nodes: {
      domain: { type: 'DomainN', params: { /* n derived from rows*cols */ } },
      mapper: { type: 'PositionMapGrid' },
      sizeField: { type: 'FieldConstNumber' },
      colorField: { type: 'FieldConstColor' },
      renderer: { type: 'RenderInstances2D', params: { shape: 'circle' } },
    },
    edges: [
      { from: 'domain:domain', to: 'mapper:domain' },
      { from: 'domain:domain', to: 'sizeField:domain' },
      { from: 'domain:domain', to: 'colorField:domain' },
      { from: 'domain:domain', to: 'renderer:domain' },
      { from: 'mapper:pos', to: 'renderer:pos' },
      { from: 'sizeField:out', to: 'renderer:size' },
      { from: 'colorField:out', to: 'renderer:fill' },
    ],
    inputMap: {},  // Expose params as composite inputs
    outputMap: { tree: 'renderer:tree', domain: 'domain:domain' },
  },

  exposedInputs: [
    { id: 'rows', label: 'Rows', slotType: 'Scalar:number', ... },
    { id: 'cols', label: 'Cols', slotType: 'Scalar:number', ... },
    { id: 'spacing', label: 'Spacing', slotType: 'Scalar:number', ... },
    { id: 'size', label: 'Size', slotType: 'Scalar:number', ... },
    { id: 'color', label: 'Color', slotType: 'Scalar:color', ... },
  ],
  exposedOutputs: [
    { id: 'tree', label: 'RenderTree', slotType: 'RenderTree', ... },
    { id: 'domain', label: 'Domain', slotType: 'Domain', ... },
  ],
});
```

---

## End-to-End Test Design

### Test: Full Pipeline Through Buses

This test validates:
1. Domain creation
2. Field generation via bus
3. Signal → Field broadcast
4. Per-element phase offset via bus
5. Renderer materialization
6. Time scrubbing produces deterministic output

```typescript
describe('End-to-End: Minimal Blocks Through Buses', () => {
  it('renders animated grid via bus routing', () => {
    // Setup default buses
    const phaseABus = createBus('phaseA', { world: 'signal', domain: 'phase' }, 'last', 0);

    // Create patch
    const patch: PatchDefinition = {
      blocks: new Map([
        ['domain1', { id: 'domain1', type: 'DomainN', params: { n: 16 } }],
        ['mapper1', { id: 'mapper1', type: 'PositionMapGrid', params: { rows: 4, cols: 4, spacing: 50 } }],
        ['clock1', { id: 'clock1', type: 'PhaseClock', params: { period: 2000 } }],
        ['hash1', { id: 'hash1', type: 'FieldHash01ById', params: { seed: 42 } }],
        ['sizeConst', { id: 'sizeConst', type: 'FieldConstNumber', params: { value: 10 } }],
        ['colorConst', { id: 'colorConst', type: 'FieldConstColor', params: { value: '#ff0000' } }],
        ['renderer', { id: 'renderer', type: 'RenderInstances2D', params: { shape: 'circle' } }],
      ]),
      connections: [
        // Domain flows through direct wires (internal plumbing)
        { from: { blockId: 'domain1', port: 'domain' }, to: { blockId: 'mapper1', port: 'domain' } },
        { from: { blockId: 'domain1', port: 'domain' }, to: { blockId: 'hash1', port: 'domain' } },
        { from: { blockId: 'domain1', port: 'domain' }, to: { blockId: 'sizeConst', port: 'domain' } },
        { from: { blockId: 'domain1', port: 'domain' }, to: { blockId: 'colorConst', port: 'domain' } },
        { from: { blockId: 'domain1', port: 'domain' }, to: { blockId: 'renderer', port: 'domain' } },
        // Position via wire (internal)
        { from: { blockId: 'mapper1', port: 'pos' }, to: { blockId: 'renderer', port: 'pos' } },
        // Size/color via wire (internal)
        { from: { blockId: 'sizeConst', port: 'out' }, to: { blockId: 'renderer', port: 'size' } },
        { from: { blockId: 'colorConst', port: 'out' }, to: { blockId: 'renderer', port: 'fill' } },
      ],
      buses: new Map([['phaseA', phaseABus]]),
      publishers: [
        // Clock publishes to phaseA
        { blockId: 'clock1', busId: 'phaseA', port: 'phase', sortKey: 0 },
      ],
      listeners: [
        // Renderer opacity could listen to phaseA (example)
        // This is where lenses would transform phase → opacity
      ],
    };

    // Compile
    const result = compilePatch(patch);
    expect(result.ok).toBe(true);

    // Evaluate at different times
    const rt = { viewport: { w: 400, h: 400, dpr: 1 } };

    const tree0 = result.program!.signal(0, rt);
    const tree500 = result.program!.signal(500, rt);
    const tree1000 = result.program!.signal(1000, rt);

    // Verify deterministic (same time → same output)
    const tree0Again = result.program!.signal(0, rt);
    expect(tree0).toEqual(tree0Again);

    // Verify 16 elements rendered
    expect(countRenderNodes(tree0)).toBe(16);
  });

  it('supports time scrubbing without state corruption', () => {
    // Jump around in time
    const times = [0, 1000, 500, 2000, 250, 1500];
    const outputs = times.map(t => result.program!.signal(t, rt));

    // Re-evaluate same times
    const outputs2 = times.map(t => result.program!.signal(t, rt));

    // Must be identical
    expect(outputs).toEqual(outputs2);
  });
});
```

---

## File Structure

New files to create in `gallery/src/editor/compiler/unified/blocks/`:

```
unified/blocks/
├── domain/
│   ├── DomainN.ts
│   └── DomainFromSVGSample.ts (later)
├── mappers/
│   ├── PositionMapGrid.ts
│   ├── PositionMapCircle.ts
│   └── PositionMapLine.ts (later)
├── fields/
│   ├── FieldConstNumber.ts
│   ├── FieldConstColor.ts
│   ├── FieldHash01ById.ts
│   ├── FieldMapNumber.ts
│   └── FieldZipNumber.ts
├── signals/
│   ├── PhaseClock.ts
│   └── TriggerOnWrap.ts
├── render/
│   ├── RenderInstances2D.ts
│   └── LayerCombine.ts
└── index.ts  (exports all)
```

---

## Success Criteria

### Definition of Done

1. **Field buses compile** - No more `FieldBusNotSupported` errors
2. **Domain is first-class** - `special:domain` type flows through system
3. **7 primitives work** - DomainN, PositionMapGrid, FieldConstNumber, FieldConstColor, FieldHash01ById, PhaseClock, RenderInstances2D
4. **End-to-end test passes** - Full pipeline through buses, time scrubbing works
5. **GridPoints composite works** - Expands at compile time, renders correctly
6. **No legacy block dependencies** - All new implementations from scratch

### What This Enables

Once complete, we can:
1. Evaluate existing blocks against canonical primitives
2. Decide which to migrate, which to rebuild, which to discard
3. Build the full starter composite library
4. Implement lenses for bus → parameter transformation
5. Ship the "first demo" assembly from StarterCompositeLibrary.md

---

## Resolved Questions

### 1. Field buses first? ✅ CONFIRMED

Yes, 10000%. Buses are the core workflow.

### 2. FieldExpr materialization strategy ✅ ANSWERED

**RenderInstances2D should batch-evaluate all fields into typed buffers once per frame (per domain)**, then render from those buffers.

Key points:
- Renderer is the natural materialization sink (lazy → concrete)
- Do NOT materialize ad-hoc upstream (duplicates work, blows cache)
- Do NOT evaluate per-element via callbacks (GC pressure, death-by-dispatch)

**Evaluation plan per frame**:
1. Ensure DomainRuntime exists (stable ids, count, scratch buffers)
2. Evaluate each FieldExpr into typed buffer:
   - `number` → `Float32Array`
   - `vec2` → two arrays or interleaved
   - `color` → packed `Uint32Array`
3. Render from buffers

**Caching**: Cache by `(FieldExprId, DomainId, frameStamp)`. Do NOT reallocate buffers every frame - reuse arenas per renderer+domain.

### 3. Default bus creation ✅ ANSWERED

**Yes** - auto-create default buses on new patch init.

**V1 defaults** (Signal world only):
- `phaseA`: signal:phase, combine=last, silent=0
- `phaseB`: signal:phase, combine=last, silent=0
- `energy`: signal:number, combine=sum, silent=0
- `pulse`: signal:trigger, combine=or, silent=false
- `palette`: signal:color, combine=layer, silent=black

**Policy**:
- Only create for new patches (or when patch has no buses)
- Never silently inject into existing patches
- Mark as `origin: 'built-in'` for UI treatment (pin at top, etc.)

### 4. Composite expansion timing ✅ ANSWERED

**Do expansion in the unified compiler**, NOT in `editorToPatch()`.

**Rationale**:
- `editorToPatch()` should be faithful snapshot of user authoring
- Compiler is where all lowering happens (composites, adapters, lenses, bus resolution)
- Compiler handles: recursive composites, shared definition caching, stable node identity mapping

**Exception**: "Expand Composite" as explicit user command → mutates authored patch in editor layer, not automatic during compile.
