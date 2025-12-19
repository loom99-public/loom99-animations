# Phase 4: Runtime Safety & Live Editing

**Status**: IN PROGRESS (30% complete)
**Goal**: Make the system unbreakable during play.

---

## Summary

Phase 4 ensures the system remains stable during live editing. Users should be able to modify patches while animations run without jank, crashes, or data loss.

---

## What's Implemented (30%)

### 1. Player Architecture
**File**: `runtime/player.ts`

```typescript
interface Player {
  play(): void;
  pause(): void;
  seek(tMs: number): void;
  setProgram(program: Program<RenderTree>): void;

  // Callbacks
  onFrame: (tree: RenderTree, tMs: number) => void;
  onStateChange: (state: 'playing' | 'paused') => void;
  onTimeChange: (tMs: number) => void;
}
```

**Current Capabilities**:
- Single authoritative time source
- Program can be replaced (hot-swap)
- Scrubbing support
- Playback state management

### 2. Timeline Hints
**File**: `runtime/player.ts`

```typescript
interface TimelineHint {
  kind: 'finite' | 'infinite';
  duration?: number;
  cuePoints?: CuePoint[];
}
```

**Purpose**: Help player understand animation structure.

### 3. Validation Framework
**File**: `compiler/error-decorations.ts`

**Error Codes**:
- `EmptyPatch`
- `NotImplemented`
- `BlockMissing`
- `PortTypeMismatch`
- `CycleDetected`
- `DomainMismatch`

**Current State**: Errors are captured but not fully isolated.

---

## What's Missing (70%)

### 1. Program Compatibility Signatures
**Priority**: HIGH
**Purpose**: Determine if new program can cleanly replace old

```typescript
interface ProgramSignature {
  stateShape: Map<BlockId, StateShape>;
  busSignature: Map<BusId, TypeDesc>;
  domainSignature: Map<DomainTag, number>;
}

function areCompatible(old: ProgramSignature, new: ProgramSignature): boolean;
```

**Use Cases**:
- Compatible: Swap immediately, preserve state
- Incompatible: Crossfade or reset state

### 2. State Mapping Rules
**Priority**: HIGH
**Purpose**: Preserve state across hot-swap when possible

**Rules**:
| Change | State Action |
|--------|--------------|
| Block params changed | Preserve state |
| Block type changed | Reset state |
| Block added | Initialize state |
| Block removed | Discard state |
| Bus added/removed | Recompile only |

**Implementation**:
```typescript
interface StateMapping {
  map(oldState: ProgramState, newProgram: Program): ProgramState;
}
```

### 3. Output Crossfade Fallback
**Priority**: MEDIUM
**Purpose**: Smooth transition when incompatible

```typescript
interface CrossfadeController {
  startCrossfade(oldProgram: Program, newProgram: Program, durationMs: number): void;

  // During crossfade:
  // - Run both programs
  // - Blend RenderTrees by alpha
  // - After duration, drop old program
}
```

**Constraints**:
- Crossfade is fallback only (compatible swaps don't need it)
- Maximum crossfade duration: 500ms
- Memory: Both programs in memory briefly

### 4. Error Isolation
**Priority**: HIGH
**Purpose**: One error shouldn't break everything

**Current Problem**:
- Compile error in one block → entire patch fails
- Runtime error → animation freezes

**Solution**:
```typescript
interface IsolatedCompileResult {
  okBlocks: Map<BlockId, Artifact>;
  errorBlocks: Map<BlockId, CompileError>;

  // Partial program: runs ok blocks, shows placeholders for errors
}
```

**Per-Sink Isolation**:
- Each renderer sink compiles independently
- Failed sink shows error indicator
- Other sinks continue rendering

### 5. Zero-Frame Freeze Guarantee
**Priority**: HIGH
**Purpose**: Never show incomplete frame

**Principle**: Compile → Validate → Swap (never show partial)

**Implementation**:
```typescript
async function safeSwap(newPatch: Patch): Promise<void> {
  // 1. Compile new program (off main thread if possible)
  const result = await compile(newPatch);

  // 2. Validate completely
  if (!result.ok) {
    // Don't swap, show errors in UI
    return;
  }

  // 3. Atomic swap
  player.setProgram(result.program);  // Single assignment
}
```

**Guarantees**:
- Old program runs until new is ready
- Swap is single atomic operation
- No partial state visible to user

---

## Implementation Plan

### Task 4.1: Program Compatibility Signatures
**Complexity**: Medium

**Steps**:
1. Define `ProgramSignature` interface
2. Generate signature during compilation
3. Implement `areCompatible()` comparison
4. Integrate with hot-swap logic
5. Add tests

### Task 4.2: State Mapping
**Complexity**: High

**Steps**:
1. Define `StateMapping` interface
2. Implement mapping rules per state block type
3. Integrate with Player.setProgram()
4. Handle edge cases (type changes, etc.)
5. Add tests for all mapping scenarios

### Task 4.3: Output Crossfade
**Complexity**: Medium

**Steps**:
1. Implement `CrossfadeController`
2. Modify RenderTree to support blending
3. Integrate with Player
4. Add crossfade duration control
5. Test with incompatible swaps

### Task 4.4: Error Isolation
**Complexity**: High

**Steps**:
1. Modify compiler to collect partial results
2. Generate placeholder artifacts for errors
3. Per-sink compilation isolation
4. Error indicators in render output
5. Tests for partial compilation

### Task 4.5: Zero-Frame Freeze
**Complexity**: Low

**Steps**:
1. Ensure compile is complete before swap
2. Add validation gate
3. Test atomic swap behavior
4. Document swap semantics

---

## Tests to Add

| Test File | Coverage |
|-----------|----------|
| `program-signature.test.ts` | Signature generation, comparison |
| `state-mapping.test.ts` | All mapping rules |
| `crossfade.test.ts` | Blend behavior, timing |
| `error-isolation.test.ts` | Partial compilation |
| `zero-frame.test.ts` | Atomic swap guarantee |

---

## Acceptance Criteria

Phase 4 is complete when:

1. [ ] Program compatibility signatures generated and compared
2. [ ] State preserved across compatible hot-swaps
3. [ ] Crossfade fallback for incompatible swaps
4. [ ] Error in one block doesn't crash others
5. [ ] Zero visible jank during any swap
6. [ ] All tests pass
7. [ ] Documentation updated

---

## Performance Considerations

**Compilation**:
- May need to move to worker thread
- Current: synchronous on main thread
- Future: async compilation with loading indicator

**Crossfade**:
- Temporarily runs two programs
- Memory: 2x normal during fade
- CPU: 2x render cost during fade
- Duration: Keep short (100-500ms)

---

## Related Documents

- `07-live-editing.md`: Live editing theory
- `12-risks-mitigations.md`: D1 (Visual jank during edits)
