/**
 * @file Unified Compiler - Export Module
 * @description Clean implementation of the foundational architecture.
 *
 * This module implements the architectural principles:
 * - System is pure function of (TimeCtx, Patch Definition, Explicit State)
 * - Pull-based evaluation (sinks pull from sources)
 * - Unified dependency graph with cycle detection
 * - Buses as first-class compilation nodes
 * - Explicit state blocks with scrub policies
 */

// Core types and interfaces
export type { TimeCtx, TimeMode } from './TimeCtx';
export { TimeCtxManager, TimeCtxFactory } from './TimeCtx';

export type {
  StateBlock,
  StateShape,
  StateMemory,
  StateFieldDesc,
  ScrubPolicy,
} from './StateBlock';
export { StateBlockRegistry, stateBlockRegistry } from './StateBlock';

export type {
  GraphNode,
  GraphEdge,
  CycleInfo,
} from './DependencyGraph';
export { DependencyGraph } from './DependencyGraph';

export type {
  BlockInstance,
  ConnectionDef,
  BusDef,
  PublisherDef,
  ListenerDef,
  PatchDefinition,
  Evaluator,
  CompiledBlock,
  CompiledBus,
  CompilationResult,
  CompilationError,
} from './UnifiedCompiler';
export { UnifiedCompiler } from './UnifiedCompiler';

// Runtime adapter
export { RuntimeAdapter } from './RuntimeAdapter';

// State blocks
export { DelayBlock, createDelayBlock } from './blocks/DelayBlock';
export { IntegrateBlock, createIntegrateBlock } from './blocks/IntegrateBlock';
export { HistoryBlock, createHistoryBlock } from './blocks/HistoryBlock';

// Domain and FieldExpr system
export type { Domain, ElementId, Topology } from './Domain';
export {
  createSimpleDomain,
  createDomain,
  domainsAreCompatible,
  validateDomainCompatibility,
  DomainMismatchError,
} from './Domain';

export type { FieldExpr, FieldExprKind, FunctionId, FieldExprCtx } from './FieldExpr';
export {
  evaluateFieldExpr,
  batchEvaluateFieldExpr,
  mapFieldExpr,
  zipFieldExpr,
  constFieldExpr,
  sourceFieldExpr,
  getFieldExprDomain,
  functionRegistry,
  FunctionRegistry,
  MemoCache,
  createFieldExprCtx,
} from './FieldExpr';
