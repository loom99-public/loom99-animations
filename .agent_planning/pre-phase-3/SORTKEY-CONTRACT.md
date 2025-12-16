# sortKey Contract
Generated: 2025-12-16
Status: APPROVED - Ready for implementation

## Definition

**sortKey** defines the explicit, deterministic priority with which a publisher's contribution is combined into a bus.

It is a **semantic tool**, not an implementation detail.

## Data Model

### Publisher Record

```typescript
interface Publisher {
  id: string;              // UUID, stable identifier
  busId: string;           // Target bus
  from: { blockId: string; port: string };
  sortKey: number;         // Explicit ordering (integer recommended)
  enabled: boolean;
  weight?: number;         // Optional amplitude
  adapterChain?: AdapterStep[];
}
```

### Invariants

1. `sortKey` is **never** derived from:
   - Block order in arrays
   - Canvas position
   - Compilation order
   - Array insertion order

2. Tie-breaker is deterministic: `(sortKey, publisher.id)`

3. Serialization round-trips preserve `sortKey` unchanged

## Store Behavior

### Default Assignment (on create)

```typescript
function getNextSortKey(busId: string): number {
  const publishers = this.publishers.filter(p => p.busId === busId);
  if (publishers.length === 0) return 0;
  const maxKey = Math.max(...publishers.map(p => p.sortKey));
  return maxKey + 10;  // Steps of 10 for easy insertion
}
```

### Reordering UI

When user reorders publishers in Bus Inspector:
- Renormalize to clean sequence: `0, 10, 20, ...`
- Simple and stable

### Manual Priority UI

Expose as "Priority" slider or +/- stepper:
- Changing it updates `sortKey` directly
- Negative values allowed (background influences)

## Compiler Usage

When compiling a `BusValue(busId)` node:

```typescript
function compileBusValue(busId: string, ctx: BusCompileCtx): Artifact {
  // 1. Collect enabled publishers
  const publishers = ctx.publishers
    .filter(p => p.busId === busId && p.enabled);

  // 2. Stable sort by (sortKey, id)
  publishers.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.id.localeCompare(b.id);
  });

  // 3. Compile each publisher's artifact
  const artifacts = publishers.map(p => compilePublisher(p, ctx));

  // 4. Combine in sorted order
  return combineArtifacts(artifacts, bus.combineMode);
}
```

## Combine Mode Interactions

### Order-Sensitive Modes

| Mode | Behavior |
|------|----------|
| `last` | Highest sortKey wins |
| `layer` | Applied in ascending sortKey order |
| custom | Fully defined by user combiner |

### Order-Insensitive Modes

| Mode | Behavior |
|------|----------|
| `sum` | Sorted first, then summed (deterministic FP accumulation) |
| `avg` | Sorted first, then averaged |
| `max` | Sorted first, then max |
| `min` | Sorted first, then min |

**Why sort for order-insensitive modes?** Floating-point accumulation order affects results. Sorting ensures identical results across runs and machines.

## Mental Model

Think of sortKey as **depth/priority**, not time:

| sortKey | Role |
|---------|------|
| Low (0) | Background influence |
| Medium (50) | Normal contributions |
| High (100+) | Foreground/dominant |
| Very High (1000) | Emergency override |

Example layering:
- Base motion: `sortKey = 0`
- Storm mode effect: `sortKey = 100`
- Kill switch: `sortKey = 1000`

## Determinism Guarantees

These rules are **non-negotiable**:

1. Order of `publishers[]` in JSON is irrelevant to semantics
2. Canvas layout never affects bus results
3. Graph topological sort never affects publisher dominance
4. Identical patches always produce identical results

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Duplicate sortKeys | Allowed; tie-break by `id` |
| Huge sortKeys | Allowed; normalize occasionally |
| Negative sortKeys | Allowed; useful for background |
| Deleted publisher | Order collapses naturally |

## Test Cases

1. Two publishers, mode=last: higher sortKey must win
2. Swap sortKeys: result must swap without other changes
3. Same sortKey: result stable across runs (tie-break by id)
4. Reorder blocks on canvas: output unchanged
5. Change publisher insertion order: output unchanged if sortKeys identical

## What sortKey Is NOT

- ❌ Frame order
- ❌ Execution time
- ❌ "Which block runs last"
- ❌ An optimization hint
- ❌ Derived from anything implicit

It is **part of the meaning of the patch**.
