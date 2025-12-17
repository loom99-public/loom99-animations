# Phase 1 Bus Transformation Sprint Plan (FINAL)
Generated: 2025-12-15-FINAL
Source STATUS: STATUS-2025-12-15-120000.md
Incorporating all architectural guidance and corrections

## Executive Summary
Phase 1 establishes the foundational data model and store management for the bus-centric architecture. This sprint focuses on implementing a clean type system that separates user-facing core types from internal resource types, an explicit routing layer, and basic bus management functionality.

**Critical Architectural Decisions**:
1. **No bus properties on Slot** - routing is explicit Publisher/Listener records
2. **Core vs Internal Type Split** - buses expose only learnable creative vocabulary
3. **Lazy Field Evaluation** - Fields will be functional, not bulk arrays (Phase 2)
4. **World = signal/field only** - scalar is semantics, special is category
5. **Deterministic ordering** - sortKey for stable "last" combine mode
6. **Hybrid creation UX** - no auto-creation, but gesture-guided creation
7. **Buses as first-class graph nodes** - compile when visited, not at end

Total work items: 7 (P0: 5, P1: 2)

## Backlog by Priority

### P0 (Critical) - Core Data Model

#### 1. Bus Interface and Clean Type System
**Status**: Not Started
**Effort**: Medium (5-7 days)
**Dependencies**: None
**Spec Reference**: Core/internal type split guidance

**Description**:
Implement a clean type system that separates user-facing core types from internal resource types. This prevents buses from becoming a dumping ground for engine plumbing.

**Acceptance Criteria**:
- [ ] TypeDesc interface with:
  - world: "signal" | "field" (only these two)
  - domain: core types (number, vec2, color, boolean, time, phase, rate, trigger)
  - category: "core" | "internal" (internal includes: program, renderTree, scene*, wobble, etc.)
  - busEligible: boolean (derived from category === "core")
  - semantics?: string (for scalar, unit(0..1), sample, etc.)
  - unit?: string (e.g., "seconds", "beats")
- [ ] Bus interface with id, name, type: TypeDesc, combineMode, defaultValue
- [ ] BusCombineMode: 'sum' | 'average' | 'max' | 'min' | 'last' | 'layer'
- [ ] defaultValue typed by core domain, JSON-serializable, time in SECONDS
- [ ] sortKey property for deterministic combine ordering
- [ ] Three compatibility functions:
  - isDirectlyCompatible(a, b): boolean
  - getConvertiblePaths(a, b): AdapterPath[]
  - isBusEligible(typeDesc): boolean
- [ ] SlotType → TypeDesc mapping with proper categorization
- [ ] Core domain defaults (no null/undefined for core types)

**Technical Notes**:
- Core domains are what users see everywhere in the bus system
- Internal domains can still be wired directly, just not exposed on buses
- Time values always in seconds for consistency
- Scalar<number becomes {world: "signal", domain: "number", semantics: "scalar"}
- Events become {world: "signal", domain: "trigger"} for bus simplicity

#### 2. Routing Layer: Publisher/Listener
**Status**: Not Started
**Effort**: Medium (3-4 days)
**Dependencies**: Bus interface with TypeDesc
**Spec Reference**: Explicit routing layer guidance

**Description**:
Implement explicit Publisher and Listener interfaces for clean bus routing. This separates routing from port metadata and enables multiple publishers per output.

**Acceptance Criteria**:
- [ ] BindingEndpoint: { blockId: string; port: string }
- [ ] AdapterStep: { adapterId: string; params: Record<string, unknown> }
- [ ] Publisher: {
  - id: string (UUID)
  - busId: string
  - from: BindingEndpoint
  - adapterChain?: AdapterStep[]
  - enabled: boolean
  - weight?: number
  - sortKey: number // For deterministic "last"/"layer"
}
- [ ] Listener: {
  - id: string (UUID)
  - busId: string
  - to: BindingEndpoint
  - adapterChain?: AdapterStep[]
  - enabled: boolean
}
- [ ] NO bus properties on Slot interface
- [ ] Multiple publishers per output port supported
- [ ] Publisher sortKey ensures deterministic combine order

**Technical Notes**:
- Multiple publishers from same output is a key feature
- Adapter chains are first-class, inspectable objects
- UUIDs provide stable references across save/load
- sortKey critical for "last" and "layer" combine modes

#### 3. Patch Structure with Schema Versioning
**Status**: Not Started
**Effort**: Small (1-2 days)
**Dependencies**: Bus interface, Publisher/Listener types
**Spec Reference**: Schema versioning guidance

**Description**:
Update Patch interface to include buses and routing with proper numeric schema versioning for migration.

**Acceptance Criteria**:
- [ ] Patch interface includes:
  - buses: Bus[]
  - publishers: Publisher[]
  - listeners: Listener[]
- [ ] schemaVersion: number (increment from 1 to 2)
- [ ] Optional features: { buses: true } for compatibility detection
- [ ] toJSON() includes all three arrays
- [ ] loadPatch() handles both v1 and v2 patches
- [ ] Migration converts v1 to v2 with empty arrays
- [ ] Keep connections[] for backward compatibility

**Technical Notes**:
- Numeric version easier to compare than strings
- Empty arrays provide consistent structure for v2
- Features object enables feature detection without parsing version

### P0 (Critical) - Store Management

#### 4. EditorStore with Bus/Routing State
**Status**: Not Started
**Effort**: Medium (4-6 days)
**Dependencies**: Patch structure updated
**Spec Reference**: Store management with explicit routing

**Description**:
Add comprehensive bus and routing state management to EditorStore with proper MobX observables and actions.

**Acceptance Criteria**:
- [ ] @observable arrays:
  - buses: Bus[] = []
  - publishers: Publisher[] = []
  - listeners: Listener[] = []
- [ ] All arrays in makeObservable() actions
- [ ] Serialization in toJSON()
- [ ] Deserialization in loadPatch()
- [ ] clearPatch() clears all arrays
- [ ] Computed properties:
  - getBusById(id)
  - getPublishersByBus(busId)
  - getListenersByBus(busId)
  - getBusesByCategory(category)
  - getBusEligibleBuses()

**Technical Notes**:
- Follow existing MobX patterns from blocks/connections
- Separate arrays enable efficient lookups
- Category filtering supports core/internal split

#### 5. Bus CRUD and Routing Operations
**Status**: Not Started
**Effort**: Medium (4-6 days)
**Dependencies**: EditorStore state
**Spec Reference**: Explicit routing with coexistence

**Description**:
Implement core bus management and routing operations with type validation and wire coexistence.

**Acceptance Criteria**:
- [ ] Bus CRUD:
  - createBus(typeDesc, name?): string
  - deleteBus(busId): void (cleans routing)
  - updateBus(busId, updates): void
- [ ] Routing CRUD:
  - addPublisher(busId, blockId, port, adapterChain?): string
  - removePublisher(publisherId): void
  - addListener(busId, blockId, port, adapterChain?): string
  - removeListener(listenerId): void
- [ ] Type validation:
  - validateBusType(typeDesc): boolean
  - validateRoutingCompatibility(typeDesc, targetTypeDesc): AdapterPath[]
- [ ] Wire coexistence:
  - Don't auto-delete existing wires
  - Support both wire and bus connections during transition
- [ ] UUID-based ID generation following existing patterns

**Technical Notes**:
- All methods return IDs for immediate reference
- deleteBus must cleanup all routing references
- Type validation uses core/internal split
- Wire coexistence reduces migration friction

### P1 (High) - Inspection and Utilities

#### 6. Bus Inspection and Discovery
**Status**: Not Started
**Effort**: Medium (3-4 days)
**Dependencies**: Bus CRUD operations
**Spec Reference**: First-class inspector support

**Description**:
Add utilities for inspecting bus topology and routing relationships. Essential for Bus Inspector UI.

**Acceptance Criteria**:
- [ ] Discovery methods:
  - getBusPublishers(busId): Publisher[]
  - getBusListeners(busId): Listener[]
  - getPortRouting(blockId, port): {publishesAs, listensTo}
  - findBusesByTypeDesc(typeDesc): Bus[]
  - isBusBound(busId): boolean
- [ ] Ordering utilities:
  - getNextSortKey(busId): number
  - reorderPublisher(publisherId, newSortKey): void
- [ ] Type utilities:
  - isDirectlyCompatible(a, b): boolean
  - getConvertiblePaths(a, b): AdapterPath[]
  - isBusEligible(typeDesc): boolean
- [ ] Computed properties for reactive updates

**Technical Notes**:
- Supports multiple publishers per port
- getNextSortKey ensures deterministic ordering
- Converter paths enable smart UI suggestions
- Essential for Bus Inspector in Phase 3

#### 7. Type System and Migration Utilities
**Status**: Not Started
**Effort**: Small (2-3 days)
**Dependencies**: TypeDesc interface
**Spec Reference**: Type mapping with core/internal split

**Description**:
Implement utilities for type system migration, validation, and compatibility checking.

**Acceptance Criteria**:
- [ ] SlotType → TypeDesc mapping with proper categorization
- [ ] TypeDesc constants for common core types
- [ ] Default values by core domain (JSON-serializable)
- [ ] Type validation helpers:
  - validateDefaultValue(typeDesc, value): boolean
  - normalizeTimeUnit(value, fromUnit, toUnit): number
- [ ] Adapter registry structure (empty but ready)
- [ ] Migration helpers for SlotType → TypeDesc

**Technical Notes**:
- Most "special" SlotTypes map to category: internal
- Core types get user-friendly defaults
- Time normalization ensures seconds everywhere
- Adapter registry prepares for Phase 2

## Dependency Graph

```
1. TypeDesc System ──► 2. Routing Layer ──► 3. Patch Updates
                            │                       │
                            └─────► 4. Store State ◄─────┘
                                           │
                                           ▼
                            5. CRUD/Routing Operations ◄─────┐
                                           │                     │
                                           ▼                     │
                            6. Inspection/Discovery ◄────────┘
                                           │
                                           ▼
                            7. Type/Migration Utilities
```

## Implementation Order

1. **Day 1-3**: TypeDesc system with core/internal split
2. **Day 4-6**: Publisher/Listener routing layer
3. **Day 7-8**: Patch updates with schema versioning
4. **Day 9-12**: EditorStore bus/routing state
5. **Day 13-16**: CRUD and routing operations
6. **Day 17-19**: Inspection and discovery utilities
7. **Day 20-21**: Type system and migration utilities
8. **Day 22**: Buffer for testing and documentation

## Critical Design Decisions (Locked In)

1. **Core/Internal Type Split**: Buses expose only learnable vocabulary
2. **World = signal/field only**: Scalar is semantics, special is category
3. **Explicit Routing Layer**: No bus properties on Slot
4. **Deterministic Ordering**: sortKey for stable combine modes
5. **Hybrid Creation UX**: No silent auto-creation
6. **Lazy Field Future**: Fields will be functional, not bulk (Phase 2)
7. **Buses as First-Class Nodes**: Compile when visited, not at end

## Hybrid Bus Creation UX Contract

**No Silent Auto-Creation**:
- No background bus creation without user action
- User intent must be explicit

**Create-from-Gesture Support**:
- Output drag → "Publish to existing..." or "Create bus from output..."
- Input click → "Bind to existing..." or "Create new bus..."
- Prefill name/type from gesture context

**Data Model Implications**:
- Store creation intent in Publisher/Listener
- Support both explicit and gesture-based paths
- Filtered selection by TypeDesc compatibility

## Lazy Field Evaluation Decision (Phase 2 Preparation)

**Current State**: Field<T> = (seed, n, ctx) => readonly T[] (bulk materialization)
**Future Goal**: FieldExpr<T> = functional, composable expressions

**Phase 2 Implementation**:
```typescript
type FieldExpr<T> =
  | { kind: "const"; value: T }
  | { kind: "map"; src: FieldExpr<any>; fnId: string }
  | { kind: "zip"; a: FieldExpr<any>; b: FieldExpr<any>; fnId: string }
  | { kind: "source"; blockId: string; port: string }
  // ... other combinators
```

**Benefits**:
- Bus combine produces cheap FieldExpr wrappers
- Materialization only at final consumer
- Enables fusion and optimization
- Scales to thousands of elements

## Preparation for Phase 2 (Compiler Architecture)

**Bus-Centric Graph Construction**:
- Nodes: BlockOut(blockId, port), BusValue(busId)
- Edges: Publishers and listeners become graph edges
- SCC detection for legal feedback loops
- Topological sort includes buses as regular nodes

**Bus Compilation**:
- Compile buses when visited in topo order
- Sort publishers by sortKey before combining
- Produce single FieldExpr/Program artifact immediately
- No "end-of-pass" bus combining

**Adapter Chains**:
- Cast adapters: same world, domain change
- Lift adapters: world change (broadcast/reduce)
- Auto-insert ≤2 adapters, mark Reduce as heavy

## Success Metrics

- All existing tests pass (backward compatibility)
- New functionality >90% test coverage
- Patch save/load works for both v1/v2 formats
- Type checking prevents invalid bus bindings
- Store reactivity works for all state
- Core type filtering verified in bus picker
- Publisher sortKey ordering stable

## Out of Scope (Phase 1)

- UI components (BusBoard, bus pickers, binding chips)
- Compiler graph construction and SCC detection
- FieldExpr implementation (Phase 2)
- Wire-to-bus migration UI
- Time management blocks (Delay, Cycle)
- Auto-creation workflows

## Appendix: Core Type Mappings

### Core Domains (Bus-Eligible)
```typescript
'Field<Point>' → {world: "field", domain: "vec2", semantics: "point"}
'Field<number>' → {world: "field", domain: "number"}
'Signal<number>' → {world: "signal", domain: "number", semantics: "scalar"}
'Signal<Unit>' → {world: "signal", domain: "number", semantics: "unit(0..1)"}
'Signal<Time>' → {world: "signal", domain: "time"}
'Event<string>' → {world: "signal", domain: "trigger"} // Simplified for buses
```

### Internal Domains (Not Bus-Eligible by Default)
```typescript
'Program' → {world: "signal", domain: "program", category: "internal"}
'RenderTree' → {world: "field", domain: "renderTree", category: "internal"}
'Scene*' → {world: "field", domain: "scene", category: "internal"}
'Field<Wobble|Jitter|Wave>' → {world: "field", domain: "number", category: "internal", semantics: "modulator"}
```

### Default Values (Core Only)
```typescript
number: 0
vec2: {x: 0, y: 0}
color: "#000000"
boolean: false
time: 0.0 // seconds!
phase: 0.0
rate: 1.0
trigger: false // pulse state
```