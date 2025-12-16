# Definition of Done: Phase 2 Signal Bus Compilation
Generated: 2025-12-16
Plan: PLAN-2025-12-16-consolidated.md

## Sprint Goal
Implement basic Signal bus compilation so Phase 3 UI work can proceed. Field buses explicitly deferred.

## Acceptance Criteria by Work Item

### WI-1: Implement compileBusAwarePatch for Signal Buses (P0)

**Data Model Prerequisites**
- [ ] Add `sortKey: number` to Publisher interface in types.ts
- [ ] Add `weight?: number` to Publisher interface (optional amplitude)
- [ ] Update store.createPublisher to assign sortKey = max(bus sortKeys) + 10
- [ ] Ensure sortKey serialization round-trips unchanged

**Compilation Success**
- [ ] Signal bus with 'last' combine mode compiles without errors
- [ ] Signal bus with 'sum' combine mode compiles without errors
- [ ] Bus with single publisher + single listener compiles
- [ ] Bus with multiple publishers + single listener compiles
- [ ] Bus with single publisher + multiple listeners compiles
- [ ] Bus with no publishers returns defaultValue (no runtime error)
- [ ] Default values follow "no influence" principle (per BUS-SEMANTICS-CONTRACT.md):
  - number: 0, vec2: (0,0), color: transparent (rgba 0,0,0,0), phase: 0, trigger: never

**Error Handling**
- [ ] Field bus (type starts with 'Field<') rejected with clear error message
- [ ] Error message includes: "Field buses not yet supported. Use Signal buses."
- [ ] Circular dependency detected and rejected with clear error
- [ ] Error includes which blocks form the cycle

**Performance**
- [ ] Compilation time <200ms for patch with 5 buses, 10 blocks
- [ ] No memory leaks from artifact collection

**Runtime Correctness**
- [ ] Generated program executes without runtime errors
- [ ] 'last' mode returns value from publisher with highest sortKey
- [ ] 'sum' mode returns sum of all publisher values (in sortKey order for FP determinism)

**sortKey Determinism (per SORTKEY-CONTRACT.md)**
- [ ] Publishers sorted by (sortKey, id) before combining
- [ ] Tie-breaker uses id.localeCompare() for stability
- [ ] Canvas layout changes do not affect output
- [ ] Publisher array order in JSON does not affect output

### WI-2: Update compile.ts Routing (P0)

**Backward Compatibility**
- [ ] Wire-only patches (no buses array) compile unchanged
- [ ] Wire-only patches use existing compilePatch function
- [ ] No API changes to compilePatch signature

**Bus Routing**
- [ ] Patches with non-empty buses array route to compileBusAwarePatch
- [ ] Patch version field is checked (2.0-bus triggers new path)
- [ ] Returns same CompilerResult type as existing compiler

### WI-3: Basic Signal Bus Tests (P1)

**Happy Path Tests**
- [ ] Test: Single Signal<number> bus, one publisher, one listener
- [ ] Test: Single Signal<vec2> bus, one publisher, one listener
- [ ] Test: Single bus, 3 publishers, 'last' mode returns last by sortKey
- [ ] Test: Single bus, 3 publishers, 'sum' mode returns sum
- [ ] Test: Bus with no publishers returns defaultValue

**sortKey Tests**
- [ ] Test: Two publishers, mode=last, higher sortKey wins
- [ ] Test: Swap sortKeys, result swaps without other changes
- [ ] Test: Same sortKey, stable result via id tie-breaker
- [ ] Test: Reorder publishers array in JSON, output unchanged

**Error Case Tests**
- [ ] Test: Field<Point> bus rejected with expected error message
- [ ] Test: Circular dependency detected (A→B→A via buses)
- [ ] Test: Bus with unsupported combineMode (e.g., 'average') returns clear error

**Integration Tests**
- [ ] Test: Mixed patch with wires AND buses compiles
- [ ] Test: Compiled program runs for 60 frames without error

### WI-4: Element Domain Interface Definition (P1)

**Interface Completeness**
- [ ] ElementDomain interface defined with: domainTag, count, getIds(), getOrder()
- [ ] getStableKey optional method defined
- [ ] DomainOwner interface defined with: instanceId, domainType, getDomain(), getStableKey()
- [ ] ArcLengthDomain extension interface defined

**Documentation**
- [ ] ID vs Index separation documented in JSDoc comments
- [ ] Each interface method has JSDoc explaining purpose
- [ ] References to ELEMENT-DOMAIN-CONTRACT.md in comments

**Non-Implementation**
- [ ] No implementation code - interfaces only
- [ ] No changes to existing Field evaluation paths

### WI-5: Type System Cleanup (P1)

**Type Safety**
- [ ] No TypeScript errors in gallery/src/editor/compiler/*.ts
- [ ] Type guard `isBusAwarePatch(patch)` implemented and exported
- [ ] All new types exported from types-bus.ts

**Compatibility**
- [ ] Existing compiler tests pass unchanged
- [ ] No changes to CompilerPatch base type (only extension)

## NOT In Scope (Explicit Exclusions)

The following are explicitly OUT OF SCOPE for this sprint:

| Feature | Reason | Target Phase |
|---------|--------|--------------|
| Field bus compilation | Requires Element Domain impl | Phase 4 |
| 'average', 'max', 'min', 'layer' combine modes | Not needed for Phase 3 | Phase 3+ |
| Adapter chains | Complexity, not blocking | Phase 4 |
| SCC feedback loop validation | Delay blocks not yet implemented | Phase 3+ |
| FieldExpr lazy evaluation | Optimization, not correctness | Phase 4 |
| Cross-domain remaps | Field bus feature | Phase 4 |
| Local/composite bus scopes | Architecture extension | Phase 4+ |

## Definition of Done Checklist

All work items complete when:

- [ ] All acceptance criteria above checked off
- [ ] No TypeScript errors in compiler code
- [ ] All existing tests pass (`pnpm test`)
- [ ] New tests pass (`pnpm test bus-compilation`)
- [ ] Manual smoke test: Create patch with Signal bus in UI, compile, run
- [ ] Code reviewed for obvious issues
- [ ] No console.log/debug statements left in code

## Phase 3 Gate

Phase 3 UI work may BEGIN when:

1. ✅ WI-1 complete (Signal bus compilation works)
2. ✅ WI-2 complete (routing integrated)
3. ✅ WI-3 complete (tests prove correctness)
4. ✅ WI-4 complete (Element Domain interface ready for later)
5. ✅ WI-5 complete (types clean)

Phase 3 UI work may COMPLETE with just WI-1, WI-2, WI-3 done.
WI-4 and WI-5 are parallel preparatory work.
