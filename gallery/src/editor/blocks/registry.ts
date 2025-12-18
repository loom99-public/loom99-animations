import type { BlockDefinition, BlockTags, LaneKind, LaneFlavor, BlockCategory } from './types';

// Import all individual block definitions
import * as MacroBlocks from './macros';
import * as SceneBlocks from './scene';
import * as FieldBlocks from './fields';
import * as TimeBlocks from './time';
import * as ComposeBlocks from './compose';
import * as RenderBlocks from './render';
import * as MathBlocks from './math';
import * as ProgramBlocks from './program';
import * as AdapterBlocks from './adapters';
import * as FxBlocks from './fx';

// Import composite bridge for optional composite support
import { getCompositeBlockDefinitions } from '../composite-bridge';

const ALL_INDIVIDUAL_BLOCKS: BlockDefinition[] = [
  ...Object.values(MacroBlocks),
  ...Object.values(SceneBlocks),
  ...Object.values(FieldBlocks),
  ...Object.values(TimeBlocks),
  ...Object.values(ComposeBlocks),
  ...Object.values(RenderBlocks),
  ...Object.values(MathBlocks),
  ...Object.values(ProgramBlocks),
  ...Object.values(AdapterBlocks),
  ...Object.values(FxBlocks),
].filter((block): block is BlockDefinition => (block as BlockDefinition).type !== undefined);


/**
 * Normalize tags with canonical defaults for form/subcategory/legacy category.
 */
function normalizeDefinition(definition: BlockDefinition): BlockDefinition {
  const normalizedDef: BlockDefinition = { ...definition };
  normalizedDef.tags = getBlockTags(normalizedDef);
  return normalizedDef;
}

export function getBlockTags(definition: BlockDefinition): BlockTags {
  const tags: BlockTags = { ...(definition.tags ?? {}) };

  // Normalize canonical tags
  tags.form = definition.form;
  tags.subcategory = definition.subcategory ?? 'Other';
  tags.laneKind = definition.laneKind;

  if (definition.laneFlavor) {
    tags.laneFlavor = definition.laneFlavor;
  }

  return tags;
}

export function getBlockDefinitions(includeComposites: boolean = false): readonly BlockDefinition[] {
  const baseBlocks = ALL_INDIVIDUAL_BLOCKS.map(normalizeDefinition);

  if (!includeComposites) {
    return baseBlocks;
  }

  // Include composite blocks
  try {
    const compositeBlocks = getCompositeBlockDefinitions();
    return [...baseBlocks, ...compositeBlocks];
  } catch (error) {
    // If composite bridge is not available, return base blocks only
    console.warn('Composite bridge not available, returning base blocks only');
    return baseBlocks;
  }
}

// NOTE: BLOCK_DEFINITIONS should ideally not be a global constant here
// as it cannot include dynamically loaded composites.
// Consumers should call getBlockDefinitions() instead.
// For now, keep it for backward compatibility, but it will be limited.
export const BLOCK_DEFINITIONS: readonly BlockDefinition[] = getBlockDefinitions();

/**
 * Get all blocks for a category.
 */
export function getBlocksByCategory(category: BlockCategory): readonly BlockDefinition[] {
  return getBlockDefinitions().filter((b) => b.category === category);
}

/**
 * Get a block definition by type.
 */
export function getBlockDefinition(type: string): BlockDefinition | undefined {
  // Include composites in search since composite blocks need to be found during compilation
  return getBlockDefinitions(true).find((b) => b.type === type);
}

/**
 * Get all categories that have blocks.
 */
export function getCategoriesWithBlocks(): readonly BlockCategory[] {
  const categories = new Set(getBlockDefinitions().map((b) => b.category));
  return Array.from(categories);
}

/**
 * Get blocks that match a lane kind, sorted by priority.
 */
export function getBlocksForLaneKind(
  laneKind: LaneKind,
  laneFlavor?: LaneFlavor
): readonly BlockDefinition[] {
  let blocks = getBlockDefinitions().filter((b) => b.laneKind === laneKind);

  // If flavor specified, prefer blocks with matching flavor
  if (laneFlavor) {
    blocks = blocks.sort((a, b) => {
      const aMatch = a.laneFlavor === laneFlavor ? 0 : 1;
      const bMatch = b.laneFlavor === laneFlavor ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      // Then sort by priority
      return (a.priority ?? 99) - (b.priority ?? 99);
    });
  } else {
    // Sort by priority only
    blocks = blocks.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  }

  return blocks;
}

/**
 * Get all blocks, optionally filtered by lane, sorted for palette display.
 * Returns { matched: BlockDefinition[], other: BlockDefinition[] }
 */
export function getBlocksForPalette(
  filterByLane: boolean,
  laneKind?: LaneKind,
  laneFlavor?: LaneFlavor
): { matched: readonly BlockDefinition[]; other: readonly BlockDefinition[] } {
  const defs = getBlockDefinitions();
  if (!filterByLane || !laneKind) {
    // No filtering - return all blocks sorted by priority
    const all = [...defs].sort(
      (a, b) => (a.priority ?? 99) - (b.priority ?? 99)
    );
    return { matched: all, other: [] };
  }

  const matched = getBlocksForLaneKind(laneKind, laneFlavor);
  const matchedTypes = new Set(matched.map((b) => b.type));
  const other = defs.filter((b) => !matchedTypes.has(b.type)).sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99)
  );

  return { matched, other };
}

/**
 * Check if a block's output types are compatible with a lane's expected types.
 * This is a more sophisticated filter that looks at actual port types.
 */
export function isBlockCompatibleWithLane(
  block: BlockDefinition,
  laneKind: LaneKind
): boolean {
  // First check direct lane kind match
  if (block.laneKind === laneKind) return true;

  // Then check if any outputs would be useful in this lane
  // Map lane kinds to expected output type patterns
  const laneOutputPatterns: Record<LaneKind, string[]> = {
    Scene: ['Scene', 'SceneTargets', 'SceneStrokes'],
    Phase: ['Signal<PhaseSample>', 'Signal<Unit>'],
    Fields: ['Field<', 'Scalar:'],
    Scalars: ['Scalar:'],
    Spec: ['Spec:', 'Program'],
    Program: ['Program', 'RenderTree'],
    Output: ['Program', 'RenderTree'],
  };

  const patterns = laneOutputPatterns[laneKind] || [];
  return block.outputs.some((output) =>
    patterns.some((pattern) => output.type.startsWith(pattern) || output.type === pattern)
  );
}
