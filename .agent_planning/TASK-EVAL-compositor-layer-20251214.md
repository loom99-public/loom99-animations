# Task Evaluation: Compositor Layer Implementation
Generated: 2025-12-14-021900
Task Focus: feature_planning_docs/to-verify/future-work/1-compositor-layer.md
Evaluator: project-evaluator
Git Commit: a439129

## Summary

The Compositor Layer specification defines a **first-class compositor architecture** where compositors are Program→Program transformations that can be stacked and composed. The codebase has **excellent foundational work** (RenderTree, Program, Effects) but is **missing the middleware layer** (Selection API, TreeRewrite utilities, Compositor interface). The spec documents provide complete, implementable reference code.

## Current State

### What Exists

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| RenderTree model | ✅ EXISTS | `editor/runtime/renderTree.ts`, `anim-v4/render/tree.ts` | Two compatible versions |
| DrawNode types | ✅ EXISTS | Both locations | GroupNode, ShapeNode, EffectNode patterns |
| Effect types | ⚠️ PARTIAL | Distributed across models | OpacityMul, Transform2D/3D, Filter, Clip, Deform exist |
| Program<T> type | ✅ EXISTS | `anim-v4/core/types.ts`, `editor/compiler/types.ts` | Matches spec exactly |
| V4 kernel primitives | ✅ EXISTS | `anim-v4/core/` | Signal, Field, PhaseMachine, Seed, Env |
| GeometryCache | ✅ EXISTS | `editor/compiler/types.ts` | get/invalidate pattern |
| Basic tree utilities | ✅ EXISTS | `anim-v4/render/tree.ts` | mapNodes, findNode, flattenNodes |
| Style/Bounds types | ✅ EXISTS | Both render locations | Comprehensive style properties |

### What's Missing

| Component | Required by Spec | Current Status | Impact |
|-----------|------------------|----------------|--------|
| Selector API | Section 2 (lines 181-196) | ❌ NOT IMPLEMENTED | Cannot target nodes for effects |
| Selection type | Section 2 | ❌ NOT IMPLEMENTED | Cannot resolve selection paths |
| TreeRewrite utilities | Section 4 (lines 225-231) | ❌ NOT IN CODE (spec only) | Cannot safely modify tree |
| Compositor interface | Section 3 (lines 204-214) | ❌ NOT IMPLEMENTED | No Program→Program transform |
| CompositorSpecBase | Section 5 (lines 239-246) | ❌ NOT IMPLEMENTED | No standardized compositor spec |
| composeProgram stack | Section 6 (lines 427-433) | ❌ NOT IMPLEMENTED | Cannot stack compositors |
| Transform3DCompositor | Reference impl (lines 283-372) | ⚠️ EXISTS AS ARCHETYPE ONLY | Not composable with other programs |

### What Needs Changes

| Item | Current State | Required State |
|------|---------------|----------------|
| Transform3D animation | Standalone archetype | Also available as compositor |
| Effect types | Split across two models | Consolidated or mapped |
| TreeRewrite | Spec document only | Integrated into anim-v4/core |
| Selection API | Not present | New file in anim-v4/core |
| Compositor interface | Not present | New file in anim-v4/core |

## Relevant Files

| File | Purpose | Status |
|------|---------|--------|
| `gallery/src/anim-v4/core/types.ts` | V4 kernel types | EXISTS - needs minor extension |
| `gallery/src/anim-v4/render/tree.ts` | RenderTree model | EXISTS |
| `gallery/src/editor/runtime/renderTree.ts` | Editor RenderTree | EXISTS - more semantic effects |
| `gallery/src/anim-v4/core/compositor.ts` | Compositor interface | MISSING |
| `gallery/src/anim-v4/core/selection.ts` | Selection API | MISSING |
| `gallery/src/anim-v4/core/treeRewrite.ts` | TreeRewrite utilities | MISSING |
| `gallery/src/anim-v4/compositors/` | Compositor implementations | DIRECTORY MISSING |
| `feature_planning_docs/to-verify/future-work/2-compositor-treerewrite.md` | TreeRewrite spec | EXISTS - implementable reference |
| `feature_planning_docs/to-verify/future-work/3-compositor-3d.md` | Transform3D compositor spec | EXISTS |

## Dependencies

### Internal Dependencies
- RenderTree model must be stable ✅
- Program<T> type must match spec ✅
- V4 kernel primitives (Field, PhaseMachine, Seed) ✅

### External Dependencies
- None - this is core infrastructure

### Blocked By
- Nothing - can proceed immediately

### Blocks
- Any future compositor implementation
- Wave/Ripple compositor
- Mask/Reveal compositor
- Glow compositor
- Stacked effect animations

## Risks and Concerns

### Risk 1: Two RenderTree Models
**Description**: Editor (`editor/runtime/renderTree.ts`) and V4 (`anim-v4/render/tree.ts`) have different RenderTree models.
**Impact**: Medium - may cause confusion about which to use
**Mitigation**:
- Document which is canonical (recommend editor's semantic version for compositors)
- Create mapping functions if needed
- Consider consolidating in future

### Risk 2: Effect Type Distribution
**Description**: Effect types are distributed (Transform2D in one place, ColorMatrix implied in filters)
**Impact**: Low - existing patterns work, just need documentation
**Mitigation**:
- Use Effect union from editor/runtime/renderTree.ts as canonical
- Add missing types (explicit ColorMatrix, Glow, Custom) if needed

### Risk 3: TreeRewrite Performance
**Description**: Naive tree traversal on large trees could be slow
**Impact**: Low - spec includes caching strategy
**Mitigation**:
- Use GeometryCache for selection resolution
- Path-based lookups are O(depth), not O(nodes)
- Spec's approach is already optimized

### Risk 4: Transform3D Refactor Scope
**Description**: Changing Transform3D from archetype to compositor might break existing usage
**Impact**: Medium - transform3d animations exist
**Mitigation**:
- Keep archetype as convenience wrapper over compositor
- Don't remove existing API, extend it
- Test existing animations after refactor

## Ambiguities

### Resolved (during this evaluation)
- **Q: Is RenderTree well-defined?** A: Yes, two compatible models exist, either works
- **Q: Are kernel primitives present?** A: Yes, Program, Field, PhaseMachine all match spec
- **Q: Is spec implementable?** A: Yes, spec doc 2-compositor-treerewrite.md provides complete reference code

### Deferred (not blocking this sprint)
- **Q: Should Effect types be consolidated?** Can defer - current distribution works
- **Q: Should there be one canonical RenderTree?** Can defer - both work
- **Q: How should compositors integrate with editor UI?** Future concern - get backend working first

### Blocking (if any remain)
- None - clear path forward

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| RenderTree model | FRESH | Just searched and verified |
| Effect types | FRESH | Just enumerated all types |
| Missing Selection API | FRESH | Confirmed not in codebase |
| Missing TreeRewrite | FRESH | Only in spec docs |
| Missing Compositor interface | FRESH | Confirmed not in codebase |
| Spec quality | FRESH | Reviewed - complete with reference impl |

## Implementation Readiness Assessment

| Layer | Readiness | Notes |
|-------|-----------|-------|
| Core kernel | 90% | Minor RuntimeCtx extension needed |
| RenderTree model | 80% | Works, consider effect consolidation later |
| Selection/TreeRewrite | 10% | Spec exists, code doesn't |
| Compositor interface | 0% | Not implemented |
| Transform3DCompositor | 20% | Archetype exists, needs compositor version |
| Overall | ~35% | Foundation excellent, middleware missing |

## Gap Analysis

### Spec Section → Implementation Status

| Spec Section | Description | Status |
|--------------|-------------|--------|
| 1) Render tree model | DrawNode types, Effect types | ✅ EXISTS |
| 2) Selection API | Selector, Selection types | ❌ MISSING |
| 3) Compositor interface | apply() signature | ❌ MISSING |
| 4) TreeRewrite contract | select, wrapAt, getAt | ❌ MISSING (spec doc exists) |
| 5) CompositorSpecBase | selector, order fields | ❌ MISSING |
| 6) Compositor stacks | composeProgram | ❌ MISSING |
| 7) Purity guarantees | Determinism, scrubability | ✅ V4 kernel enforces |
| 8) Bounds utilities | BoundsResolver, caching | ⚠️ GeometryCache exists, bounds resolution missing |

### Critical Path

```
[1] Implement TreeRewrite    → [2] Implement Selection API
         ↓                              ↓
[3] Define Compositor interface ←──────┘
         ↓
[4] Implement composeProgram (stacking)
         ↓
[5] Convert Transform3D to compositor
         ↓
[6] Additional compositors (Mask, Glow, Deform)
```

## Estimated Complexity

| Phase | Description | Complexity | Notes |
|-------|-------------|------------|-------|
| Phase 1 | TreeRewrite utilities | Low | ~200 lines, pure structural code, spec provides reference |
| Phase 2 | Selection API | Low | ~100 lines, type definitions + resolution |
| Phase 3 | Compositor interface | Low | ~50 lines, interface + stacking function |
| Phase 4 | Transform3DCompositor | Medium | ~300 lines, adapt existing archetype code |
| Phase 5 | Effect consolidation | Low | ~100 lines, add missing explicit types |
| Phase 6 | Additional compositors | Varies | Per-compositor, some easy (Glow), some complex (Deform) |

## Evaluation Result

**Status**: CONTINUE

**Reason**:
- Foundation is excellent (RenderTree, Program, V4 kernel all solid)
- Spec documents provide complete, implementable reference code
- No blocking ambiguities
- Clear path forward with well-defined phases
- Low-risk incremental implementation possible

**Ready for planning**: YES

## Recommended Next Steps

1. **Immediate**: Create `anim-v4/core/treeRewrite.ts` - transcribe utilities from spec doc
2. **Immediate**: Create `anim-v4/core/selection.ts` - implement Selector/Selection types
3. **Immediate**: Create `anim-v4/core/compositor.ts` - define Compositor interface
4. **Then**: Implement Transform3DCompositor as proof-of-concept
5. **Then**: Add tests for compositor stacking
6. **Future**: Additional compositors as needed

## Appendix: Key File Locations

### Existing (Foundation)
- `/gallery/src/anim-v4/core/types.ts` - Program, Signal, Field, PhaseMachine
- `/gallery/src/anim-v4/render/tree.ts` - RenderTree, RenderNode, Style, FilterDef
- `/gallery/src/editor/runtime/renderTree.ts` - Semantic DrawNode, Effect types
- `/gallery/src/editor/compiler/types.ts` - GeometryCache, RuntimeCtx, CompileCtx

### To Create (Middleware)
- `/gallery/src/anim-v4/core/treeRewrite.ts` - traverse, getAt, replaceAt, wrapAt
- `/gallery/src/anim-v4/core/selection.ts` - Selector, Selection, select()
- `/gallery/src/anim-v4/core/compositor.ts` - Compositor<Spec>, ComposeCtx, composeProgram
- `/gallery/src/anim-v4/compositors/transform3d.ts` - Transform3DCompositor

### Specification Documents (Reference)
- `/feature_planning_docs/to-verify/future-work/1-compositor-layer.md` - Main spec
- `/feature_planning_docs/to-verify/future-work/2-compositor-treerewrite.md` - TreeRewrite reference impl
- `/feature_planning_docs/to-verify/future-work/3-compositor-3d.md` - Transform3D compositor spec
