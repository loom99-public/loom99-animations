# Bus Semantics Contract
Generated: 2025-12-16
Status: APPROVED - Ready for implementation

## 1. Memory Block Registry (Cycle Detection)

### Definition

A **memory boundary** is a node that breaks instantaneous dependency by introducing a well-defined delay in the value domain.

### Implementation

Add `memoryBoundary: true` flag in block registry metadata. Cycle validation consults **only** that flag. No heuristics.

```typescript
interface BlockDefinition {
  // ... existing fields
  memoryBoundary?: boolean;  // true = breaks cycles
}
```

### Closed Set (v1)

| Block Type | memoryBoundary | Reason |
|------------|----------------|--------|
| DelayLine / Delay | ✅ true | Introduces non-zero delay |
| Integrate | ✅ true | Explicit state accumulator |
| SampleHold / TrackHold | ✅ true | Holds previous value across time |
| State | ✅ true | Generic state primitive |
| HistoryBuffer | ✅ true | "Previous value" access |

### NOT Memory Boundaries

| Block Type | memoryBoundary | Reason |
|------------|----------------|--------|
| Slew / smoothing | ❌ false | Ambiguous timing, not guaranteed delay |
| Phase accumulator | ❌ false | Purely derived from t, scrub-safe |
| Transport / time blocks | ❌ false | Simply expose time, no memory |

### Cycle Validation Rule

```typescript
function validateCycle(scc: StronglyConnectedComponent): CycleValidation {
  const hasMemory = scc.nodes.some(node =>
    node.type === 'BlockOut' &&
    registry.get(node.blockType)?.memoryBoundary === true
  );

  if (!hasMemory) {
    return {
      valid: false,
      error: 'Illegal feedback loop: cycle contains no memory boundary. Insert a Delay block.'
    };
  }
  return { valid: true };
}
```

---

## 2. Field Bus Combination Semantics

### Rule: Per-Element, Index-Aligned, Same Domain

For a `Field<T>` bus with multiple publishers:

```
For each element id in the bus's element domain:
  combine values from each publisher for that same id
```

### Domain Compatibility Rule (Non-Negotiable)

All publishers to a Field bus **must** share the same Element Domain.

```typescript
interface FieldBus extends Bus {
  domainTag: string;  // e.g., "svg-path:abc123"
}

function validateFieldPublisher(bus: FieldBus, publisher: Publisher): ValidationResult {
  const publisherDomain = getPublisherDomainTag(publisher);

  if (publisherDomain !== bus.domainTag) {
    return {
      valid: false,
      error: `Domain mismatch: cannot combine ${publisherDomain} with ${bus.domainTag} without explicit Remap`
    };
  }
  return { valid: true };
}
```

### Domain Mismatch Error Message

```
Domain mismatch: cannot combine ParticleDomain with PathPointDomain without Remap.
All publishers to a Field bus must share the same Element Domain.
```

### Future: Remap Operators (Not v1)

Cross-domain combination requires explicit Remap block:
```
Field<vec2, PathDomain> → Remap(nearest-param) → Field<vec2, ParticleDomain>
```

This is expensive and must be intentional.

---

## 3. Bus Default Values (Silent Values)

### Principle

Default should mean **"no influence"**, not "a strong aesthetic."

Transparent is more neutral than black.

### Signal Bus Defaults

| Domain | Default Value | Rationale |
|--------|---------------|-----------|
| `number` | `0` | Additive identity |
| `vec2` | `(0, 0)` | Additive identity |
| `color` | `rgba(0,0,0,0)` | Transparent = no influence |
| `phase` | `0` | Phase start |
| `time` | `0` | Time origin |
| `trigger` | never fires | Empty event stream |
| `boolean` | `false` | Logical identity |

### Field Bus Defaults

| Domain | Default Value | Rationale |
|--------|---------------|-----------|
| `Field<number>` | field of `0` | Per-element additive identity |
| `Field<vec2>` | field of `(0, 0)` | Per-element additive identity |
| `Field<color>` | field of transparent | Per-element no influence |
| `Field<phase>` | field of `0` | Per-element phase start |

### Implementation

```typescript
function getDefaultValue(busType: SlotType): unknown {
  switch (busType) {
    case 'Signal<number>': return 0;
    case 'Signal<vec2>': return { x: 0, y: 0 };
    case 'Signal<color>': return { r: 0, g: 0, b: 0, a: 0 }; // transparent
    case 'Signal<phase>': return 0;
    case 'Signal<time>': return 0;
    case 'Signal<trigger>': return { kind: 'never' };
    case 'Signal<boolean>': return false;
    // Field defaults are lazy - produce array of defaults when evaluated
    default: return null;
  }
}
```

### Why Transparent, Not Black

- Opaque black (`rgba(0,0,0,1)`) is a visible color choice
- Transparent (`rgba(0,0,0,0)`) is neutral "no influence"
- When blending/layering, transparent disappears; black dominates

---

## 4. Adapter Chains: Publisher and Listener

### Rule: Both Sides May Have Adapter Chains

| Side | Semantic | Example Use |
|------|----------|-------------|
| **Publisher** | "How I contribute to the shared bus" | Scale down, gate, quantize before bus |
| **Listener** | "How I interpret this shared bus" | Slew, range map, threshold after bus |

### Data Model

```typescript
interface Publisher {
  id: string;
  busId: string;
  from: BindingEndpoint;
  sortKey: number;
  enabled: boolean;
  adapterChain?: AdapterStep[];  // Publisher-side transforms
}

interface Listener {
  id: string;
  busId: string;
  to: BindingEndpoint;
  enabled: boolean;
  adapterChain?: AdapterStep[];  // Listener-side transforms
}
```

### Guardrails

| Rule | Enforcement |
|------|-------------|
| Auto-insert chain length ≤ 2 | UI constraint |
| Heavy adapters (Reduce, Remap) require explicit user action | Confirmation dialog |
| Total chain length advisory warning at > 4 | Yellow warning badge |

### Mental Model

> "Contributors shape contributions; consumers shape responses."

Publisher adapters: prepare the contribution
Listener adapters: interpret the result

Both are valid, both are useful, both should be explicit.

---

## Summary Table

| Question | Decision |
|----------|----------|
| Memory blocks | Explicit `memoryBoundary: true` flag, closed set |
| Field combination | Per-element, same domain required, mismatch = error |
| Default values | "No influence" principle, transparent for color |
| Adapter chains | Both publisher and listener allowed |
