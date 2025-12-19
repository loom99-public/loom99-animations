# Engineering Phase Plans

**Created**: 2025-12-19
**Source**: Full System Design documents in `.agent_planning/full-system-design/`

---

## Overview

This directory contains implementation plans for each engineering phase of the Loom animation editor. Plans are derived from the Full System Design documentation and cross-referenced with current implementation status.

---

## Phase Status Summary

| Phase | Name | Status | Completion | Priority |
|-------|------|--------|------------|----------|
| 0 | Lock Invariants | **COMPLETE** | 100% | - |
| 1 | Bus-Aware Compiler Core | **COMPLETE** | 100% | - |
| 2 | Lazy Field Foundation | **COMPLETE** | 100% | - |
| 3 | Phase & Loop Primitives | **IN PROGRESS** | 80% | HIGH |
| 4 | Runtime Safety & Live Editing | **IN PROGRESS** | 30% | HIGH |
| 5 | Bus Board UI | **PARTIAL** | 60% | MEDIUM |
| 6 | Phase-Centric UX Polish | **NOT STARTED** | 0% | MEDIUM |
| 7 | Composites & Reuse | **PARTIAL** | 40% | LOW |
| 8 | First Release Polish | **NOT STARTED** | 0% | LOW |

---

## Document Index

| File | Status | Description |
|------|--------|-------------|
| `STATUS-2025-12-19.md` | Reference | Comprehensive status assessment |
| `PHASE-0-core-invariants.md` | COMPLETE | TimeCtx, Signal/Field, buses, domains |
| `PHASE-1-bus-aware-compiler.md` | COMPLETE | Dependency graph, bus compilation |
| `PHASE-2-lazy-fields.md` | COMPLETE | FieldExpr DAG, domain abstraction |
| `PHASE-3-phase-loop-primitives.md` | 80% | Phase blocks, warping, quantization |
| `PHASE-4-runtime-safety.md` | 30% | Hot-swap, state mapping, error isolation |
| `PHASE-5-bus-board-ui.md` | 60% | Publisher ordering, lens editor |
| `PHASE-6-phase-ux.md` | 0% | Phase visualization, modes, tutorials |
| `PHASE-7-composites.md` | 40% | Composite authoring, introspection |
| `PHASE-8-release-polish.md` | 0% | Templates, instruments, documentation |

---

## Recommended Work Order

### Immediate (Phase 3 Completion)
1. Add PhaseWarp block for speed modulation
2. Add PhaseQuantize block for stepped motion
3. Add PhaseFold block for pingPong behavior
4. Create multi-scale phase demo patch

### Short-term (Phase 4)
1. Implement program compatibility signatures
2. Build state mapping for hot-swap
3. Add output crossfade fallback
4. Implement per-sink error isolation

### Medium-term (Phase 5-6)
1. Publisher inspection panel
2. Lens stack editor
3. Phase ring visualization
4. Transport mode switching

### Long-term (Phase 7-8)
1. Composite authoring UI
2. Default patch templates
3. Starter instruments
4. Tutorial system

---

## Key Metrics

From exploration assessment (2025-12-19):

- **Lines of Code**: 16,028
- **Test Coverage**: 386 tests passing
- **Primitives**: 13 canonical
- **Composites**: 9 defined
- **Default Buses**: 5 (phaseA, phaseB, energy, pulse, palette)
- **Lens Types**: 7 (12 presets)
- **Demo Patches**: 1 (breathing-dots)

---

## Reference Documents

The source of truth for all phase work is in `.agent_planning/full-system-design/`:

- `00-core-invariants.md` - Non-negotiable system truths
- `01-time-and-phase.md` - Phase theory
- `02-signals.md` - Signal evaluation model
- `03-fields.md` - Lazy Field semantics
- `04-buses.md` - Bus architecture
- `05-lenses.md` - Perception stacks
- `06-compiler-runtime.md` - Compilation pipeline
- `07-live-editing.md` - Hot-swap model
- `08-ui-detail.md` - UI specifications
- `09-ux-philosophy.md` - UX principles
- `10-canonical-primitives.md` - Block specifications
- `11-starter-composites.md` - Composite library
- `12-risks-mitigations.md` - Failure modes
- `13-engineering-phases.md` - Phase definitions

---

## How to Use These Plans

1. **For implementation**: Read the relevant phase document, then the referenced full-system-design docs
2. **For status checks**: Start with `STATUS-2025-12-19.md`
3. **For prioritization**: See "Recommended Work Order" above
4. **For context**: Read the corresponding full-system-design topic document
