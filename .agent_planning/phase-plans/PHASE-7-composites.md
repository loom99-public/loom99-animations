# Phase 7: Composites & Reuse

**Status**: PARTIAL (40% complete)
**Goal**: Enable scale without complexity.

---

## Summary

Phase 7 enables users to create reusable composite blocks. A composite encapsulates an internal graph that appears as a single block to users.

---

## What's Implemented (40%)

### Current Composites
**File**: `domain-composites.ts`

| Composite | Internal Structure | Status |
|-----------|-------------------|--------|
| GridPoints | DomainN + PositionMapGrid | ✅ Working |
| CirclePoints | DomainN + PositionMapCircle | ✅ Working |
| LinePoints | DomainN + PositionMapLine | ✅ Working |
| PerElementRandom | DomainN + FieldHash01ById | ✅ Working |
| PerElementPhaseOffset | Hash + MapNumber | ✅ Working |
| SizeScatter | Hash + MapRange | ✅ Working |
| OrbitMotion | FieldMapVec2(rotate) | ✅ Working |
| WaveDisplace | Position + Phase + Sin | ✅ Working |
| DotsRenderer | RenderInstances2D | ✅ Working |

### Composite Expansion
**File**: `compiler/integration.ts`

```typescript
function expandComposites(patch: Patch): Patch {
  // For each composite block:
  // 1. Look up composite definition
  // 2. Generate internal blocks with unique IDs
  // 3. Map composite ports to internal ports
  // 4. Replace composite with expanded blocks
}
```

**Current Flow**:
1. User adds composite block (e.g., "GridPoints")
2. Compiler calls `expandComposites()` during compilation
3. Internal blocks are created invisibly
4. User sees one block, compiler sees many

---

## What's Missing (60%)

### 1. Composite Authoring UI
**Priority**: HIGH
**Purpose**: Let users create their own composites

**UI Flow**:
```
┌─ Create Composite ─────────────────────┐
│                                        │
│ 1. Select blocks to include            │
│    [✓] PhaseClock-1                    │
│    [✓] FieldMapNumber-1                │
│    [ ] DotsRenderer-1                  │
│                                        │
│ 2. Name your composite                 │
│    [SlowPulse                    ]     │
│                                        │
│ 3. Expose ports                        │
│    External Name    Internal Port      │
│    [period     ] ← PhaseClock.period   │
│    [output     ] ← FieldMapNumber.out  │
│                                        │
│ [Create Composite]                     │
└────────────────────────────────────────┘
```

**Features**:
- Multi-select blocks in patch
- Auto-detect external connections (become composite ports)
- Name mapping (external → internal)
- Preview composite appearance

### 2. Internal Bus Exposure
**Priority**: MEDIUM
**Purpose**: Composites can publish/listen to buses

**Concept**:
```
┌─ MyRhythmComposite ─────────────────┐
│                                     │
│ ┌─────────┐    ┌─────────────────┐ │
│ │PhaseClock├───►│FieldMapNumber │ │
│ └────┬────┘    └────────────────┘ │
│      │                             │
│      ▼                             │
│   publishes to phaseA              │  ← Internal publishing
│                                     │
└─────────────────────────────────────┘
```

**Options**:
1. Composite publishes to parent patch buses (transparent)
2. Composite has internal buses (scoped)
3. Composite exposes bus connections as ports

### 3. Scoped Buses (Optional, Gated)
**Priority**: LOW
**Purpose**: Buses visible only inside composite

**Concept**:
```
┌─ WaveGenerator ─────────────────────┐
│                                     │
│ [internal:phase] ← scoped bus       │
│                                     │
│ Only visible inside this composite  │
│                                     │
└─────────────────────────────────────┘
```

**Use Case**: Complex composites with internal coordination.

**Gate**: Only for advanced users, hidden by default.

### 4. Composite Introspection
**Priority**: MEDIUM
**Purpose**: See inside composites for debugging

**UI**:
```
┌─ GridPoints (composite) ─────────────┐
│                                      │
│ [Expand to View]                     │
│                                      │
│ ┌─ Internal Structure ─────────────┐ │
│ │                                  │ │
│ │ DomainN ──► PositionMapGrid      │ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Collapse]                           │
└──────────────────────────────────────┘
```

**Features**:
- Expand composite to see internals (read-only)
- Internal blocks shown with different styling
- Connections traced through composite boundary
- Click internal block to see details

### 5. Migration-Safe Expansion
**Priority**: HIGH
**Purpose**: Composite updates don't break patches

**Principles**:
- Composite version tracking
- Expansion is deterministic (same output for same version)
- Old patches can use old composite versions
- Migration path when composite definition changes

**Implementation**:
```typescript
interface CompositeDefinition {
  id: CompositeId;
  version: number;
  name: string;
  internalBlocks: BlockDef[];
  portMappings: PortMapping[];
  migrations?: Migration[];
}
```

---

## Implementation Plan

### Task 7.1: Composite Authoring UI
**Complexity**: High

**Steps**:
1. Add multi-select mode to Editor
2. Create `CreateCompositeDialog.tsx`
3. Detect external connections automatically
4. Generate port mappings UI
5. Save composite to CompositeStore
6. Add to BlockLibrary
7. Comprehensive tests

### Task 7.2: Internal Bus Exposure
**Complexity**: Medium

**Steps**:
1. Add bus publishing to composite definitions
2. Modify expansion to include bus connections
3. Handle bus ID namespacing
4. Test bus behavior across composite boundary

### Task 7.3: Composite Introspection
**Complexity**: Medium

**Steps**:
1. Create `CompositeInspector.tsx`
2. Add expand/collapse to composite blocks
3. Render internal blocks with read-only styling
4. Trace connections through boundary
5. Test with various composites

### Task 7.4: Version & Migration System
**Complexity**: High

**Steps**:
1. Add version field to composite definitions
2. Store composite version in patch
3. Create migration framework
4. Define migration for each breaking change
5. Test upgrade paths

### Task 7.5: Scoped Buses (Optional)
**Complexity**: Medium

**Steps**:
1. Add scope field to bus definitions
2. Modify bus resolution for scoped buses
3. UI for creating scoped buses
4. Gate behind advanced setting
5. Documentation

---

## Acceptance Criteria

Phase 7 is complete when:

1. [ ] Users can create composites from selected blocks
2. [ ] Composites appear in BlockLibrary
3. [ ] Internal buses work correctly
4. [ ] Composites can be expanded for inspection
5. [ ] Version tracking prevents breaking changes
6. [ ] All tests pass
7. [ ] Documentation for composite authoring

---

## Design Decisions

### Expansion Timing
- **Current**: Expand during compilation (invisible to user)
- **Future**: Option to "inline" composite (make internal visible)

### Port Mapping
- External port names are user-defined
- Internal ports reference by blockId.portId
- Type must match exactly (no implicit conversion)

### Composite Storage
- CompositeStore holds user-defined composites
- Built-in composites in `domain-composites.ts`
- Persistence: Save to patch file or separate library

---

## Related Documents

- `11-starter-composites.md`: Built-in composite library
- `10-canonical-primitives.md`: Primitive blocks that compose
