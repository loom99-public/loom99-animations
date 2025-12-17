# Compiler Architecture

## Current Implementation (Wire-Only)
- **File**: `src/editor/compiler/compile.ts`
- **Pattern**: Single-pass DAG traversal
- **Steps**:
  1. Validate block types
  2. Build connection indices
  3. Type-check connections
  4. Topological sort
  5. Compile blocks in order
  6. Return RenderTreeProgram

## Bus-Aware Requirements (Phase 2)
- **File**: `src/editor/compiler/types-bus.ts` (types defined, implementation missing)
- **Pattern**: Multi-pass compilation with bus artifacts
- **New Components**:
  - DependencyGraph with BusValue nodes
  - FieldExpr system for lazy evaluation
  - Adapter chains for type conversion
  - SCC detection for feedback loops
  - Bus compilation and combination

## Key Types
- `Artifact`: Scalar | Field | Signal | Program | Spec | Error
- `BusAwareCompilerPatch`: Extends CompilerPatch with buses, publishers, listeners
- `FieldExpr<T>`: AST for lazy field evaluation
- `DependencyGraph`: Graph nodes and edges for compilation order

Last Updated: 2025-12-15