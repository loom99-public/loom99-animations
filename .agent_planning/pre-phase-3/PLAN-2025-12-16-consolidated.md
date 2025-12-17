# Phase 2 Bus Compilation - Consolidated Plan
Generated: 2025-12-16
Supersedes: PLAN-2025-12-15-210500.md
Source Documents: STATUS-2025-12-15-pre-phase-3.md, ELEMENT-DOMAIN-CONTRACT.md, SORTKEY-CONTRACT.md, BUS-SEMANTICS-CONTRACT.md, FIELD-REPRESENTATION-CONTRACT.md, bus-pre-phase-3-deferred-work.md

## Executive Summary

Phase 1 (data model) is complete. Phase 2 (compiler integration) requires:
1. **Element Domain foundation** - prerequisite for Field buses
2. **Basic Signal bus compilation** - unblocks Phase 3 UI
3. **sortKey determinism** - explicit publisher ordering (see SORTKEY-CONTRACT.md)
4. **Type system cleanup** - ensures maintainability

**Critical Insight**: Signal buses and Field buses are fundamentally different. Signal buses operate on scalar values at a single point in time. Field buses operate across element populations with deterministic identity requirements. We must implement Signal buses first, then layer Field buses on top with proper Element Domain support.

## Scope Decisions (Ambiguities Resolved)

### D1: Signal vs Field Buses - Which First?
**Decision**: Signal buses first, Field buses deferred.

**Rationale**:
- Signal buses are simpler: single value, no element identity concerns
- Field buses require Element Domain infrastructure (not yet implemented)
- Phase 3 UI can proceed with Signal buses alone
- Field buses add significant complexity (per-element variation, domain compatibility)

### D2: Bus Scope - Global or Local?
**Decision**: Global per-patch only for Phase 2.

**Rationale**:
- Simpler implementation
- Matches current Patch structure
- Local/composite scopes deferred to Phase 4+
- No architectural blockers to adding scopes later

### D3: Default Values - Buses with No Publishers?
**Decision**: Buses with no publishers return `defaultValue` field from Bus definition.

**Rationale**:
- Already in Bus interface
- Clear semantics
- No runtime errors

### D4: Migration Approach
**Decision**: No auto-conversion. Wire-only patches remain wire-only.

**Rationale**:
- Lower risk
- User controls migration timing
- Phase 5 addresses migration tools

### D5: Backward Compatibility Duration
**Decision**: Indefinite for Phase 2-3. Evaluate deprecation in Phase 5.

**Rationale**:
- Focus on making buses work, not removing wires
- Technical debt is acceptable during transition

### D6: Element Domain Tag Format (from ELEMENT-DOMAIN-CONTRACT.md)
**Decision**: String format `"type:instanceId"` for Phase 2, numeric hash for WASM later.

**Rationale**:
- Readable for debugging
- String comparison is fast enough for now
- Migration path to numeric is straightforward

### D7: Cross-Domain Remap Blocks
**Decision**: Phase 2 rejects cross-domain Field operations with clear error message.

**Rationale**:
- Remap blocks add complexity
- Clear error message guides users
- Implement remaps in Phase 4+

### D8: Dynamic Element Count (Particles, etc.)
**Decision**: Domain snapshot per compile. Count changes require recompile.

**Rationale**:
- Simplest correct implementation
- Runtime count changes are rare
- No special-case handling needed

## Work Items by Priority

### P0 (Critical) - Must Complete for Phase 3

#### WI-1: Implement compileBusAwarePatch for Signal Buses
**Status**: Not Started
**Effort**: Large
**Dependencies**: None

##### Description
Create bus-aware compilation function supporting Signal buses only. Field buses explicitly deferred.

##### Implementation
```typescript
// compile.ts addition
function compileBusAwarePatch(
  patch: BusAwareCompilerPatch,
  registry: BlockRegistry,
  seed: Seed,
  ctx: CompileCtx
): CompilerResult {
  // 1. Validate: Only Signal buses, no Field buses yet
  for (const bus of patch.buses) {
    if (isFieldBus(bus)) {
      return error('Field buses not yet supported. Use Signal buses.');
    }
  }

  // 2. Build dependency graph (blocks + buses as nodes)
  // 3. Topological sort
  // 4. Multi-pass compilation with bus artifact collection
  // 5. Combine bus artifacts using combineMode
  // 6. Return compiled program
}
```

##### Acceptance Criteria
- [ ] Signal bus with 'last' combine mode compiles successfully
- [ ] Signal bus with 'sum' combine mode compiles successfully
- [ ] Multiple publishers to single bus works
- [ ] Single publisher to multiple listeners works
- [ ] Buses with no publishers return default value
- [ ] Field buses rejected with clear error message
- [ ] Compilation time <200ms for simple patches
- [ ] Generated program executes correctly

#### WI-2: Update compile.ts Routing
**Status**: Not Started
**Effort**: Small
**Dependencies**: WI-1

##### Description
Route patches with buses to new compiler function.

##### Acceptance Criteria
- [ ] Wire-only patches use existing compilePatch unchanged
- [ ] Patches with buses route to compileBusAwarePatch
- [ ] Version field checked
- [ ] No API breaking changes

#### WI-3: Basic Signal Bus Tests
**Status**: Not Started
**Effort**: Medium
**Dependencies**: WI-1

##### Acceptance Criteria
- [ ] Test: Single Signal bus, single publisher, single listener
- [ ] Test: Single Signal bus, multiple publishers, 'last' mode
- [ ] Test: Single Signal bus, multiple publishers, 'sum' mode
- [ ] Test: Signal bus with no publishers returns default
- [ ] Test: Cycle detection rejects illegal loops
- [ ] Test: Field bus rejected with clear error

### P1 (High) - Important for Quality

#### WI-4: Element Domain Interface Definition
**Status**: Not Started
**Effort**: Small
**Dependencies**: None (but required before Field buses)

##### Description
Implement ElementDomain interface in types-bus.ts per ELEMENT-DOMAIN-CONTRACT.md. This is preparatory work - not used by Signal buses but needed before Field buses.

##### Acceptance Criteria
- [ ] ElementDomain interface defined with: domainTag, count, getIds(), getOrder()
- [ ] DomainOwner interface defined
- [ ] ID vs Index separation documented in code comments
- [ ] No implementation yet - interface only

#### WI-5: Type System Cleanup
**Status**: Not Started
**Effort**: Small
**Dependencies**: WI-2

##### Acceptance Criteria
- [ ] CompilerPatch type properly extends
- [ ] Type guards for patch type detection
- [ ] All types exported for tests
- [ ] No TypeScript errors in compiler

### P2 (Medium) - Deferred Work Tracking

These items are explicitly deferred to later phases:

#### Phase 3+ Deferred (After UI Works)
| Item | Description | Phase | Prerequisites |
|------|-------------|-------|---------------|
| Additional Combine Modes | average, max, min, layer | 3+ | None |
| SCC Feedback Detection | Tarjan's algorithm for legal cycles | 3+ | memoryBoundary flag |
| Adapter Chain System | Type conversion between bus types | 4 | None |

#### Phase 4 Prerequisites: Field Bus Foundation
| Item | Description | Why Critical |
|------|-------------|--------------|
| **FieldExpr Graph System** | Expression AST per FIELD-REPRESENTATION-CONTRACT.md | Cannot combine Field publishers without it |
| **Dense Evaluator Compiler** | Compile FieldExpr → buffer-filling kernel | Performance-critical for Field buses |
| **Element Domain Implementation** | Per ELEMENT-DOMAIN-CONTRACT.md | Field buses require domain validation |

**Dependency Chain**: FieldExpr → Element Domain → Field Bus Compilation

Without lazy Fields, Field buses would allocate N arrays per publisher per frame. Unacceptable.

#### Phase 4+ Deferred (Architecture Extensions)
| Item | Description | Phase | Prerequisites |
|------|-------------|-------|---------------|
| **Field Bus Compilation** | Per-element buses with domain validation | 4 | FieldExpr, Element Domain |
| Cross-Domain Remap Blocks | Field domain remapping | 4+ | Field buses working |
| Local/Composite Bus Scope | Scoped bus contexts | 4+ | None |
| Dynamic Element Count | Runtime count changes | 5 | Element Domain |
| Multi-pass Optimization | Compilation performance | 4+ | Field buses working |

#### Phase 5+ Deferred (Future)
| Item | Description | Phase |
|------|-------------|-------|
| Lane Removal | Remove lane-based UI organization | 5 |
| Migration Tools | Wire-to-bus conversion helpers (optional) | 5 |
| Bus Hot-swapping | Runtime reconfiguration | 5+ |
| WASM Integration | Numeric domain tags, WASM eval | 5+ |

**Note**: Wires will NOT be deprecated. Wires and buses coexist indefinitely. Wires are de-emphasized in UI but remain fully functional internally for composite blocks, legacy patches, and advanced users.

## Dependency Graph

```
WI-1 (compileBusAwarePatch)
  │
  ├──→ WI-2 (compile.ts routing)
  │      │
  │      └──→ WI-5 (Type cleanup)
  │
  └──→ WI-3 (Signal bus tests)

WI-4 (Element Domain interface) ─── [no dependencies, prepare for P1 Field buses]
```

## Success Criteria for Phase 3 Readiness

Phase 3 UI work can begin when ALL of the following are true:

1. ✅ Signal bus compilation works ('last' and 'sum' modes)
2. ✅ Patches with Signal buses compile without errors
3. ✅ Generated programs execute correctly
4. ✅ Compilation time acceptable (<200ms)
5. ✅ Basic test coverage exists
6. ✅ Field buses are clearly rejected with guidance

**NOT required for Phase 3**:
- Field bus support
- Adapter chains
- All combine modes
- SCC feedback detection
- Element Domain implementation (interface only)

## Implementation Notes

### sortKey: Publisher Ordering (CRITICAL)

See `SORTKEY-CONTRACT.md` for full specification.

```typescript
// Publisher interface update required
interface Publisher {
  // ... existing fields
  sortKey: number;    // Explicit ordering, default assigned on create
  weight?: number;    // Optional amplitude multiplier
}

// Compiler must sort before combining
function sortPublishers(publishers: Publisher[]): Publisher[] {
  return [...publishers].sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.id.localeCompare(b.id);  // Stable tie-breaker
  });
}
```

**Non-negotiable**: sortKey is semantic, not implementation detail. It determines dominance.

### Bus Default Values (per BUS-SEMANTICS-CONTRACT.md)

"No influence" principle - defaults should be neutral, not aesthetic choices:

```typescript
const SIGNAL_DEFAULTS: Record<string, unknown> = {
  'number': 0,
  'vec2': { x: 0, y: 0 },
  'color': { r: 0, g: 0, b: 0, a: 0 },  // transparent, NOT opaque black
  'phase': 0,
  'time': 0,
  'trigger': { kind: 'never' },
  'boolean': false,
};
```

### Memory Blocks for Cycle Detection (deferred to Phase 3+)

Per BUS-SEMANTICS-CONTRACT.md, memory blocks have explicit `memoryBoundary: true` flag:
- Delay, Integrate, SampleHold, State, HistoryBuffer

This is NOT needed for Phase 2 Signal buses (no feedback loops yet).

### Signal Bus vs Field Bus Detection

```typescript
function isFieldBus(bus: Bus): boolean {
  // Field buses have SlotTypes that start with 'Field<'
  return bus.type.startsWith('Field<');
}

function isSignalBus(bus: Bus): boolean {
  // Signal buses are scalar: number, vec2, color, boolean, phase, trigger
  return !isFieldBus(bus);
}
```

### Combine Mode Implementation (Phase 2 scope)

```typescript
// Only these two for Phase 2
type Phase2CombineMode = 'last' | 'sum';

function combineSignalArtifacts(
  artifacts: CompiledArtifact[],
  mode: Phase2CombineMode
): CompiledArtifact {
  if (mode === 'last') {
    return artifacts[artifacts.length - 1];
  }
  if (mode === 'sum') {
    return createSumSignal(artifacts);
  }
  throw new Error(`Combine mode ${mode} not yet supported`);
}
```

## Risk Assessment

### High Risk
1. **Multi-pass complexity** - Bus compilation is more complex than wire DAG
   - Mitigation: Start with simplest Signal-only implementation
   - Contingency: Wire patches remain fully functional

### Medium Risk
1. **Performance** - Bus artifact tracking could be slower
   - Mitigation: Profile early, optimize if needed
   - Success criteria: <200ms

### Low Risk
1. **Type system** - Already well-defined in types-bus.ts
2. **Test coverage** - Clear test cases defined

## Open Questions (None Blocking)

All blocking questions have been resolved in the Scope Decisions section. Remaining open questions are deferred to later phases:

1. How should SCC feedback loops interact with Delay blocks? (Phase 3+)
2. What's the optimal FieldExpr representation for WASM? (Phase 5+)
3. How to visualize Field bus element counts in UI? (Phase 4+)
