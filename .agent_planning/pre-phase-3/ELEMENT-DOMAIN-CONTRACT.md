# Element Domain Contract
Generated: 2025-12-16
Status: PROPOSED - Requires approval before implementation

## Executive Summary

Element identity and evaluation order is the make-or-break risk for lazy Fields, buses, and future WASM. This document defines the **Element Domain** contract that all Field evaluation and bus combination must operate against.

**Non-negotiable rule**: A `Field<T>` is not meaningful on its own — it is meaningful only with a specific Element Domain.

## 1. Core Concept: Element Domain

An **Element Domain** is the authoritative set of elements a Field refers to.

It provides three things:
1. **Count**: how many elements exist right now
2. **Stable IDs**: an `id` per element that is deterministic and stable under defined operations
3. **Deterministic iteration order**: the exact order in which dense fields are evaluated

```typescript
interface ElementDomain {
  /** Domain identifier for type checking */
  readonly domainTag: string;

  /** Number of elements in this domain */
  readonly count: number;

  /** Stable IDs for all elements (WASM-friendly) */
  getIds(): Uint32Array;

  /** Deterministic iteration order (usually same as ids array order) */
  getOrder(): Uint32Array;

  /** Optional: get stable key for an element (used in id generation) */
  getStableKey?(elementIndex: number): number | string;
}
```

## 2. ID vs Index Separation

**Critical distinction**:
- `index` = 0..N-1 evaluation slot in the current frame (where you write output)
- `id` = stable identity used for deterministic per-element variation and state addressing

**They are not the same.**

### Enforcement Rules

| Operation | Uses `id` | Uses `index` |
|-----------|-----------|--------------|
| Randomness/variation seed | ✅ | ❌ |
| State lookup (delays, integrators) | ✅ | ❌ |
| Per-element configuration | ✅ | ❌ |
| Output buffer position | ❌ | ✅ |
| Iteration/loop variable | ❌ | ✅ |

### API Implication

```typescript
// WRONG: n-only evaluation
Field.evalInto(n: number): T[]

// CORRECT: domain-aware evaluation
Field.evalInto(domain: ElementDomain): T[]
```

## 3. Domain Owner Contract

Every element population has a **single, declared owner** that determines ids and order.

### Domain Owner Types

| Owner Type | Example | Stable Key Strategy |
|------------|---------|---------------------|
| SVG Source | Path sampling | Arc-length bucket index |
| Text Source | Glyph points | Glyph index + point sample index |
| Particle Emitter | Particle system | Spawn sequence number + emitter id |
| Archetype Instance | Line-morph, etc. | Instance-specific strategy |

### Domain Owner Interface

```typescript
interface DomainOwner {
  /** Unique instance identifier (stable across frames) */
  readonly instanceId: string;

  /** Domain type for compatibility checking */
  readonly domainType: 'svg-path' | 'text-glyphs' | 'particles' | 'custom';

  /** Get element domain for current context */
  getDomain(ctx: CompileCtx): ElementDomain;

  /** Get stable key for element (required for id generation) */
  getStableKey(elementIndex: number): number;
}
```

## 4. ID Generation Scheme

### Recommended Pattern

```typescript
id = hash32(ownerInstanceId, elementStableKey)
```

Where:
- `ownerInstanceId` = stable per source/archetype instance (UUID hashed to 32-bit)
- `elementStableKey` = depends on domain type

### Stable Key Strategies by Domain Type

| Domain Type | Stable Key Strategy | Notes |
|-------------|---------------------|-------|
| SVG sampled points | Arc-length bucket index | NOT raw vertex index |
| Particles | Spawn sequence number + emitter id | Deterministic spawn order |
| Text glyph points | Glyph index + point sample index | Composite key |
| Custom | Domain-specific | Must be documented |

### What to Avoid

- ❌ Using current array index as stable key
- ❌ Using floating coordinates directly (precision issues)
- ❌ Using non-deterministic values (timestamps, random)

## 5. Resampling and Identity

When geometry resamples (e.g., path from 200 to 400 points), IDs must remain deterministic.

### Arc-Length Bucket Scheme

```typescript
interface ArcLengthDomain extends ElementDomain {
  /** Canonical parameterization: normalized arc-length s ∈ [0,1) */
  readonly resolution: number;

  /** Points defined as k/N buckets */
  getBucketIndex(elementIndex: number): number;
}
```

### Identity Preservation Rules

| Operation | Identity Preserved? | Notes |
|-----------|---------------------|-------|
| Resolution change (same topology) | ✅ with bucket scheme | Use arc-length buckets |
| Topology change | ❌ Hard remap | Document as identity break |
| Per-element mapping | ✅ | colorize, offset, rotate |
| Filtering (keep order) | ✅ | IDs persist for survivors |

## 6. Bus + Field Domain Compatibility

### Rule: Same Domain or Explicit Remap

If a Field bus combines publishers, they **must** share the same element domain or explicitly declare a remapping.

```typescript
interface FieldBus<T> {
  /** Domain tag this bus operates on */
  readonly domainTag: string;

  /** Combine mode */
  readonly combineMode: BusCombineMode;

  /** All publishers must match this domain */
  validatePublisher(publisher: FieldPublisher<T>): boolean;
}
```

### Validation Rules

| Scenario | Result |
|----------|--------|
| Publisher domain matches bus domain | ✅ OK |
| Publisher domain differs, no remap | ❌ Compile error |
| Publisher domain differs, explicit Remap block | ✅ OK (expensive) |

### Remap Block Example

```
Field<vec2, PathDomain> → Remap(nearest-param) → Field<vec2, ParticleDomain>
```

This is explicitly marked as expensive and must be intentional.

## 7. Deterministic Evaluation Order

### Rule A: Domain Provides Order

Dense evaluation always iterates in the order of `ids[]` provided by the domain owner.

```typescript
function evalFieldDense<T>(
  field: Field<T>,
  domain: ElementDomain,
  ctx: CompileCtx
): T[] {
  const ids = domain.getIds();
  const result = new Array(ids.length);

  // Iterate in domain order
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    result[index] = field.evalAt(id, index, ctx);
  }

  return result;
}
```

### Rule B: No Hidden Reordering

If you ever reorder for cache locality or SIMD, it must be:
1. Deterministic
2. Part of the domain's ordering contract
3. Not a runtime accident

### Rule C: Reduction Order and Precision

For reducing fields to signals (avg/max):
- Reduction order = domain order (deterministic)
- Precision = f64 for reductions (stable accumulation)

```typescript
interface ReductionPolicy {
  order: 'domain-order';
  precision: 'f64';
}
```

## 8. State and Identity (Future-Proofing)

For per-element state (delays, integrators):

| Requirement | Implementation |
|-------------|----------------|
| State storage key | By `id`, never `index` |
| ID disappears | State retired deterministically |
| ID appears | State initialized with `seed + id` |

## 9. WASM Alignment

The design is WASM-friendly:

```typescript
// Passing to WASM
const ids: Uint32Array = domain.getIds();
const outputBuffer: Float32Array = new Float32Array(ids.length);

// WASM receives typed arrays, not JS objects
wasmModule.evalField(ids.buffer, outputBuffer.buffer);
```

## 10. Acceptance Criteria (Nails in Coffin)

These five invariants **must** be true in code:

| # | Invariant | Enforcement |
|---|-----------|-------------|
| 1 | Every Field evaluation receives explicit `ids: Uint32Array` or domain object | API signature |
| 2 | Every Field artifact carries a `domainTag` and bus combine checks it | Type system + runtime |
| 3 | All per-element variation hashes use `id`, never `index` | Code review |
| 4 | Domain owner is the only place IDs are created/remapped | Architecture |
| 5 | Reduction order is defined and stable (domain order + f64) | Unit tests |

## Ambiguities Requiring Decision

### A1: Domain Tag Format

Options:
1. String: `"svg-path:abc123"` (simple, readable)
2. Structured: `{ type: 'svg-path', instanceId: 'abc123' }` (type-safe)
3. Numeric hash: `0x12345678` (fastest comparison)

**Recommendation**: Option 1 for v1, migrate to Option 3 for WASM.

### A2: Cross-Domain Remap Blocks

When should we implement explicit remap blocks?
1. Phase 2: Basic - reject cross-domain
2. Phase 3: After buses work - add remap blocks

**Recommendation**: Phase 2 rejects cross-domain, log warning with guidance.

### A3: Dynamic Element Count

How to handle domains where count changes per-frame (particles)?
1. Domain snapshot per evaluation
2. Domain provides count range
3. Domain is re-queried each frame

**Recommendation**: Domain snapshot per compile. Runtime count changes require recompile.

## Implementation Order

1. **Define `ElementDomain` interface** in `types-bus.ts`
2. **Add `domainTag` to Field artifacts**
3. **Update Field evaluation** to require domain
4. **Add domain validation** to bus publishers
5. **Update existing archetypes** to be domain owners
6. **Add domain owner interface** to Source blocks

## References

- Original architectural guidance (user message 2025-12-16)
- `types-bus.ts` - Current Field/Bus types
- V4 kernel `core/types.ts` - Signal/Field primitives
