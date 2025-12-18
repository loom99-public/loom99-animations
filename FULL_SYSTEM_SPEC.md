# Full System Specification - Foundational Architecture

**Initiative**: Foundational Architecture Revision
**Started**: 2025-01-18
**Status**: In Progress

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

### Phase 1: Foundation (Current)

- [ ] FULL_SYSTEM_SPEC.md created
- [ ] Legacy compiler moved to `compiler/legacy/`
- [ ] UnifiedCompiler implemented from scratch
  - [ ] Dependency graph builder (blocks + buses as nodes)
  - [ ] Cycle detection across all boundaries
  - [ ] Bus compilation contract (Signal buses only for now)
  - [ ] State boundary validation
  - [ ] Stable ordering enforcement
- [ ] TimeCtx integration
  - [ ] TimeCtx interface defined
  - [ ] TimeCtxManager implemented
  - [ ] Runtime converted to pull-based evaluation
  - [ ] TimeCtx propagation through evaluators
- [ ] Initial state blocks
  - [ ] StateShape and ScrubPolicy interfaces
  - [ ] Delay block
  - [ ] Integrate block
  - [ ] History block

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

## Legacy Code Location

Legacy compiler code has been moved to:
```
gallery/src/editor/compiler/legacy/
```

This code is preserved for reference but should NOT be read during reimplementation. The new implementation is based solely on the architecture specification.

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

## Test Strategy

### Existing Tests
All existing tests in `gallery/src/editor/__tests__/` must continue to pass:
- bus-compilation.test.ts
- composite.expansion.test.ts
- composites.test.ts
- bus-name-suggestion.test.ts
- blocks.tags.test.ts

### New Architecture Tests
New tests will be added for:
- UnifiedCompiler dependency graph building
- Cycle detection across boundaries
- TimeCtx propagation
- State block compilation
- Scrub behavior

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

## References

- Architecture Spec: `feature_planning_docs/Full-System-Design/10-Foundational Architecture.md`
- Implementation Plan: `.agent_planning/foundational-architecture/PLAN-2025-01-18-165500.md`
- Definition of Done: `.agent_planning/foundational-architecture/DOD-2025-01-18-165500.md`
