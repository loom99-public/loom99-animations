# Field Representation Contract
Generated: 2025-12-16
Status: APPROVED - Architecture decision for Phase 4+

## Executive Summary

**Decision**: Lazy-first with expression graphs, not bulk arrays.

Fields are **structured expression graphs** that compile to **dense, fused evaluators**, with a sparse `get` path for tooling.

This is the correct long-term foundation for Field buses, even though Phase 2 only implements Signal buses.

---

## 1. What a Field Must Mean (Semantics)

A Field is a pure function that maps:
```
(elementId, time, seed, ctx) → T
```

It varies over:
- **Element identity** (id) - stable, deterministic
- **Time** (via TimeCtx) - supports scrubbing
- **Seed** - explicit determinism
- **Context** - static resources, geometry handles

A Field is both:
- A **point query function** (`get` for one id) - for tooling, sparse consumers
- A **vectorized evaluator** (`evalInto`) - for performance-critical paths

---

## 2. The Optimal Representation

### Why NOT Bulk Arrays (Current)

```typescript
// Current: allocates constantly, intermediate arrays explode
type Field<T> = (seed, n, ctx) => readonly T[]
```

Problems:
- Bus combining allocates huge intermediate arrays per publisher
- GC churn on every frame
- Cannot fuse operations

### Why NOT Pure Closures

```typescript
// Closures: minimal but un-debuggable, hard to fuse
type Field<T> = { get(id): T }
```

Problems:
- Dense evaluation expensive (closure call per element)
- Hard to fuse (lose structure)
- Hard to cache (what's inside?)

### The Answer: Expression Graphs + Compiled Evaluators

```typescript
// Optimal: structured, fusable, debuggable
type FieldExpr<T> =
  | { kind: 'const'; value: T }
  | { kind: 'source'; blockId: string; port: string }
  | { kind: 'map'; src: FieldExpr<any>; fnId: string }
  | { kind: 'zip'; a: FieldExpr<any>; b: FieldExpr<any>; fnId: string }
  | { kind: 'bus'; busId: string; publishers: FieldExpr<any>[]; combineMode: string }
  | { kind: 'noise'; seed: number; params: NoiseParams }
  | { kind: 'samplePath'; pathId: string; paramExpr: FieldExpr<number> }
  // ... more as needed
```

Compilation produces:
- **Dense evaluator**: tight loop, fused, writes to caller buffer
- **Sparse evaluator**: for tooling, implements `get(id)`

---

## 3. The Essential Interface

```typescript
interface Field<T> {
  /** Expression graph (for introspection, fusion, caching) */
  readonly expr: FieldExpr<T>;

  /** Type descriptor */
  readonly typeDesc: TypeDesc;

  /** Domain this field operates over */
  readonly domainTag: string;

  /** Sparse query - single element */
  get(id: number, timeCtx: TimeCtx, seed: Seed, ctx: EvalCtx): T;

  /** Dense query - fill buffer for all elements */
  evalInto(
    domain: ElementDomain,
    timeCtx: TimeCtx,
    seed: Seed,
    ctx: EvalCtx,
    out: T[]
  ): T[];

  /** Identity for caching */
  readonly exprHash: number;

  /** Flags */
  readonly scrubSafe: boolean;
  readonly stateful: boolean;
}
```

---

## 4. Dense Evaluation is the Performance Truth

Most real visuals are dense:
- Particles iterate N
- Strokes sample many points
- Per-element transforms evaluate across populations

Dense evaluation must be the **primary optimized path**:
- Fields evaluate into **caller-provided buffers** (no allocations)
- Evaluator operates over **deterministic id set and order**
- Evaluator supports **operation fusion** (no intermediate buffers)

Goal: "One pass over ids, compute final value in registers, write to output."

---

## 5. Fusion: The Defining Feature

Fusion means:
```typescript
// This executes as ONE loop, no intermediate arrays:
out[i] = softclip(a[i] + b[i] * c[i])
```

Without fusion (bulk arrays):
```typescript
const a = fieldA.eval(n);    // alloc
const b = fieldB.eval(n);    // alloc
const c = fieldC.eval(n);    // alloc
const prod = zip(b, c, mul); // alloc
const sum = zip(a, prod, add); // alloc
const out = map(sum, softclip); // alloc
// 6 arrays, massive GC pressure
```

With fusion (expression graph):
```typescript
const expr = map(zip(a, zip(b, c, 'mul'), 'add'), 'softclip');
const evaluator = compile(expr);
evaluator.evalInto(domain, ctx, out); // ONE array, ONE loop
```

---

## 6. Caching Strategy

### What to Cache

| Level | What | Why |
|-------|------|-----|
| Compile cache | Compiled evaluators by expr hash | Avoid recompiling on UI changes |
| Per-frame memo | Expensive shared subexpressions | Geometry sampling, path data |

### What NOT to Cache

- Full `T[]` results (unless reused many times)
- Per-id values (memory blowup)

Prefer reusing buffers over allocating new arrays.

---

## 7. Element ID vs Index

Critical distinction (per ELEMENT-DOMAIN-CONTRACT.md):

| Concept | Meaning | Used For |
|---------|---------|----------|
| `id` | Stable element identity | Variation seeds, state lookup |
| `index` | Iteration position 0..N-1 | Output buffer position |

The Field API must acknowledge this:
- Evaluate over a **list of ids**, not just "count N"
- Or use a **stable id generator** from the element source

---

## 8. How Fields Interact with Buses

A Field bus is:
```
A named Field expression that combines several publisher Fields
```

With expression graphs:
```typescript
// Bus combine creates a new expression node
const busExpr: FieldExpr = {
  kind: 'bus',
  busId: 'offsets',
  publishers: [exprA, exprB, exprC],
  combineMode: 'sum'
};
// Compilation fuses with downstream consumers
```

With bulk arrays:
```typescript
// Catastrophic: allocate per publisher, per bus, per frame
const a = publisherA.eval(n);
const b = publisherB.eval(n);
const c = publisherC.eval(n);
const combined = combine(a, b, c); // another alloc
```

**The Field representation is what makes Field buses feasible.**

---

## 9. Stateful Fields (Edge Case)

Most fields are **pure**: value depends only on (id, time, seed, ctx).

Stateful fields (integrators, delays) must be:
- **Explicitly marked** with `stateful: true`
- **Memory boundaries** for cycle legality
- **Defined behavior** under scrub (reset? interpolate?)

The expression graph carries flags:
```typescript
interface FieldExpr {
  // ...
  stateful?: boolean;
  scrubSafe?: boolean;
}
```

---

## 10. Phase Alignment

| Phase | Field Work |
|-------|------------|
| **Phase 2** | Signal buses only. No FieldExpr evaluation needed. |
| **Phase 4** | Field buses. Implement FieldExpr compilation + dense evaluators. |
| **Phase 5+** | Fusion optimization, WASM evaluators, advanced caching. |

### Phase 2 Scope (Signal Buses)

For Signal buses, we work with **Signal artifacts**, not Field expressions:
- Combine Signal values using sortKey ordering
- Return combined Signal artifact
- No FieldExpr evaluation needed

### Phase 4 Scope (Field Buses)

When we implement Field buses:
1. FieldExpr graph construction from publishers
2. Element Domain validation (all publishers same domain)
3. Dense evaluator compilation
4. Fusion pass for performance

---

## 11. FieldExpr Primitive Nodes (Phase 4 Design)

Initial node set:

| Node | Purpose |
|------|---------|
| `const` | Constant value for all elements |
| `source` | Value from block output port |
| `map` | Transform each element: `f(x)` |
| `zip` | Combine two fields: `f(a, b)` |
| `bus` | Combine publishers with mode |
| `noise` | Seeded per-element noise |
| `samplePath` | Sample path at parameter |
| `byIdHash` | Deterministic per-id variation |
| `adapter` | Type conversion |

---

## 12. Migration Path

### Step 1: Introduce FieldLike Wrapper (Phase 4)

```typescript
interface FieldLike<T> {
  get(id: number, ctx: EvalCtx): T;
  evalInto(domain: ElementDomain, ctx: EvalCtx, out: T[]): T[];
}
```

### Step 2: Wrap Existing Bulk Fields

```typescript
function wrapBulkField<T>(bulkFn: BulkField<T>): FieldLike<T> {
  return {
    get(id, ctx) {
      // Temporary: evaluate small batch
      const arr = bulkFn(ctx.seed, 1, ctx);
      return arr[0];
    },
    evalInto(domain, ctx, out) {
      const arr = bulkFn(ctx.seed, domain.count, ctx);
      for (let i = 0; i < arr.length; i++) out[i] = arr[i];
      return out;
    }
  };
}
```

### Step 3: Progressively Replace with True FieldExpr

Update consumers to use `evalInto` with buffer reuse.

---

## Summary

| Question | Answer |
|----------|--------|
| Representation | Expression graphs + compiled evaluators |
| Dense path | Primary optimized path, buffer-filling kernels |
| Sparse path | For tooling, implemented via batch-of-1 or dedicated |
| Fusion | Essential - no intermediate arrays |
| Caching | Compile cache + per-frame memo, not per-id |
| Phase 2 scope | None - Signal buses don't need FieldExpr |
| Phase 4 scope | Full implementation |
