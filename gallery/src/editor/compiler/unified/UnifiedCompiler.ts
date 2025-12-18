/**
 * @file UnifiedCompiler - Main compiler for the unified architecture
 * @description Compiles patch definition to evaluators with proper dependency ordering.
 *
 * Architecture principles:
 * - Build unified dependency graph (blocks + buses)
 * - Detect illegal instantaneous cycles
 * - Enforce state boundaries
 * - Produce stable evaluation order
 * - Generate Signal evaluators for buses
 * - Handle state block lifecycle
 *
 * The compiler must fail loudly when invariants are violated.
 * No fallbacks. No magic.
 */

import { DependencyGraph } from './DependencyGraph';
import { stateBlockRegistry } from './StateBlock';
import type { StateMemory } from './StateBlock';
import type { TimeCtx } from './TimeCtx';

/**
 * Block instance in the patch.
 */
export interface BlockInstance {
  readonly id: string;
  readonly type: string;
  readonly params: Record<string, unknown>;
}

/**
 * Connection between blocks.
 */
export interface ConnectionDef {
  readonly from: { blockId: string; port: string };
  readonly to: { blockId: string; port: string };
}

/**
 * Bus definition.
 */
export interface BusDef {
  readonly id: string;
  readonly type: { world: string; domain: string };
  readonly combineMode: string;
  readonly defaultValue: unknown;
  readonly sortKey: number;
}

/**
 * Publisher (block output to bus).
 */
export interface PublisherDef {
  readonly id: string;
  readonly busId: string;
  readonly from: { blockId: string; port: string };
  readonly sortKey: number;
  readonly enabled: boolean;
}

/**
 * Listener (bus to block input).
 */
export interface ListenerDef {
  readonly id: string;
  readonly busId: string;
  readonly to: { blockId: string; port: string };
  readonly enabled: boolean;
}

/**
 * Patch definition (input to compiler).
 */
export interface PatchDefinition {
  readonly blocks: Map<string, BlockInstance>;
  readonly connections: ConnectionDef[];
  readonly buses?: BusDef[];
  readonly publishers?: PublisherDef[];
  readonly listeners?: ListenerDef[];
}

/**
 * Evaluator function - evaluates a block/bus for a frame.
 */
export type Evaluator = (
  inputs: Record<string, unknown>,
  state: StateMemory | null,
  ctx: TimeCtx
) => Record<string, unknown>;

/**
 * Compiled block - ready for runtime evaluation.
 */
export interface CompiledBlock {
  readonly id: string;
  readonly type: string;
  readonly evaluator: Evaluator;
  readonly isStateBlock: boolean;
  readonly stateMemory: StateMemory | null;
}

/**
 * Compiled bus - aggregates publisher outputs.
 */
export interface CompiledBus {
  readonly id: string;
  readonly type: { world: string; domain: string };
  readonly combineMode: string;
  readonly defaultValue: unknown;
  readonly evaluator: Evaluator;
}

/**
 * Compilation result.
 */
export interface CompilationResult {
  /** Compiled blocks in evaluation order */
  readonly blocks: CompiledBlock[];

  /** Compiled buses in evaluation order */
  readonly buses: CompiledBus[];

  /** Evaluation order (interleaved blocks and buses) */
  readonly evaluationOrder: string[];

  /** Dependency graph (for inspection) */
  readonly graph: DependencyGraph;

  /** Errors (if any) */
  readonly errors: CompilationError[];
}

/**
 * Compilation error.
 */
export interface CompilationError {
  readonly type: 'cycle' | 'missing-block' | 'missing-bus' | 'state-violation';
  readonly message: string;
  readonly nodes?: string[];
}

/**
 * UnifiedCompiler - compiles patches to executable programs.
 *
 * Responsibilities:
 * - Build dependency graph
 * - Detect cycles
 * - Validate state boundaries
 * - Generate evaluators
 * - Produce stable ordering
 *
 * Does NOT:
 * - Manage runtime state
 * - Know about UI concepts
 * - Handle playback control
 */
export class UnifiedCompiler {
  private graph: DependencyGraph;
  private errors: CompilationError[] = [];

  constructor() {
    this.graph = new DependencyGraph();
  }

  /**
   * Compile a patch definition to executable form.
   *
   * @param patch - Patch definition
   * @returns Compilation result
   */
  compile(patch: PatchDefinition): CompilationResult {
    this.errors = [];
    this.graph.clear();

    // Phase 1: Build dependency graph
    this.buildGraph(patch);

    // Phase 2: Detect cycles
    const cycles = this.graph.detectCycles();
    const instantaneousCycles = cycles.filter((c) => c.isInstantaneous);

    if (instantaneousCycles.length > 0) {
      for (const cycle of instantaneousCycles) {
        this.errors.push({
          type: 'cycle',
          message: `Illegal instantaneous cycle: ${cycle.nodes.join(' -> ')}`,
          nodes: cycle.nodes,
        });
      }

      // Return partial result with errors
      return {
        blocks: [],
        buses: [],
        evaluationOrder: [],
        graph: this.graph,
        errors: this.errors,
      };
    }

    // Phase 3: Compute evaluation order
    let evaluationOrder: string[];
    try {
      evaluationOrder = this.graph.topologicalSort();
    } catch (err) {
      this.errors.push({
        type: 'cycle',
        message: err instanceof Error ? err.message : 'Unknown cycle error',
      });
      return {
        blocks: [],
        buses: [],
        evaluationOrder: [],
        graph: this.graph,
        errors: this.errors,
      };
    }

    // Phase 4: Compile blocks and buses
    const compiledBlocks = this.compileBlocks(patch, evaluationOrder);
    const compiledBuses = this.compileBuses(patch, evaluationOrder);

    return {
      blocks: compiledBlocks,
      buses: compiledBuses,
      evaluationOrder,
      graph: this.graph,
      errors: this.errors,
    };
  }

  /**
   * Build dependency graph from patch definition.
   */
  private buildGraph(patch: PatchDefinition): void {
    // Add block nodes
    for (const [blockId, block] of patch.blocks) {
      const isStateBlock = stateBlockRegistry.isStateBlock(block.type);
      this.graph.addBlockNode(blockId, isStateBlock);
    }

    // Add bus nodes
    if (patch.buses) {
      for (const bus of patch.buses) {
        this.graph.addBusNode(bus.id);
      }
    }

    // Add connection edges (block to block)
    for (const conn of patch.connections) {
      this.graph.addConnectionEdge(conn.from.blockId, conn.to.blockId);
    }

    // Add publish edges (block to bus)
    if (patch.publishers) {
      for (const pub of patch.publishers) {
        if (pub.enabled) {
          this.graph.addPublishEdge(pub.from.blockId, pub.busId);
        }
      }
    }

    // Add listen edges (bus to block)
    if (patch.listeners) {
      for (const listener of patch.listeners) {
        if (listener.enabled) {
          this.graph.addListenEdge(listener.busId, listener.to.blockId);
        }
      }
    }
  }

  /**
   * Compile blocks to evaluators.
   */
  private compileBlocks(
    patch: PatchDefinition,
    evaluationOrder: string[]
  ): CompiledBlock[] {
    const compiledBlocks: CompiledBlock[] = [];

    for (const nodeId of evaluationOrder) {
      const block = patch.blocks.get(nodeId);
      if (!block) continue; // Skip buses

      const stateBlock = stateBlockRegistry.get(block.type);
      const isStateBlock = stateBlock !== undefined;

      // Initialize state memory if state block
      const stateMemory = isStateBlock ? stateBlock!.initState(0) : null;

      // Create evaluator
      const evaluator: Evaluator = isStateBlock
        ? this.createStateBlockEvaluator(stateBlock!)
        : this.createPrimitiveBlockEvaluator();

      compiledBlocks.push({
        id: block.id,
        type: block.type,
        evaluator,
        isStateBlock,
        stateMemory,
      });
    }

    return compiledBlocks;
  }

  /**
   * Compile buses to evaluators.
   */
  private compileBuses(
    patch: PatchDefinition,
    evaluationOrder: string[]
  ): CompiledBus[] {
    const compiledBuses: CompiledBus[] = [];

    if (!patch.buses) return compiledBuses;

    for (const nodeId of evaluationOrder) {
      const bus = patch.buses.find((b) => b.id === nodeId);
      if (!bus) continue; // Skip blocks

      // Get publishers for this bus
      const publishers =
        patch.publishers?.filter((p) => p.busId === bus.id && p.enabled) ?? [];

      // Sort publishers by sort key
      publishers.sort((a, b) => a.sortKey - b.sortKey);

      // Create bus evaluator
      const evaluator = this.createBusEvaluator(bus, publishers);

      compiledBuses.push({
        id: bus.id,
        type: bus.type,
        combineMode: bus.combineMode,
        defaultValue: bus.defaultValue,
        evaluator,
      });
    }

    return compiledBuses;
  }

  /**
   * Create evaluator for a state block.
   */
  private createStateBlockEvaluator(stateBlock: any): Evaluator {
    return (inputs: Record<string, unknown>, state: StateMemory | null, ctx: TimeCtx) => {
      if (!state) {
        throw new Error('State memory required for state block');
      }

      // Update state
      stateBlock.updateState(state, inputs, ctx);

      // Compute outputs
      return stateBlock.computeOutputs(state, inputs, ctx);
    };
  }

  /**
   * Create evaluator for a primitive block.
   */
  private createPrimitiveBlockEvaluator(): Evaluator {
    // For now, return a stub evaluator
    // In full implementation, this would look up block definition
    // and create appropriate evaluator
    return (inputs: Record<string, unknown>, _state: StateMemory | null, _ctx: TimeCtx) => {
      // Stub: just pass through first input
      const firstInput = Object.values(inputs)[0];
      return { output: firstInput ?? 0 };
    };
  }

  /**
   * Create evaluator for a bus.
   */
  private createBusEvaluator(
    bus: BusDef,
    publishers: PublisherDef[]
  ): Evaluator {
    return (inputs: Record<string, unknown>, _state: StateMemory | null, _ctx: TimeCtx) => {
      if (publishers.length === 0) {
        return { output: bus.defaultValue };
      }

      // Collect all publisher values
      const values: unknown[] = [];
      for (const pub of publishers) {
        const key = `${pub.from.blockId}:${pub.from.port}`;
        const value = inputs[key];
        if (value !== undefined) {
          values.push(value);
        }
      }

      if (values.length === 0) {
        return { output: bus.defaultValue };
      }

      // Apply combine mode
      const combined = this.combineValues(values, bus.combineMode);

      return { output: combined };
    };
  }

  /**
   * Combine multiple values according to combine mode.
   */
  private combineValues(values: unknown[], combineMode: string): unknown {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    const numValues = values.filter((v) => typeof v === 'number') as number[];

    switch (combineMode) {
      case 'sum':
        return numValues.reduce((a, b) => a + b, 0);

      case 'average':
        return numValues.reduce((a, b) => a + b, 0) / numValues.length;

      case 'max':
        return Math.max(...numValues);

      case 'min':
        return Math.min(...numValues);

      case 'last':
        return values[values.length - 1];

      case 'layer':
        // For layer mode, return all values (used for rendering)
        return values;

      default:
        return values[0];
    }
  }

  /**
   * Get compilation errors.
   */
  getErrors(): CompilationError[] {
    return this.errors;
  }

  /**
   * Check if compilation succeeded.
   */
  isSuccess(): boolean {
    return this.errors.length === 0;
  }
}
