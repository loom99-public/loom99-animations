# DOD: Test Fixes - Definition of Done

**Created**: 2025-12-17
**Target**: Composite test system reliability
**Status**: Draft

## Overview

This document defines the acceptance criteria for fixing the failing composite test issues. The work is complete when all criteria are satisfied.

## Primary Success Criteria

### 1. Test Pass Requirements

**MUST HAVE**:
- ✅ `composites.test.ts` passes: `registers and exposes composite definitions as block definitions`
- ✅ `composite.expansion.test.ts` passes: `expands composite graph and passes params into internal nodes`
- ✅ Tests pass in isolation: `pnpm test src/editor/__tests__/composites.test.ts`
- ✅ Tests pass in isolation: `pnpm test src/editor/__tests__/composite.expansion.test.ts`
- ✅ Tests pass together: `pnpm test src/editor/__tests__/composite*.test.ts`
- ✅ No regressions: `pnpm test src/editor/__tests__/` (all editor tests pass)

### 2. Functional Requirements

**Composite Registry Integration**:
- ✅ `registerComposite()` correctly registers composite definitions
- ✅ `listCompositeDefinitions()` returns all registered composites
- ✅ `getBlockDefinitions(true)` includes composite blocks with `composite:` prefix
- ✅ `getBlockDefinition('composite:test-id')` returns the correct block definition
- ✅ Composite block definitions have correct structure (inputs, outputs, params)

**Compiler Integration**:
- ✅ `createCompilerService()` auto-registers all composite block compilers
- ✅ Composite blocks compile without "No compiler registered" errors
- ✅ `expandComposites()` correctly expands composite graphs into internal nodes
- ✅ Parameter passing (`__fromParam`) works correctly from composite to internal blocks
- ✅ Input/output mapping works correctly for external connections

**Graph Expansion**:
- ✅ Composite `CompositeGraph` format converts to expected `CompoundGraph` format
- ✅ Internal nodes are created with correct IDs (prefixed to avoid conflicts)
- ✅ Internal edges are created correctly between internal nodes
- ✅ External connections are rewired to exposed input/output ports correctly
- ✅ Expansion handles nested composites (composites within composites)

## Technical Implementation Requirements

### 3. Code Quality Standards

**MUST HAVE**:
- ✅ No TypeScript compilation errors
- ✅ All new code follows existing code style (ESLint passes)
- ✅ Proper error handling for malformed composite definitions
- ✅ Clear documentation for new integration functions
- ✅ Tests for new integration functions

**SHOULD HAVE**:
- ✅ Backward compatibility maintained (existing code unchanged)
- ✅ Clean separation between composite system and existing block system
- ✅ Minimal performance impact for non-composite use cases
- ✅ Clear error messages for composite-related failures

### 4. Integration Requirements

**Test Environment**:
- ✅ Test isolation maintained (tests don't interfere with each other)
- ✅ Clean test setup/teardown (composites don't leak between tests)
- ✅ Test utilities are reusable and well-documented

**Production Integration**:
- ✅ Composite integration works in actual editor (not just tests)
- ✅ BlockLibrary displays composite blocks when registered
- ✅ Composite blocks can be dragged into lanes
- ✅ Inspector shows composite parameters correctly

## Verification Criteria

### 5. Manual Testing Checklist

**Basic Composite Creation**:
- [ ] Register a composite definition
- [ ] Verify it appears in block registry
- [ ] Add composite to patch
- [ ] Connect inputs/outputs
- [ ] Compile successfully
- [ ] Verify expanded graph matches expected structure

**Parameter Passing**:
- [ ] Create composite with parameters
- [ ] Set parameter values in editor
- [ ] Verify values pass correctly to internal blocks
- [ ] Test with different parameter types (number, string, boolean)

**Error Handling**:
- [ ] Test with malformed composite definition
- [ ] Test with invalid internal block types
- [ ] Test with circular dependencies
- [ ] Verify clear error messages provided

### 6. Performance Criteria

**MUST NOT EXCEED**:
- ✅ Test suite run time increases by < 100ms
- ✅ Compilation time for simple patches increases by < 10%
- ✅ Memory usage increase < 1MB for typical usage

## Files and Changes Required

### 7. Implementation Artifacts

**New Files**:
- [ ] `src/editor/composite-bridge.ts` - Core integration functions
- [ ] `src/editor/test-utils/composite-test-helpers.ts` - Test utilities
- [ ] Updated type definitions if needed

**Modified Files**:
- [ ] `src/editor/blocks/registry.ts` - Add composite integration
- [ ] `src/editor/compiler/blocks/index.ts` - Add dynamic composite registration
- [ ] `src/editor/compiler/integration.ts` - Update expansion logic
- [ ] `src/editor/__tests__/composites.test.ts` - Fix test
- [ ] `src/editor/__tests__/composite.expansion.test.ts` - Fix test

**Documentation Updates**:
- [ ] Update comments in modified files
- [ ] Document new integration approach
- [ ] Update CLAUDE.md if needed

## Testing Requirements

### 8. Automated Test Coverage

**Unit Tests**:
- [ ] `compositeToBlockDefinition()` function tests
- [ ] `compositeToPrimitiveGraph()` function tests
- [ ] `createCompositeCompiler()` function tests
- [ ] Edge case handling tests

**Integration Tests**:
- [ ] End-to-end composite creation and compilation
- [ ] Parameter passing integration tests
- [ ] Error handling integration tests
- [ ] Performance regression tests

**Test Quality**:
- [ ] All tests pass in isolation
- [ ] All tests pass together
- [ ] No flaky tests
- [ ] Clear test descriptions and assertions

## Acceptance Process

### 9. Definition of Done Checklist

**Code Review**:
- [ ] All changes reviewed for correctness
- [ ] Code style guidelines followed
- [ ] No obvious performance issues
- [ ] Error handling comprehensive

**Testing**:
- [ ] All automated tests pass
- [ ] Manual testing completed
- [ ] Performance criteria met
- [ ] No regressions identified

**Documentation**:
- [ ] New code documented
- [ ] Changes explained
- [ ] Usage examples provided

### 10. Final Sign-off Criteria

**Complete When**:
1. ✅ Both target tests pass consistently
2. ✅ All other editor tests still pass (no regressions)
3. ✅ Composite system works end-to-end in editor
4. ✅ Code quality standards met
5. ✅ Documentation updated
6. ✅ Performance impact acceptable

**Verification Steps**:
```bash
# Run target tests in isolation
pnpm test src/editor/__tests__/composites.test.ts
pnpm test src/editor/__tests__/composite.expansion.test.ts

# Run all editor tests
pnpm test src/editor/__tests__/

# Verify editor functionality (manual)
# 1. Start dev server
# 2. Create composite in editor
# 3. Verify compilation works
# 4. Check no regressions
```

## Risk Mitigation

### 11. Rollback Plan

**If Issues Arise**:
- Changes are isolated and additive
- Can disable composite integration with feature flag
- Existing functionality preserved
- Clear revert path available

**Monitoring**:
- Test suite run times tracked
- Compilation performance monitored
- Error rates for composite compilation tracked

---

## Sign-off

**Developer**: _________________ **Date**: ___________

**Reviewer**: _________________ **Date**: ___________

**QA**: _________________ **Date**: ___________