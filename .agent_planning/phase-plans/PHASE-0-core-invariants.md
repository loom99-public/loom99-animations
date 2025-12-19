# Phase 0: Lock Invariants

**Status**: COMPLETE
**Goal**: Make it impossible to accidentally violate the system's core truths.

---

## Summary

Phase 0 established the non-negotiable architectural rules that all subsequent phases build upon. These invariants are now enforced at compile-time.

---

## Implemented Invariants

### 1. TimeCtx Contract
**File**: `compiler/unified/TimeCtx.ts`

```typescript
interface TimeCtx {
  t: number;        // Absolute time (ms)
  dt: number;       // Delta since last frame
  frame: number;    // Monotonic counter
  mode: 'scrub' | 'performance';
}
```

**Enforcement**: Single time source for all temporal behavior. No hidden time access.

### 2. Signal vs Field Distinction
**File**: `types.ts`

- **Signal**: `(tMs: number, ctx: RuntimeCtx) => T` - time-continuous global value
- **Field**: `(seed, n, ctx) => readonly T[]` - per-element value over Domain (bulk form)

**Enforcement**: `ValueKind` enum prevents implicit conversions. `world: 'signal' | 'field'` in TypeDesc.

### 3. Bus Immutability Rules
**File**: `stores/BusStore.ts`

- Buses are read-only after creation
- Publishers/listeners reference buses by ID
- Combine mode locked at bus creation

**Enforcement**: MobX actions control all mutations. No direct bus modification.

### 4. Explicit State-Only Memory
**File**: `compiler/unified/StateBlock.ts`

- Only declared StateBlocks can hold state
- Explicit list: Delay, History, Integrate
- All state evolution tied to dt explicitly

**Enforcement**: StateBlock registry is allowlist. Compiler rejects implicit state.

### 5. Element Domain Rules
**File**: `types-bus.ts`

```typescript
interface ElementDomain {
  domainTag: string;
  getIds(): Uint32Array;
  getOrder(): Uint32Array;
  getStableKey?(index: number): number | string;
}
```

**Enforcement**: Stable element IDs (not indices). Domain mismatches are compile errors.

---

## Compile-Time Assertions

| Assertion | Error Code | Description |
|-----------|------------|-------------|
| Type mismatch | `PortTypeMismatch` | World or domain incompatibility |
| Illegal cycle | `CycleDetected` | SCC without memory block |
| Domain mismatch | `DomainMismatch` | Field operations on different domains |
| Multiple writers | `MultipleWriters` | Bus conflict without combine mode |

---

## Removed/Forbidden Patterns

1. **Implicit wiring shortcuts** - All connections explicit
2. **Hidden time access** - No `Date.now()` or `performance.now()`
3. **Per-element eager APIs** - No scalar field form `(seed, i, n, ctx) => T`
4. **Closures in hot paths** - No per-element functions

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `types.ts` | 925 | Core type system |
| `types-bus.ts` | 317 | Bus-aware extensions |
| `compile.ts` | 14,338 | Validation pipeline |
| `TimeCtx.ts` | ~100 | Time context contract |
| `StateBlock.ts` | ~150 | State block registry |

---

## Verification

All 386 tests pass, including:
- Type validation tests
- Cycle detection tests
- Domain mismatch tests
- Bus conflict tests

---

## No Further Work Required

Phase 0 is complete. The invariants are locked and enforced. All subsequent phases build on these foundations.
