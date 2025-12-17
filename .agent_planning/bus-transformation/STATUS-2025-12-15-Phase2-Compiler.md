# Status Report: Bus Transformation Phase 2 - Compiler Architecture
Timestamp: 2025-12-15-140000
Scope: bus-transformation/phase2-compiler
Confidence: FRESH
Git Commit: bb402f7

## Executive Summary
Phase 1 is **COMPLETE** - all bus data model, store management, and routing interfaces are implemented. Phase 2 requires significant compiler architecture changes to support buses as first-class nodes in the compilation graph.

Current compiler is wire-only DAG traversal. Phase 2 needs:
- Bus-aware dependency graph construction
- SCC detection for feedback loops
- Lazy Field evaluation (FieldExpr)
- Adapter chain system
- Multi-pass compilation with bus artifacts

## Phase 1 Completion Status ✅

### What Exists from Phase 1
- **Type System**: TypeDesc with core/internal split implemented
- **Bus Interface**: Bus, Publisher, Listener interfaces with sortKey support
- **Store Integration**: buses[], publishers[], listeners[] arrays in EditorStore
- **Patch Integration**: Schema versioning to v2, buses/publishers/listeners fields
- **CRUD Operations**: createBus, addPublisher, addListener actions
- **Type Compatibility**: isDirectlyCompatible, getConvertiblePaths functions

### Missing from Phase 1
- **Bus-Aware Compilation**: Compiler still only processes wire connections
- **Bus Artifact Tracking**: No bus compilation or combination logic
- **Feedback Loop Detection**: No cycle detection with memory blocks

## Current Compiler Architecture Analysis

### Existing Structure (`gallery/src/editor/compiler/`)

```typescript
// Current compiler only handles:
interface CompilerPatch {
  blocks: Map<BlockId, BlockInstance>;
  connections: readonly CompilerConnection[];  // ONLY wires
  output?: PortRef;
}

// Current artifacts
type Artifact = Scalar | Field | Signal | Program | Spec | Error;

// Current compilation process:
1. Validate block types
2. Build connection indices (detect multiple writers)
3. Type-check connections
4. Topological sort blocks
5. Compile blocks in order → produce Artifacts
6. Return final RenderTreeProgram
```

### What's Missing for Bus Support

#### 1. Bus-Aware Patch Data Model
```typescript
// NEEDED: CompilerPatch with bus support
interface BusAwareCompilerPatch extends CompilerPatch {
  buses: readonly Bus[];
  publishers: readonly Publisher[];
  listeners: readonly Listener[];
}

// NEEDED: Bus-aware dependency graph
type GraphNode =
  | { type: 'BlockOut'; blockId: string; port: string }
  | { type: 'BusValue'; busId: string };

type GraphEdge =
  | { type: 'Wire'; from: GraphNode; to: GraphNode }
  | { type: 'Publisher'; from: GraphNode; to: BusValue }
  | { type: 'Listener'; from: BusValue; to: GraphNode };
```

#### 2. SCC Detection for Feedback Loops
```typescript
// NEEDED: Tarjan's algorithm implementation
function detectStronglyConnectedComponents(nodes: GraphNode[]): GraphNode[][] {
  // Detect cycles in the dependency graph
}

// NEEDED: Cycle validation
function validateCycles(sccs: GraphNode[][]): void {
  // Allow cycles only if they cross memory boundary blocks
  // Memory blocks: DelayLine, Integrate, SampleHold
}
```

#### 3. Lazy Field Evaluation (FieldExpr)
```typescript
// NEEDED: Replace bulk Field<T> with FieldExpr<T>
type FieldExpr<T> =
  | { kind: 'const'; value: T }
  | { kind: 'map'; src: FieldExpr<any>; fnId: string }
  | { kind: 'zip'; a: FieldExpr<any>; b: FieldExpr<any>; fnId: string }
  | { kind: 'source'; blockId: string; port: string }
  | { kind: 'bus'; busId: string; publishers: FieldExpr<any>[] };

// BENEFITS:
// - Bus combine produces cheap FieldExpr wrappers
// - Materialization only at final consumer
// - Enables fusion and optimization
```

#### 4. Adapter Chain System
```typescript
// NEEDED: Adapter types and registry
interface Adapter {
  id: string;
  from: TypeDesc;
  to: TypeDesc;
  compile: (artifact: Artifact, params: Record<string, unknown>) => Artifact;
}

// NEEDED: Adapter chain application
function applyAdapterChain(
  artifact: Artifact,
  chain: AdapterStep[],
  registry: AdapterRegistry
): Artifact;
```

#### 5. Bus Compilation Process
```typescript
// NEEDED: Compile buses when visited, not at end
function compileBus(
  bus: Bus,
  publishers: Publisher[],
  blockArtifacts: Map<string, Artifact>,
  adapterRegistry: AdapterRegistry
): Artifact {
  // 1. Sort publishers by sortKey
  // 2. Apply adapter chains
  // 3. Combine using bus.combineMode
  // 4. Return FieldExpr or Program artifact
}
```

## Phase 2 Implementation Plan

### Step 1: Extend Compiler Data Types
1. **Update CompilerPatch** to include buses, publishers, listeners
2. **Add GraphNode/GraphEdge** types for dependency graph
3. **Update Artifact types** to include FieldExpr variants
4. **Add BusCompileResult** for bus compilation tracking

### Step 2: Bus-Aware Graph Construction
1. **Build dependency graph** including BlockOut and BusValue nodes
2. **Add publisher/listener edges** alongside wire edges
3. **Create bidirectional mapping** for easy lookup
4. **Validate graph structure** (orphaned buses, etc.)

### Step 3: SCC Detection and Validation
1. **Implement Tarjan's algorithm** for cycle detection
2. **Add memory block detection** (DelayLine, Integrate, SampleHold)
3. **Validate legal feedback loops** (must cross memory boundary)
4. **Provide clear error messages** for illegal cycles

### Step 4: Multi-Pass Compilation
1. **Topological sort** including BusValue nodes
2. **Compile blocks** as before, storing in blockArtifacts
3. **Compile buses** when visited, producing FieldExpr/Program
4. **Apply adapter chains** during publisher compilation
5. **Use bus artifacts** for listener input resolution

### Step 5: FieldExpr Implementation
1. **Define FieldExpr AST** with visitor pattern
2. **Implement FieldExpr evaluators** for materialization
3. **Add FieldExpr combinators** (map, zip, filter)
4. **Update block compilers** to produce FieldExpr
5. **Add optimization passes** (fusion, dead code elim)

### Step 6: Adapter Chain System
1. **Define adapter interface** and registry
2. **Implement core adapters** (cast, lift, transform)
3. **Add adapter chain validation** (max 2 adapters)
4. **Mark heavy adapters** (Reduce requires warning)

### Step 7: Integration and Testing
1. **Update editorToPatch** conversion for buses
2. **Add bus compilation tests**
3. **Test feedback loop detection**
4. **Performance test FieldExpr evaluation**
5. **Backward compatibility tests**

## Key Challenges and Risks

### High Complexity Areas
1. **SCC Detection**: Implementing Tarjan correctly and handling edge cases
2. **FieldExpr Performance**: Need efficient evaluation, not just correctness
3. **Adapter Validation**: Preventing adapter chain explosions
4. **Deterministic Ordering**: Ensuring stable bus combine order

### Technical Risks
1. **Performance Impact**: FieldExpr overhead vs current bulk Fields
2. **Memory Usage**: FieldExpr AST might be memory intensive
3. **Debug Complexity**: FieldExpr call stacks harder to debug
4. **Migration Path**: Supporting both wire-only and bus-aware patches

### Mitigation Strategies
1. **Incremental Implementation**: Add buses step by step, keep wires working
2. **Fallback Paths**: Keep bulk Field evaluation as option
3. **Extensive Testing**: Comprehensive test suite for all edge cases
4. **Performance Profiling**: Monitor compilation and evaluation times

## Dependencies

### Internal Dependencies
- **Phase 1 Store**: Bus/Publisher/Listener management ✅ COMPLETE
- **TypeDesc System**: Core/internal type split ✅ COMPLETE
- **Block Registry**: Existing block compilers need updates ⚠️ PARTIAL
- **V4 Integration**: FieldExpr must integrate with Signal/Field ❌ TODO

### External Dependencies
- **Graph Algorithms**: Need robust SCC and topological sort implementation
- **Adapter Registry**: Need comprehensive adapter library
- **Testing Framework**: Need tests for compilation correctness and performance

## Success Metrics

### Functional Requirements
- [ ] Compile patches with buses and wires mixed
- [ ] Detect and validate feedback loops correctly
- [ ] Support all 6 bus combine modes
- [ ] Apply adapter chains automatically
- [ ] Maintain backward compatibility with wire-only patches

### Performance Requirements
- [ ] Compilation time < 100ms for typical patches (50 blocks)
- [ ] FieldExpr evaluation overhead < 20% vs bulk Fields
- [ ] Memory usage < 2x current implementation
- [ ] Stable performance across patch sizes

### Quality Requirements
- [ ] >95% test coverage for new compiler logic
- [ ] Clear error messages for compilation failures
- [ ] Deterministic compilation results
- [ ] No regressions in existing functionality

## Next Steps

1. **Start with data type extensions** - update CompilerPatch, add GraphNode types
2. **Implement dependency graph construction** - simple adjacency list
3. **Add SCC detection** - borrow from existing graph libraries
4. **Prototype FieldExpr** - start with const and map operations
5. **Update one block compiler** - prove the concept works
6. **Iterate and expand** - add more features incrementally

The compiler work is substantial but well-defined. The pseudocode in the planning document provides a clear implementation blueprint. The main challenge is the complexity of multi-pass compilation with bus artifacts, but this can be tackled incrementally.