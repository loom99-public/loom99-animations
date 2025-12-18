# PLAN: Fix Composite Test Issues

**Created**: 2025-12-17
**Target**: Test system reliability
**Status**: Draft

## Problem Analysis

Two tests are failing due to incomplete integration of the composite block system:

### 1. `composites.test.ts` - Registry Integration Issue
**Error**: `expect(allBlocks.some((b) => b.type === \`composite:${def.id}\`)).toBe(true)` fails

**Root Cause**:
- `getBlockDefinitions()` in `registry.ts` explicitly excludes composites due to circular dependency concerns (lines 54-60)
- Composite definitions are registered in `composites.ts` but not integrated into the main block registry
- The test expects composite blocks to appear as block definitions with `composite:` prefix

### 2. `composite.expansion.test.ts` - Compiler Registration Issue
**Error**: "No compiler registered for block type 'composite:comp-scale-index'"

**Root Cause**:
- Composite definitions are created but no compiler is registered for the `composite:` block type
- The compiler registry (`compiler/blocks/index.ts`) only includes static block definitions
- `expandComposites()` in `integration.ts` looks for `primitiveGraph` but composites use a different graph format
- Missing integration between the `composites.ts` system and the compiler system

## Key Findings

### Existing Composite Infrastructure
1. **`composites.ts`**: Complete composite definition and registration system
2. **Block Integration**: Some blocks already have `primitiveGraph` (found in `fields.ts`)
3. **Compiler System**: `createBlockRegistry()` supports dynamic registration via `registerDynamicBlock()`
4. **Expansion Logic**: `expandComposites()` exists but expects `primitiveGraph` on block definitions

### Missing Pieces
1. **Bridge Functions**: No integration between `composites.ts` and `getBlockDefinitions()`
2. **Compiler Registration**: No automatic registration of composite block compilers
3. **Graph Format Conversion**: Composite `CompositeGraph` format ≠ expected `primitiveGraph` format
4. **Test Environment**: Tests don't properly set up the composite integration

## Implementation Strategy

### Phase 1: Create Composite Integration Layer

#### 1.1 Composite Bridge Module (`composite-bridge.ts`)
Create a new module to integrate composites with existing systems:

```typescript
// Convert CompositeDefinition to BlockDefinition
export function compositeToBlockDefinition(def: CompositeDefinition): BlockDefinition

// Convert CompositeGraph to primitiveGraph format
export function compositeToPrimitiveGraph(graph: CompositeGraph): CompoundGraph

// Create block compiler for composite
export function createCompositeCompiler(def: CompositeDefinition): BlockCompiler
```

#### 1.2 Enhanced Registry Functions
Update `registry.ts` to include composites safely:

```typescript
export function getBlockDefinitions(includeComposites: boolean = false): readonly BlockDefinition[]

// Separate function to avoid circular deps
export function getCompositeBlockDefinitions(): readonly BlockDefinition[]
```

#### 1.3 Composite Compiler Registration
Integrate with compiler registry:

```typescript
// In compiler/blocks/index.ts
export function registerCompositeBlock(def: CompositeDefinition): void
export function createCompositeBlockRegistry(): BlockRegistry // includes composites
```

### Phase 2: Fix Graph Format Mismatch

#### 2.1 Composite Graph Converter
Convert `CompositeGraph` to `CompoundGraph` format:

```typescript
interface CompositeGraph {
  nodes: Record<string, { type: string; params?: Record<string, unknown> }>;
  edges: readonly { from: string; to: string }[];
  inputMap: Record<string, string>;
  outputMap: Record<string, string>;
}

interface CompoundGraph {
  nodes: Record<string, { type: string; params?: Record<string, unknown> }>;
  edges: readonly { from: string; to: string }[];
  inputMap: Record<string, string>;
  outputMap: Record<string, string>;
}
```

*Note: The formats are actually compatible! Just need type conversion.*

#### 2.2 Update Expansion Logic
Modify `expandComposites()` to handle composite blocks:

```typescript
function expandComposites(patch: CompilerPatch): CompilerPatch {
  // Handle both primitiveGraph and composite blocks
  // Check for composite: prefix and convert to primitiveGraph
}
```

### Phase 3: Test Environment Setup

#### 3.1 Test Helper Functions
Create test utilities for composite testing:

```typescript
// test-utils/composite-test-helpers.ts
export function setupTestCompositeEnvironment(): {
  store: RootStore;
  compiler: CompilerService;
}

export function registerTestComposite(def: CompositeDefinition): void
```

#### 3.2 Fix Test Imports and Setup
Update tests to properly initialize composite system:

```typescript
// Before test runs:
import { setupTestCompositeEnvironment } from '../test-utils/composite-test-helpers';

// In test:
const { store, compiler } = setupTestCompositeEnvironment();
```

### Phase 4: Integration Points

#### 4.1 Update Integration Service
Modify `integration.ts` to auto-register composites:

```typescript
export function createCompilerService(store: RootStore): CompilerService {
  const registry = createBlockRegistry();

  // Auto-register all composites
  for (const composite of listCompositeDefinitions()) {
    registerCompositeBlock(composite);
  }

  // ... rest of function
}
```

#### 4.2 Block Library Integration
Ensure BlockLibrary shows composites when registered:

```typescript
// BlockLibrary.tsx - update to include composite blocks
const allBlocks = useMemo(() => {
  const baseBlocks = getBlockDefinitions(true); // include composites
  const compositeDefs = listCompositeDefinitions().map(compositeToBlockDefinition);
  return [...baseBlocks, ...compositeDefs];
}, []);
```

## Implementation Order

1. **Phase 1**: Create bridge functions (composite-bridge.ts)
2. **Phase 2**: Fix registry integration (registry.ts updates)
3. **Phase 3**: Create composite compiler registration
4. **Phase 4**: Update expansion logic to handle composites
5. **Phase 5**: Fix test environment and tests
6. **Phase 6**: Verify integration works end-to-end

## Files to Create/Modify

### New Files
- `src/editor/composite-bridge.ts` - Integration layer
- `src/editor/test-utils/composite-test-helpers.ts` - Test utilities

### Modified Files
- `src/editor/blocks/registry.ts` - Include composites
- `src/editor/compiler/blocks/index.ts` - Dynamic composite registration
- `src/editor/compiler/integration.ts` - Handle composite expansion
- `src/editor/__tests__/composites.test.ts` - Fix test setup
- `src/editor/__tests__/composite.expansion.test.ts` - Fix test setup

## Risk Assessment

**Low Risk**:
- Changes are additive and backward compatible
- Existing functionality preserved
- Clear separation of concerns

**Medium Risk**:
- Test environment changes might affect other tests
- Composite graph format conversion needs careful testing

**Mitigation Strategy**:
- Implement incrementally with tests at each phase
- Preserve existing function signatures with new optional parameters
- Add comprehensive integration tests
- Keep composite integration optional/opt-in initially

## Success Criteria

1. ✅ Both failing tests pass consistently
2. ✅ Composite blocks appear in `getBlockDefinitions(includeComposites: true)`
3. ✅ Composite blocks compile and expand correctly
4. ✅ No regressions in existing functionality
5. ✅ Integration is clean and maintainable

## Next Steps

1. Create `PLAN-test-fixes.md` (this document)
2. Create `DOD-test-fixes.md` with detailed acceptance criteria
3. Implement Phase 1 (composite bridge functions)
4. Progress through remaining phases incrementally
5. Verify test fixes and integration success