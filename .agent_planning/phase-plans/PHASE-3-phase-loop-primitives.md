# Phase 3: Phase & Loop Primitives

**Status**: IN PROGRESS (80% complete)
**Goal**: Make looping structural, not a UI trick.

---

## Summary

Phase 3 introduces phase as a first-class concept for infinite, scrub-safe animation. The core primitives are working, but advanced phase operations are still needed.

---

## What's Implemented (80%)

### 1. Derived Phase Blocks (Stateless)
**Files**: `PhaseClock.ts`, `LinearPhaseBlock.ts`

```typescript
// Derived phase: pure function of time, scrub-safe
phase(t) = fract((t + offset) / period + phaseOffset)
```

**PhaseClock Parameters**:
- `period`: Duration of one cycle
- `offset`: Time offset
- `phaseOffset`: Phase offset (0-1)
- `mode`: 'loop' | 'once' | 'pingPong'

### 2. PhaseMachine Block
**File**: `compiler/unified/blocks/PhaseMachineBlock.ts`

Three-phase lifecycle:
- **Entrance**: 0 → entranceDuration
- **Hold**: entranceDuration → entranceDuration + holdDuration
- **Exit**: → total duration

**Output**:
```typescript
interface PhaseSample {
  phase: 'entrance' | 'hold' | 'exit';
  u: number;        // Eased progress (0-1)
  uRaw: number;     // Linear progress
  tLocal: number;   // Time within phase
}
```

### 3. Stateful Phase Accumulators
**Files**: `HistoryBlock.ts`, `IntegrateBlock.ts`

- **HistoryBlock**: Track value history with configurable depth
- **IntegrateBlock**: Accumulate/integrate signals over time

Both declare explicit scrub behavior (performance-first unless reconstruction implemented).

### 4. Phase-Trigger Primitives
**File**: `TriggerOnWrap.ts`

```typescript
// Emit trigger when phase wraps from 1 → 0
TriggerOnWrap(phase) → Signal<trigger>
```

**Usage**: Connect to EnvelopeAD for pulse effects.

### 5. Demo Patch Integration
**File**: `demo-patches/breathing-dots.json`

The breathing dots demo uses:
- PhaseClock (2s period) → phaseA bus
- DotsRenderer subscribes with breathing lens
- Smooth grow/shrink animation

---

## What's Missing (20%)

### 1. Phase Warping Blocks
**Priority**: HIGH
**Purpose**: Speed up/slow down parts of the phase cycle

```typescript
// Conceptual API
PhaseWarp {
  input: Signal<phase>,
  curve: 'ease-in' | 'ease-out' | 'custom',
  output: Signal<phase>  // Same 0-1 range, different timing
}
```

**Use Case**: Slow at peaks, fast through transitions.

### 2. Multi-Scale Phase Interactions
**Priority**: MEDIUM
**Purpose**: Nested phases for hierarchical time

```typescript
// Conceptual: macro phase controls micro phase
macroPhase (period: 60s) → microPhasePeriod
microPhase (period: macroPhase * 5s) → animation
```

**Use Case**: Slow drift modulates fast pulse.

### 3. Phase Quantization Blocks
**Priority**: MEDIUM
**Purpose**: Snap phase to discrete steps

```typescript
PhaseQuantize {
  input: Signal<phase>,
  steps: number,       // e.g., 8 steps
  output: Signal<phase>  // Stepped values
}
```

**Use Case**: Rhythmic, steppy motion like clock hands.

### 4. Advanced Fold Operations
**Priority**: LOW
**Purpose**: Complex phase folding beyond wrap

```typescript
// Fold: 0→1→0 (like pingPong but continuous)
PhaseFold(phase) → Signal<phase>
```

---

## Implementation Plan

### Task 3.1: Phase Warp Block
**Complexity**: Medium

**Steps**:
1. Define `PhaseWarp` block type in block registry
2. Add warp functions: ease-in, ease-out, s-curve, custom
3. Implement compilation to Signal evaluator
4. Wire through compilation pipeline
5. Add tests

**Key File Changes**:
- `blocks.ts`: Add PhaseWarp block definition
- `compiler/blocks/time/PhaseWarp.ts`: New file
- `compileBusAware.ts`: Handle PhaseWarp compilation

### Task 3.2: Phase Quantize Block
**Complexity**: Low

**Steps**:
1. Define `PhaseQuantize` block type
2. Implement: `output = floor(input * steps) / steps`
3. Add to compilation
4. Add tests

### Task 3.3: Multi-Scale Phase Interaction
**Complexity**: High

**Steps**:
1. Design phase modulation pattern
2. Implement phase-driven period signals
3. Update PhaseClock to accept Signal<number> for period
4. Document multi-scale patterns
5. Add demo patch

### Task 3.4: Phase Fold Block
**Complexity**: Low

**Steps**:
1. Define `PhaseFold` block type
2. Implement: `output = 1 - abs(2 * input - 1)`
3. Add to compilation
4. Add tests

---

## Tests

### Existing Tests (46 total)
| Test File | Count |
|-----------|-------|
| `PhaseMachine.test.ts` | 23 |
| `LinearPhase.test.ts` | 23 |

### Tests to Add
- `PhaseWarp.test.ts`: Warp function correctness
- `PhaseQuantize.test.ts`: Step behavior
- `PhaseFold.test.ts`: Fold behavior
- `phase-multi-scale.test.ts`: Nested phase patterns

---

## Acceptance Criteria

Phase 3 is complete when:

1. [ ] PhaseWarp block with ease-in, ease-out, s-curve
2. [ ] PhaseQuantize block with configurable steps
3. [ ] PhaseFold block for pingPong-style folding
4. [ ] At least one demo patch using multi-scale phase
5. [ ] All scrub behavior is correct (derived phases scrub-safe)
6. [ ] Tests for all new blocks
7. [ ] Documentation updated

---

## Key Design Decisions

### Scrub vs Performance
- **Derived phases** (PhaseClock, PhaseWarp, etc.): Always scrub-safe
- **Stateful accumulators** (Integrate, History): Performance-first, may require reconstruction for scrub

### Phase Range
- All phase values are **0-1** normalized
- Cycle count is separate signal if needed
- No negative phases

### Determinism
- Phase computation must be **pure function of TimeCtx**
- No hidden state in derived phases
- Stateful blocks explicitly registered

---

## Related Documents

- `01-time-and-phase.md`: Phase theory
- `10-canonical-primitives.md`: Block specifications
- `12-risks-mitigations.md`: Phase-related risks (A1, A2, B1)
