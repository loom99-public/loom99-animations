/**
 * Block Compilers
 *
 * Re-exports from modular blocks/ directory for backwards compatibility.
 * The actual implementations are organized by data flow stage in blocks/.
 *
 * @see blocks/index.ts for the registry and organization
 */

export {
  DEFAULT_BLOCK_REGISTRY,
  createBlockRegistry,
  registerDynamicBlock,
} from './blocks/index';

// Re-export all individual blocks for direct access
export * from './blocks/sources';
export * from './blocks/fields';
export * from './blocks/time';
export * from './blocks/math';
export * from './blocks/compose';
export * from './blocks/render';
export * from './blocks/adapters';
export * from './blocks/sinks';
export * from './blocks/helpers';
