# Full System Specification - Foundational Architecture

**Initiative**: Foundational Architecture Revision
**Started**: 2025-01-18
**Status**: In Progress - Phase 2 Complete

## Overview

This document tracks the implementation of the clean foundational architecture as specified in `feature_planning_docs/Full-System-Design/10-Foundational Architecture.md`.

The goal is to replace the existing compiler with a unified system that enforces the core architectural invariant:

```
The system is a pure function of (TimeCtx, Patch Definition, Explicit State)
```

## Architecture Principles

1. **Single Invariant**: Everything is a pure function of (TimeCtx, Patch, State)
2. **Time as Data**: TimeCtx contains t, dt, frame, mode - no hidden clocks
3. **Pull-Based Evaluation**: No block "runs", everything is queried
4. **Explicit State**: Only exists in Delay, Integrate, History, or explicit state blocks
5. **Buses as First-Class Nodes**: Compile to Signal evaluators or FieldExpr nodes

## Implementation Status

### Phase 1: Foundation (COMPLETE - 2025-12-18)

- [x] FULL_SYSTEM_SPEC.md created
- [x] Feature flag system for gradual rollout
- [x] UnifiedCompiler implemented from scratch
  - [x] Dependency graph builder (blocks + buses as nodes)
  - [x] Cycle detection across all boundaries
  - [x] State-delayed cycle support (legal cycles through state blocks)
  - [x] Bus compilation contract (Signal buses only for now)
  - [x] State boundary validation
  - [x] Stable ordering enforcement
- [x] TimeCtx integration
  - [x] TimeCtx interface defined
  - [x] TimeCtxManager implemented with mode transition support
  - [x] Frame counter management
  - [x] TimeCtx propagation through evaluators
- [x] Initial state blocks infrastructure
  - [x] StateShape and ScrubPolicy interfaces
  - [x] StateBlockRegistry for explicit state tracking
  - [x] Delay block implementation
- [x] Testing infrastructure
  - [x] UnifiedCompiler tests (8 tests)
  - [x] DependencyGraph tests (13 tests)
  - [x] TimeCtx tests (8 tests)
  - [x] All legacy tests continue to pass (174 total tests)

**Phase 1 Completion Date**: 2025-12-18

### Phase 2: Runtime Integration (COMPLETE - 2025-12-18)

- [x] RuntimeAdapter implementation
  - [x] Pull-based evaluation pipeline
  - [x] State memory management (Map<blockId, StateMemory>)
  - [x] TimeCtx propagation to all evaluators
  - [x] RenderTree extraction from output blocks
  - [x] Program<RenderTree> generation compatible with Player
- [x] Integrate state block
  - [x] Accumulator implementation (out = out + input * dt)
  - [x] Scrub policy: 'hold' (freeze during scrub)
  - [x] Initial value configuration
  - [x] State persistence across frames
- [x] History state block
  - [x] Circular buffer implementation
  - [x] Fixed-size allocation (no growth)
  - [x] Chronological ordering output
  - [x] Scrub policy: 'hold' (freeze during scrub)
  - [x] Depth configuration (1-100)
- [x] Feature flag integration
  - [x] integration.ts updated with unified compiler path
  - [x] toUnifiedPatchDef() converter for patch format
  - [x] compileWithUnified() wrapper function
  - [x] Error code mapping (cycle → CycleDetected)
  - [x] Bus/Publisher/Listener type conversion
- [x] Testing infrastructure
  - [x] RuntimeAdapter tests (9 tests)
  - [x] IntegrateBlock tests (14 tests)
  - [x] HistoryBlock tests (20 tests)
  - [x] All legacy tests continue to pass (217 total tests)

**Phase 2 Completion Date**: 2025-12-18

**Test Coverage**: 217 tests passing (72 unified compiler tests + 145 legacy tests)

### Phase 3: Block Migration (Future)

This section will track which blocks from the legacy system have been reimplemented in the new architecture.

#### Scene Blocks
- [ ] SVGPathSource
- [ ] RadialOrigin
- [ ] FlowFieldOrigin
- [ ] CustomScene

#### Phase/Time Blocks
- [ ] PhaseMachine
- [ ] LinearPhase
- [ ] CustomPhase
- [ ] PhaseAccumulator (new - stateful)

#### Field Blocks
- [ ] PerElementDelay
- [ ] PerElementDuration
- [ ] PerElementProgress
- [ ] NoiseField
- [ ] DistanceField

#### Compose/Spec Blocks
- [ ] DemoProgram
- [ ] PerElementTransport
- [ ] LerpPoints

#### Render Blocks
- [ ] OutputProgram
- [ ] RenderTreeAssemble
- [ ] PerElementCircles
- [ ] Canvas
- [ ] GlowFilter
- [ ] GooFilter
- [ ] MaskReveal
- [ ] ParticleRenderer

#### Debug/Utility Blocks
- [ ] DebugOutput

### Phase 4: Advanced Features (Future)

- [ ] FieldExpr lazy evaluation with domain awareness
- [ ] Advanced state blocks (phase clocks, user state)
- [ ] Bus optimizations with domain-specific reducers
- [ ] Cycle detection UI
- [ ] Advanced TimeCtx features (time warping, custom modes)

## Feature Flags

The unified architecture is controlled by feature flags to enable gradual rollout:

```typescript
// Enable all unified features
import { enableUnifiedArchitecture } from './compiler';
enableUnifiedArchitecture();

// Or enable selectively
import { setFeatureFlags } from './compiler';
setFeatureFlags({
  useUnifiedCompiler: true,
  strictStateValidation: true,
  busCompilation: true,
  timeCtxPropagation: true,
});
```

Feature flags can also be set via environment variables:
- `VITE_USE_UNIFIED_COMPILER=true`
- `VITE_STRICT_STATE_VALIDATION=true`
- `VITE_BUS_COMPILATION=true`
- `VITE_TIMECTX_PROPAGATION=true`

Or via localStorage for developer testing:
```javascript
localStorage.setItem('compilerFeatureFlags', JSON.stringify({
  useUnifiedCompiler: true,
  strictStateValidation: true,
  busCompilation: true,
  timeCtxPropagation: true
}));
```

## Legacy Code Location

Legacy compiler code remains at:
```
gallery/src/editor/compiler/compile.ts
gallery/src/editor/compiler/integration.ts (with unified path added)
```

This code continues to function as the default until feature flags enable the unified compiler.

## Key Architectural Decisions

### TimeCtx Design

**Decision**: Pull-based evaluation with TimeCtx as single time source

**Rationale**:
- Enables perfect scrubbing
- Deterministic reconstruction
- Stateless looping
- Reproducible exports

### Bus Compilation

**Decision**: Buses compile to evaluators, not runtime wires

**Rationale**:
- Buses are semantic nodes in dependency graph
- Ordering boundaries for determinism
- Named influence fields, not connections

### State Management

**Decision**: Explicit state blocks only, no implicit closures

**Rationale**:
- Compiler can validate state boundaries
- UI can inspect state
- Clear scrub behavior
- No hidden side effects

### Cycle Detection

**Decision**: Allow cycles through state blocks, reject instantaneous cycles

**Rationale**:
- State blocks represent time delay (frame buffering)
- Feedback loops are essential for many systems
- Instantaneous cycles would cause infinite loops
- Edge marking (`throughState`) enables detection

## Test Strategy

### Existing Tests
All existing tests in `gallery/src/editor/__tests__/` continue to pass:
- bus-compilation.test.ts (9 tests)
- composite.expansion.test.ts (1 test)
- composites.test.ts (1 test)
- bus-name-suggestion.test.ts (11 tests)
- blocks.tags.test.ts (3 tests)

### New Architecture Tests
New tests in `gallery/src/editor/compiler/unified/__tests__/`:
- UnifiedCompiler.test.ts (8 tests)
- DependencyGraph.test.ts (13 tests)
- TimeCtx.test.ts (8 tests)
- RuntimeAdapter.test.ts (9 tests)
- IntegrateBlock.test.ts (14 tests)
- HistoryBlock.test.ts (20 tests)

**Total Test Coverage**: 217 tests passing

## Migration Notes

### For Future Developers

When migrating blocks from legacy to new system:

1. **DO NOT** copy-paste from legacy code
2. **DO** read the block's DOD in `feature_planning_docs/`
3. **DO** implement based on new architecture principles
4. **DO** ensure TimeCtx propagation
5. **DO** validate no implicit state
6. **DO** update this document's Phase 3 checklist

### Common Pitfalls

- Don't use closures that capture mutable state
- Don't read time from anything except TimeCtx
- Don't create hidden loops or timers
- Don't skip bus compilation contract
- Don't ignore state boundary validation
- Don't forget to filter `throughState` edges in topological sort

## Recent Fixes and Enhancements

### Phase 2 Implementation (2025-12-18)

#### RuntimeAdapter
- Pull-based evaluation in dependency order
- State memory lifecycle management
- TimeCtx creation from wall-clock time (tMs → TimeCtx)
- RenderTree extraction with fallback to empty group
- Reset capability for testing and restart

#### State Blocks
- **IntegrateBlock**: Accumulates input * dt over time with hold scrub policy
- **HistoryBlock**: Circular buffer (depth 1-100) with chronological output ordering

#### Feature Flag Integration
- Unified compiler enabled via `featureFlags.useUnifiedCompiler`
- Patch conversion: CompilerPatch → PatchDefinition
- Type conversion: Bus/Publisher/Listener ↔ UnifiedCompiler types
- Error code mapping for compatibility

### Phase 1 Fixes (2025-12-18)
1. **TimeCtx mode transition** - Frame counter now resets to 0 when mode changes
2. **State block cycle detection** - `throughState` flag properly set based on source block
3. **Topological sort** - State-delayed edges now filtered to allow legal cycles

### Commits
- `f4a4a0a` - feat(compiler): implement Phase 2 runtime integration
- `6e5ff3e` - feat(compiler): integrate unified compiler with feature flag
- `b811126` - fix: resolve unified compiler test failures

## References

- Architecture Spec: `feature_planning_docs/Full-System-Design/10-Foundational Architecture.md`
- Phase 2 Plan: `.agent_planning/foundational-architecture/PLAN-2025-12-18-130106.md`
- Phase 2 DOD: `.agent_planning/foundational-architecture/DOD-2025-12-18-130106.md`
