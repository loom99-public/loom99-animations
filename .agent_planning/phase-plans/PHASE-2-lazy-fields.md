# Phase 2: Lazy Field Foundation

**Status**: COMPLETE
**Goal**: Get Field semantics right, permanently.

---

## Summary

Phase 2 implemented lazy, domain-aware field expressions. Fields are now FieldExpr DAGs that describe computation without executing it. Materialization happens only at sinks, using dense batch evaluation.

---

## Implemented Components

### 1. FieldExpr DAG
**File**: `compiler/unified/FieldExpr.ts` (10,615 lines)

```typescript
type FieldExprNode =
  | { type: 'const'; value: T }           // Uniform value
  | { type: 'domain'; domain: ElementDomain }  // Per-element identity
  | { type: 'source'; artifact: Artifact }    // Block output
  | { type: 'map'; input: FieldExpr; fn: FunctionId }  // Transform
  | { type: 'zip'; a: FieldExpr; b: FieldExpr; op: OpId }  // Combine
  | { type: 'bus'; busId: BusId }          // Combined publishers
  | { type: 'adapter'; input: FieldExpr; adapter: AdapterStep }
```

**Key Properties**:
- **Lazy**: Describes computation, doesn't execute
- **Composable**: Nodes combine into expression trees
- **Memoizable**: FunctionId strings enable caching

### 2. Domain Abstraction
**File**: `compiler/unified/Domain.ts` (3,706 lines)

```typescript
interface ElementDomain {
  domainTag: string;              // e.g., "svg-path:abc123"
  getIds(): Uint32Array;          // Stable element IDs
  getOrder(): Uint32Array;        // Iteration order
  getStableKey?(index: number): number | string;  // For seeding
}
```

**Implementations**:
- `DomainN`: N elements with sequential IDs
- `ArcLengthDomain`: SVG path sampling
- Domain owner registration for lifecycle

### 3. Sink-Driven Materialization

**Process**:
1. Renderer sinks (RenderInstances2D) request field values
2. FieldExpr DAG is traversed
3. Dense batch evaluation produces typed arrays
4. Cache by `(exprNodeId, domainId, frame)`

**No per-element closures**: All evaluation is batch-oriented.

### 4. Field Bus Semantics

**Combine Modes for Fields**:
| Mode | Behavior |
|------|----------|
| `sum` | Element-wise addition |
| `average` | Element-wise averaging |
| `max` | Element-wise maximum |
| `min` | Element-wise minimum |
| `last` | Last publisher wins |

**Domain Validation**: Hard error if publishers have different domains.

### 5. Domain-Centric Block Library
**Directory**: `compiler/blocks/domain/` (14 files)

**Domain Creation**:
- `DomainN.ts` - N-element domain

**Position Mapping**:
- `PositionMapGrid.ts` - Grid layout
- `PositionMapCircle.ts` - Circular layout
- `PositionMapLine.ts` - Linear layout
- `PositionMapRandom.ts` - Random distribution

**Field Creation**:
- `FieldConstNumber.ts` - Constant numeric field
- `FieldConstColor.ts` - Constant color field
- `FieldHash01ById.ts` - Per-element hash (0-1)
- `FieldMapNumber.ts` - Numeric field transform
- `FieldMapVec2.ts` - Vec2 field transform
- `FieldZipNumber.ts` - Field combination

**Time/Phase**:
- `PhaseClock.ts` - Phase signal generator
- `TriggerOnWrap.ts` - Phase boundary events

**Rendering**:
- `RenderInstances2D.ts` - Primary field sink

---

## Tests

| Test File | Count | Coverage |
|-----------|-------|----------|
| `FieldExpr.test.ts` | 24 | DAG operations |
| `Domain.test.ts` | 16 | Domain abstraction |
| `domain-pipeline.test.ts` | 16 | End-to-end |
| `RadialOrigin.test.ts` | 14 | Radial field generation |
| `FlowFieldOrigin.test.ts` | 15 | Flow field evaluation |

---

## Performance Characteristics

**What's O(1)**:
- FieldExpr node creation
- Domain lookup by tag
- Cache hit on memoized evaluation

**What's O(n) where n = element count**:
- Field materialization at sinks (unavoidable)
- Hash computation for seeding

**Avoided**:
- O(n²) pairwise operations
- Per-element closure creation
- Eager buffer allocation

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `FieldExpr.ts` | 10,615 | Expression DAG |
| `Domain.ts` | 3,706 | Domain abstraction |
| `blocks/domain/*.ts` | ~2,000 | Domain-centric blocks |

---

## Verification

The domain pipeline test suite verifies:
- FieldExpr construction and composition
- Lazy evaluation semantics
- Domain identity preservation
- Batch materialization
- Cache behavior

---

## No Further Work Required

Phase 2 is complete. The lazy field foundation is production-ready. Fields are now the correct abstraction: lazy, domain-aware, and efficiently evaluated at sinks.
