/**
 * Editor Public Exports
 *
 * This is the entry point for the editor module.
 */

export { Editor } from './Editor';
export { EditorStore } from './store';
export { LogStore, logStore } from './logStore';
export { LogWindow } from './LogWindow';
export { StatusBadge } from './StatusBadge';
export {
  BLOCK_DEFINITIONS,
  getBlockDefinition,
  getBlocksByCategory,
  getCategoriesWithBlocks,
  type BlockDefinition,
  type ParamSchema,
} from './blocks';
export type {
  Block,
  BlockId,
  BlockType,
  BlockCategory,
  Slot,
  SlotType,
  Connection,
  Lane,
  LaneName,
  Patch,
  EditorUIState,
  Template,
} from './types';
export type {
  LogEntry,
  LogLevel,
  LogComponent,
  SystemStatus,
} from './logTypes';
export {
  LOG_LEVELS,
  LOG_LEVEL_CONFIG,
  LOG_COMPONENTS,
  LOG_COMPONENT_CONFIG,
  STATUS_CONFIG,
} from './logTypes';

// Compiler
export * from './compiler';

// Runtime
export * from './runtime';

// Components
export { PreviewPanel } from './PreviewPanel';
