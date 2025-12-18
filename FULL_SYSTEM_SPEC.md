# Full System Specification - Foundational Architecture

**Initiative**: Foundational Architecture Revision
**Started**: 2025-01-18
**Status**: In Progress - Phase 1 Complete

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

### Phase 1: Foundation (COMPLETE)

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
  - [ ] Integrate block (future)
  - [ ] History block (future)
- [x] Testing infrastructure
  - [x] UnifiedCompiler tests (8 tests)
  - [x] DependencyGraph tests (13 tests)
  - [x] TimeCtx tests (8 tests)
  - [x] All legacy tests continue to pass (174 total tests)

**Phase 1 Completion Date**: 2025-12-18

### Phase 2: Block Migration (Future)

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

### Phase 3: Advanced Features (Future)

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
gallery/src/editor/compiler/integration.ts
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

**Total Test Coverage**: 174 tests passing

## Migration Notes

### For Future Developers

When migrating blocks from legacy to new system:

1. **DO NOT** copy-paste from legacy code
2. **DO** read the block's DOD in `feature_planning_docs/`
3. **DO** implement based on new architecture principles
4. **DO** ensure TimeCtx propagation
5. **DO** validate no implicit state
6. **DO** update this document's Phase 2 checklist

### Common Pitfalls

- Don't use closures that capture mutable state
- Don't read time from anything except TimeCtx
- Don't create hidden loops or timers
- Don't skip bus compilation contract
- Don't ignore state boundary validation
- Don't forget to filter `throughState` edges in topological sort

## Recent Fixes (2025-12-18)

### Test Failures Resolved
1. **TimeCtx mode transition** - Frame counter now resets to 0 when mode changes
2. **State block cycle detection** - `throughState` flag properly set based on source block
3. **Topological sort** - State-delayed edges now filtered to allow legal cycles

### Commits
- `b811126` - fix: resolve unified compiler test failures

## References

- Architecture Spec: `feature_planning_docs/Full-System-Design/10-Foundational Architecture.md`
- Implementation Plan: `.agent_planning/foundational-architecture/PLAN-2025-01-18-165500.md`
- Definition of Done: `.agent_planning/foundational-architecture/DOD-2025-01-18-165500.md`
