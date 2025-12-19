# Phase 1: Bus-Aware Compiler Core

**Status**: COMPLETE
**Goal**: Make buses real in the compiler and runtime.

---

## Summary

Phase 1 transformed buses from a data structure into a first-class compilation target. The compiler now builds a unified dependency graph including both blocks and buses, with deterministic ordering and strict validation.

---

## Implemented Components

### 1. Unified Dependency Graph
**File**: `compiler/unified/DependencyGraph.ts` (8,885 lines)

```typescript
interface DependencyGraph {
  nodes: Map<NodeId, Node>;        // BlockOut | BusValue
  edges: Edge[];                    // Wire | Publisher | Listener
  adjacency: Map<NodeId, NodeId[]>;
  reverseAdjacency: Map<NodeId, NodeId[]>;
}
```

**Features**:
- BlockOut nodes for block outputs
- BusValue nodes for combined bus values
- Bidirectional navigation
- SCC detection for illegal cycles

### 2. Bus System Core
**Files**: `types.ts`, `stores/BusStore.ts`

```typescript
interface Bus {
  id: BusId;
  name: string;
  type: TypeDesc;
  combineMode: 'sum' | 'average' | 'max' | 'min' | 'last' | 'layer';
  sortKey: number;
  origin: 'built-in' | 'user';
}
```

**Default Buses** (auto-created on new patch):
- `phaseA` - Signal<phase> - primary animation driver
- `phaseB` - Signal<phase> - slow/ambient cycles
- `energy` - Signal<number> - intensity/amplitude
- `pulse` - Signal<trigger> - discrete events
- `palette` - Signal<color> - color theming

### 3. Bus Compilation Pipeline
**File**: `compiler/compileBusAware.ts` (24,745 lines)

**Multi-pass compilation**:
1. **Pass 1**: Compile blocks producing artifacts
2. **Pass 2**: Collect publishers (sorted by sortKey)
3. **Pass 3**: Apply combine modes
4. **Pass 4**: Compile listeners with adapters + lenses

**Deterministic Ordering** (per SORTKEY-CONTRACT.md):
- Publishers sorted by sortKey (ascending)
- Tie-breaker: stable block ID (lexicographic)
- Guarantees reproducible bus values

### 4. Adapter System
**File**: `compiler/types-bus.ts`

```typescript
interface AdapterStep {
  type: 'cast' | 'transform';
  from: TypeDesc;
  to: TypeDesc;
  fn: (value: any, ctx: RuntimeCtx) => any;
}
```

**Purpose**: Type conversions at signal/field boundaries

### 5. Lens System
**File**: `lenses.ts`

**Lens Types**:
| Type | Purpose | Parameters |
|------|---------|------------|
| `ease` | Easing curves | easing function name |
| `slew` | Rate limiting (stateful) | rate |
| `quantize` | Discrete steps | steps |
| `scale` | Linear transform | factor, offset |
| `warp` | Phase warping | curve |
| `broadcast` | Scalar → Field | domain |
| `perElementOffset` | Phase stagger | amount, seed |

**Presets** (12):
- breathing, bounce, elastic, slow-start, slow-end
- smooth
- snap, fine-steps, on-off
- double, half, invert

### 6. UI Components

| Component | Purpose |
|-----------|---------|
| `BusBoard.tsx` | DAW-style mixer console |
| `BusChannel.tsx` | Individual bus strip |
| `BusInspector.tsx` | Detailed configuration |
| `BusCreationDialog.tsx` | New bus creation |
| `BusPicker.tsx` | Bus selection |
| `BusViz.tsx` | Real-time visualization |

---

## Tests

| Test File | Count | Coverage |
|-----------|-------|----------|
| `bus-compilation.test.ts` | 8 | Publisher/listener compilation |
| `field-bus-compilation.test.ts` | 8 | Field bus semantics |
| `bus-name-suggestion.test.ts` | 11 | Name generation |
| `DependencyGraph.test.ts` | 13 | Graph operations |

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `compileBusAware.ts` | 24,745 | Bus compilation pipeline |
| `DependencyGraph.ts` | 8,885 | Unified graph |
| `BusStore.ts` | 231 | Bus state management |
| `lenses.ts` | 100+ | Lens evaluators |

---

## Verification

The "Breathing Dots" demo patch (`demo-patches/breathing-dots.json`) proves end-to-end bus compilation:
- PhaseClock publishes to phaseA bus
- DotsRenderer listens with "breathing" lens (easeInOutSine)
- Result: Smooth grow/shrink animation

---

## No Further Work Required

Phase 1 is complete. The bus-aware compiler core is production-ready.
