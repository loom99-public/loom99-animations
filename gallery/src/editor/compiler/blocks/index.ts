/**
 * Block Compiler Registry
 *
 * Contains only domain primitives (new system).
 * Legacy blocks have been moved to legacy/ subdirectory.
 */

import type { BlockRegistry } from '../types';

// Domain primitives (new system)
import {
  DomainNBlock,
  PositionMapGridBlock,
  PositionMapCircleBlock,
  PositionMapLineBlock,
  FieldConstNumberBlock,
  FieldConstColorBlock,
  FieldHash01ByIdBlock,
  FieldMapNumberBlock,
  FieldMapVec2Block,
  FieldZipNumberBlock,
  PhaseClockBlock,
  TriggerOnWrapBlock,
  RenderInstances2DBlock,
} from './domain';

// =============================================================================
// Registry
// =============================================================================

/**
 * Default block compiler registry.
 * Maps block type strings to their compiler implementations.
 */
export const DEFAULT_BLOCK_REGISTRY: BlockRegistry = {
  // Domain primitives (new system)
  DomainN: DomainNBlock,
  PositionMapGrid: PositionMapGridBlock,
  PositionMapCircle: PositionMapCircleBlock,
  PositionMapLine: PositionMapLineBlock,
  FieldConstNumber: FieldConstNumberBlock,
  FieldConstColor: FieldConstColorBlock,
  FieldHash01ById: FieldHash01ByIdBlock,
  FieldMapNumber: FieldMapNumberBlock,
  FieldMapVec2: FieldMapVec2Block,
  FieldZipNumber: FieldZipNumberBlock,
  PhaseClock: PhaseClockBlock,
  TriggerOnWrap: TriggerOnWrapBlock,
  RenderInstances2D: RenderInstances2DBlock,
};

/**
 * Mutable registry allowing dynamic additions (composites/macros).
 * Starts from DEFAULT_BLOCK_REGISTRY.
 */
const dynamicRegistry: BlockRegistry = { ...DEFAULT_BLOCK_REGISTRY };

export function createBlockRegistry(): BlockRegistry {
  return dynamicRegistry;
}

export function registerDynamicBlock(type: string, compiler: any): void {
  dynamicRegistry[type] = compiler;
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

// Export domain blocks for testing
export * from './domain';
export * from './helpers';
