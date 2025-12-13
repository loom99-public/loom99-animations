/**
 * Editor Public Exports
 *
 * This is the entry point for the editor module.
 */

export { Editor } from './Editor';
export { EditorStore } from './store';
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
