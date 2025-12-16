/**
 * Bus-Aware Compiler Types
 *
 * Extensions to the base compiler types to support buses as first-class
 * graph nodes in Phase 2 compilation.
 */

import type { Artifact, BlockId, PortType } from './types';
import type { Bus, Publisher, Listener } from '../types';

// =============================================================================
// Bus-Aware Patch Data Model
// =============================================================================

/**
 * Extended CompilerPatch with bus support.
 * Maintains backward compatibility with existing wire-only patches.
 */
export interface BusAwareCompilerPatch {
  blocks: Map<BlockId, any>; // BlockInstance
  connections: readonly any[]; // CompilerConnection[]
  output?: { blockId: BlockId; port: string };

  // Bus-related additions
  buses: Bus[];
  publishers: Publisher[];
  listeners: Listener[];
}

// =============================================================================
// Dependency Graph Types
// =============================================================================

/**
 * Graph node identifiers for bus-aware compilation.
 */
export type GraphNode =
  | { type: 'BlockOut'; blockId: BlockId; port: string }
  | { type: 'BusValue'; busId: string };

/**
 * Graph edges representing different connection types.
 */
export type GraphEdge =
  | { type: 'Wire'; from: GraphNode; to: GraphNode }
  | { type: 'Publisher'; from: GraphNode; to: { type: 'BusValue'; busId: string } }
  | { type: 'Listener'; from: { type: 'BusValue'; busId: string }; to: GraphNode };

/**
 * Dependency graph representation with bidirectional navigation.
 */
export interface DependencyGraph {
  /** All nodes in the graph */
  nodes: Map<string, GraphNode>;

  /** All edges in the graph */
  edges: GraphEdge[];

  /** Forward adjacency: node -> outgoing edges */
  adjacency: Map<string, GraphEdge[]>;

  /** Reverse adjacency: node -> incoming edges */
  reverseAdjacency: Map<string, GraphEdge[]>;

  /** Bus publishers: busId -> publisher edges */
  busPublishers: Map<string, GraphEdge[]>;

  /** Bus listeners: busId -> listener edges */
  busListeners: Map<string, GraphEdge[]>;
}

// =============================================================================
// Field Expression System (Lazy Evaluation)
// =============================================================================

/**
 * FieldExpr AST for lazy field evaluation.
 * Enables zero-copy bus combination and optimization.
 */
export type FieldExpr<T> =
  | { kind: 'const'; value: T }
  | {
      kind: 'map';
      src: FieldExpr<any>;
      fnId: string;
      params?: Record<string, unknown>
    }
  | {
      kind: 'zip';
      a: FieldExpr<any>;
      b: FieldExpr<any>;
      fnId: string;
      params?: Record<string, unknown>
    }
  | { kind: 'source'; blockId: string; port: string }
  | {
      kind: 'bus';
      busId: string;
      publishers: FieldExpr<any>[];
      combineMode: string;
    }
  | {
      kind: 'adapter';
      src: FieldExpr<any>;
      adapterId: string;
      params: Record<string, unknown>
    };

/**
 * Field expression evaluator context.
 */
export interface FieldExprCtx {
  /** Source artifacts for expression evaluation */
  artifacts: Map<string, Artifact>;

  /** Bus artifacts for bus expressions */
  busArtifacts: Map<string, Artifact>;

  /** Memoization cache for repeated evaluation */
  memoCache: Map<string, readonly unknown[]>;
}

// =============================================================================
// Adapter System Types
// =============================================================================

/**
 * Adapter interface for type conversions.
 */
export interface Adapter {
  /** Unique adapter identifier */
  id: string;

  /** Source type descriptor */
  from: PortType;

  /** Target type descriptor */
  to: PortType;

  /** Compilation function */
  compile: (artifact: Artifact, params: Record<string, unknown>) => Artifact;

  /** Whether this adapter is computationally expensive */
  heavy?: boolean;
}

/**
 * Adapter registry for type conversion discovery.
 */
export type AdapterRegistry = Record<string, Adapter>;

/**
 * Adapter chain step with validation metadata.
 */
export interface AdapterStep {
  adapterId: string;
  params: Record<string, unknown>;
  from: PortType;
  to: PortType;
}

// =============================================================================
// SCC Detection Types
// =============================================================================

/**
 * Strongly Connected Component (SCC) for feedback loop detection.
 */
export interface StronglyConnectedComponent {
  /** Nodes in this component */
  nodes: GraphNode[];

  /** Whether this component contains a memory block */
  hasMemoryBlock: boolean;

  /** Memory blocks found in this component */
  memoryBlocks: string[];
}

/**
 * Memory block registry for feedback loop validation.
 */
export interface MemoryBlockRegistry {
  /** Set of block types that break causality */
  memoryTypes: Set<string>;

  /** Check if a block type is a memory block */
  isMemoryBlock: (blockType: string) => boolean;
}

// =============================================================================
// Bus Compilation Context
// =============================================================================

/**
 * Extended compilation context for bus-aware compilation.
 */
export interface BusCompileCtx {
  /** Bus artifacts cache */
  busArtifacts: Map<string, Artifact>;

  /** Adapter registry */
  adapters: AdapterRegistry;

  /** Memory block registry */
  memoryBlocks: MemoryBlockRegistry;

  /** Compilation errors collected during process */
  errors: any[];

  /** Dependency graph for validation */
  graph?: DependencyGraph;
}

// =============================================================================
// Compilation Result Extensions
// =============================================================================

/**
 * Extended compilation result with bus metadata.
 */
export interface BusCompileResult {
  ok: boolean;
  program?: any; // Program<RenderTree>
  errors: readonly any[];

  // Bus-specific additions
  compiledPortMap?: Map<string, Artifact>;
  busArtifacts?: Map<string, Artifact>;
  dependencyGraph?: DependencyGraph;
  sccs?: StronglyConnectedComponent[];
}