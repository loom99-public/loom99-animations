/**
 * Block Registry
 *
 * Defines available blocks for the editor.
 * Each block definition includes:
 * - Metadata (type, label, category, description)
 * - Input/output slot definitions
 * - Default parameter values
 * - Parameter schema (for Inspector UI)
 */

import type { BlockCategory, Slot, BlockParams, SlotType, LaneKind, LaneFlavor } from './types';

// =============================================================================
// Block Definition Type
// =============================================================================

export interface BlockDefinition {
  /** Unique type identifier */
  readonly type: string;

  /** Human-readable label */
  readonly label: string;

  /** Category for library organization */
  readonly category: BlockCategory;

  /** Description shown in inspector */
  readonly description: string;

  /** Input slots */
  readonly inputs: readonly Slot[];

  /** Output slots */
  readonly outputs: readonly Slot[];

  /** Default parameter values */
  readonly defaultParams: BlockParams;

  /** Parameter schema for UI generation */
  readonly paramSchema: ParamSchema[];

  /** Color for visual identification */
  readonly color: string;

  // === Lane affinity tags (for palette filtering) ===

  /** Which lane kind this block naturally belongs to */
  readonly laneKind: LaneKind;

  /** Optional flavor hint (motion, timing, style) */
  readonly laneFlavor?: LaneFlavor;

  /** Priority for palette ordering (lower = higher priority, shown first) */
  readonly priority?: number;
}

// =============================================================================
// Parameter Schema (for Inspector UI)
// =============================================================================

export type ParamType = 'number' | 'string' | 'boolean' | 'select' | 'color';

export interface ParamSchema {
  readonly key: string;
  readonly label: string;
  readonly type: ParamType;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly options?: readonly { value: string; label: string }[];
  readonly defaultValue: unknown;
}

// =============================================================================
// Helper: Create Slot
// =============================================================================

function input(id: string, label: string, type: SlotType): Slot {
  return { id, label, type, direction: 'input' };
}

function output(id: string, label: string, type: SlotType): Slot {
  return { id, label, type, direction: 'output' };
}

// =============================================================================
// Scene Blocks
// =============================================================================

export const SVGPathSource: BlockDefinition = {
  type: 'SVGPathSource',
  label: 'SVG Paths',
  category: 'Scene',
  description: 'Load SVG path data from target (logo or text)',
  inputs: [],
  outputs: [output('scene', 'Scene', 'Scene')],
  defaultParams: {
    target: 'logo',
  },
  paramSchema: [
    {
      key: 'target',
      label: 'Target',
      type: 'select',
      options: [
        { value: 'logo', label: 'Logo' },
        { value: 'text', label: 'Text' },
      ],
      defaultValue: 'logo',
    },
  ],
  color: '#4a9eff',
  laneKind: 'Scene',
  priority: 1,
};

export const SamplePoints: BlockDefinition = {
  type: 'SamplePoints',
  label: 'Sample Points',
  category: 'Derivers',
  description: 'Extract point targets from scene paths',
  inputs: [input('scene', 'Scene', 'Scene')],
  outputs: [output('targets', 'Targets', 'SceneTargets')],
  defaultParams: {
    density: 1.0,
  },
  paramSchema: [
    {
      key: 'density',
      label: 'Density',
      type: 'number',
      min: 0.1,
      max: 3.0,
      step: 0.1,
      defaultValue: 1.0,
    },
  ],
  color: '#6b5ce7',
  laneKind: 'Scene',
  priority: 2,
};

// =============================================================================
// Field Blocks
// =============================================================================

export const RadialOrigin: BlockDefinition = {
  type: 'RadialOrigin',
  label: 'Radial Origin',
  category: 'Fields',
  description: 'Generate start positions in a radial pattern around a center point',
  inputs: [],
  outputs: [output('positions', 'Positions', 'Field<Point>')],
  defaultParams: {
    centerX: 300,
    centerY: 100,
    minRadius: 200,
    maxRadius: 400,
    spread: 1.0,
  },
  paramSchema: [
    { key: 'centerX', label: 'Center X', type: 'number', min: 0, max: 800, step: 10, defaultValue: 300 },
    { key: 'centerY', label: 'Center Y', type: 'number', min: 0, max: 400, step: 10, defaultValue: 100 },
    { key: 'minRadius', label: 'Min Radius', type: 'number', min: 0, max: 500, step: 10, defaultValue: 200 },
    { key: 'maxRadius', label: 'Max Radius', type: 'number', min: 0, max: 800, step: 10, defaultValue: 400 },
    { key: 'spread', label: 'Spread', type: 'number', min: 0.1, max: 2.0, step: 0.1, defaultValue: 1.0 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Motion',
  priority: 1,
};

export const LinearStagger: BlockDefinition = {
  type: 'LinearStagger',
  label: 'Linear Stagger',
  category: 'Fields',
  description: 'Generate delays that increase linearly by element index',
  inputs: [],
  outputs: [output('delays', 'Delays', 'Field<Duration>')],
  defaultParams: {
    baseStagger: 0.08,
    jitter: 0.2,
  },
  paramSchema: [
    { key: 'baseStagger', label: 'Base Stagger (s)', type: 'number', min: 0, max: 0.5, step: 0.01, defaultValue: 0.08 },
    { key: 'jitter', label: 'Jitter', type: 'number', min: 0, max: 1.0, step: 0.05, defaultValue: 0.2 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Timing',
  priority: 1,
};

// =============================================================================
// Time Blocks
// =============================================================================

export const PhaseMachine: BlockDefinition = {
  type: 'PhaseMachine',
  label: 'Phase Machine',
  category: 'Time',
  description: 'Three-phase animation: entrance, hold, exit',
  inputs: [],
  outputs: [output('phase', 'Phase', 'Signal<PhaseSample>')],
  defaultParams: {
    entranceDuration: 2.5,
    holdDuration: 2.0,
    exitDuration: 0.5,
  },
  paramSchema: [
    { key: 'entranceDuration', label: 'Entrance (s)', type: 'number', min: 0.1, max: 5.0, step: 0.1, defaultValue: 2.5 },
    { key: 'holdDuration', label: 'Hold (s)', type: 'number', min: 0, max: 10.0, step: 0.1, defaultValue: 2.0 },
    { key: 'exitDuration', label: 'Exit (s)', type: 'number', min: 0.1, max: 5.0, step: 0.1, defaultValue: 0.5 },
  ],
  color: '#22c55e',
  laneKind: 'Phase',
  priority: 1,
};

export const EaseRamp: BlockDefinition = {
  type: 'EaseRamp',
  label: 'Ease Ramp',
  category: 'Time',
  description: 'Apply easing function to a 0-1 progress signal',
  inputs: [input('progress', 'Progress', 'Signal<Unit>')],
  outputs: [output('eased', 'Eased', 'Signal<Unit>')],
  defaultParams: {
    easing: 'easeOutCubic',
  },
  paramSchema: [
    {
      key: 'easing',
      label: 'Easing',
      type: 'select',
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'easeInQuad', label: 'Ease In Quad' },
        { value: 'easeOutQuad', label: 'Ease Out Quad' },
        { value: 'easeInOutQuad', label: 'Ease In Out Quad' },
        { value: 'easeOutCubic', label: 'Ease Out Cubic' },
        { value: 'easeInOutCubic', label: 'Ease In Out Cubic' },
        { value: 'easeOutElastic', label: 'Ease Out Elastic' },
      ],
      defaultValue: 'easeOutCubic',
    },
  ],
  color: '#22c55e',
  laneKind: 'Phase',
  laneFlavor: 'Timing',
  priority: 2,
};

// =============================================================================
// Compose Blocks
// =============================================================================

export const PerElementTransport: BlockDefinition = {
  type: 'PerElementTransport',
  label: 'Per-Element Transport',
  category: 'Compose',
  description: 'Apply animation to each element with individual delays',
  inputs: [
    input('targets', 'Targets', 'SceneTargets'),
    input('positions', 'Start Positions', 'Field<Point>'),
    input('delays', 'Delays', 'Field<Duration>'),
    input('phase', 'Phase', 'Signal<PhaseSample>'),
  ],
  outputs: [output('program', 'Program', 'Program')],
  defaultParams: {},
  paramSchema: [],
  color: '#f97316',
  laneKind: 'Spec',
  priority: 1,
};

// =============================================================================
// Render Blocks
// =============================================================================

export const ParticleRenderer: BlockDefinition = {
  type: 'ParticleRenderer',
  label: 'Particle Renderer',
  category: 'Render',
  description: 'Render particles as glowing circles',
  inputs: [input('program', 'Program', 'Program')],
  outputs: [output('render', 'Render', 'RenderTree')],
  defaultParams: {
    radius: 2.5,
    glow: true,
    glowRadius: 10,
  },
  paramSchema: [
    { key: 'radius', label: 'Radius', type: 'number', min: 0.5, max: 10, step: 0.5, defaultValue: 2.5 },
    { key: 'glow', label: 'Glow', type: 'boolean', defaultValue: true },
    { key: 'glowRadius', label: 'Glow Radius', type: 'number', min: 0, max: 30, step: 1, defaultValue: 10 },
  ],
  color: '#ef4444',
  laneKind: 'Program',
  laneFlavor: 'Style',
  priority: 1,
};

// =============================================================================
// Math Blocks (Slice 2.5)
// =============================================================================

export const MathConstNumber: BlockDefinition = {
  type: 'math.constNumber',
  label: 'Const Number',
  category: 'Math',
  description: 'Constant scalar number',
  inputs: [],
  outputs: [output('out', 'Out', 'Scalar:number')],
  defaultParams: {
    value: 0,
  },
  paramSchema: [
    { key: 'value', label: 'Value', type: 'number', min: -1000, max: 1000, step: 0.1, defaultValue: 0 },
  ],
  color: '#8b5cf6',
  laneKind: 'Scalars',
  priority: 1,
};

export const MathAddScalar: BlockDefinition = {
  type: 'math.addScalar',
  label: 'Add',
  category: 'Math',
  description: 'Add two scalar numbers',
  inputs: [
    input('a', 'A', 'Scalar:number'),
    input('b', 'B', 'Scalar:number'),
  ],
  outputs: [output('out', 'Out', 'Scalar:number')],
  defaultParams: {},
  paramSchema: [],
  color: '#8b5cf6',
  laneKind: 'Scalars',
  priority: 2,
};

export const MathMulScalar: BlockDefinition = {
  type: 'math.mulScalar',
  label: 'Multiply',
  category: 'Math',
  description: 'Multiply two scalar numbers',
  inputs: [
    input('a', 'A', 'Scalar:number'),
    input('b', 'B', 'Scalar:number'),
  ],
  outputs: [output('out', 'Out', 'Scalar:number')],
  defaultParams: {},
  paramSchema: [],
  color: '#8b5cf6',
  laneKind: 'Scalars',
  priority: 2,
};

export const MathSinScalar: BlockDefinition = {
  type: 'math.sinScalar',
  label: 'Sin',
  category: 'Math',
  description: 'Sine of a scalar number',
  inputs: [input('x', 'X', 'Scalar:number')],
  outputs: [output('out', 'Out', 'Scalar:number')],
  defaultParams: {},
  paramSchema: [],
  color: '#8b5cf6',
  laneKind: 'Scalars',
  priority: 3,
};

export const LiftScalarToField: BlockDefinition = {
  type: 'lift.scalarToFieldNumber',
  label: 'Scalar → Field',
  category: 'Adapters',
  description: 'Lift Scalar:number to Field<number>',
  inputs: [input('x', 'X', 'Scalar:number')],
  outputs: [output('out', 'Out', 'Field<number>')],
  defaultParams: {},
  paramSchema: [],
  color: '#71717a',
  laneKind: 'Fields',
  priority: 10,
};

// =============================================================================
// Program Blocks (Slice 2)
// =============================================================================

export const DemoProgram: BlockDefinition = {
  type: 'demoProgram',
  label: 'Demo Program',
  category: 'Compose',
  description: 'Generate a visual proof program',
  inputs: [
    input('speed', 'Speed', 'Scalar:number'),
    input('amp', 'Amplitude', 'Scalar:number'),
  ],
  outputs: [output('program', 'Program', 'Program')],
  defaultParams: {
    variant: 'lineDrawing',
    speed: 1,
    amp: 30,
    stroke: '#ffffff',
    cx: 200,
    cy: 120,
    r: 8,
  },
  paramSchema: [
    {
      key: 'variant',
      label: 'Variant',
      type: 'select',
      options: [
        { value: 'lineDrawing', label: 'Line Drawing' },
        { value: 'pulsingLine', label: 'Pulsing Line' },
        { value: 'bouncingCircle', label: 'Bouncing Circle' },
        { value: 'particles', label: 'Particles' },
        { value: 'oscillator', label: 'Oscillator' },
      ],
      defaultValue: 'lineDrawing',
    },
    { key: 'speed', label: 'Speed', type: 'number', min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
    { key: 'amp', label: 'Amplitude', type: 'number', min: 1, max: 200, step: 1, defaultValue: 30 },
    { key: 'stroke', label: 'Stroke Color', type: 'color', defaultValue: '#ffffff' },
    { key: 'cx', label: 'Center X', type: 'number', min: 0, max: 800, step: 10, defaultValue: 200 },
    { key: 'cy', label: 'Center Y', type: 'number', min: 0, max: 600, step: 10, defaultValue: 120 },
    { key: 'r', label: 'Radius', type: 'number', min: 1, max: 50, step: 1, defaultValue: 8 },
  ],
  color: '#f97316',
  laneKind: 'Program',
  priority: 1,
};

export const OutputProgram: BlockDefinition = {
  type: 'outputProgram',
  label: 'Program Output',
  category: 'Compose',
  description: 'Mark a Program as the patch output (before rendering)',
  inputs: [input('program', 'Program', 'Program')],
  outputs: [], // True sink - no outputs
  defaultParams: {},
  paramSchema: [],
  color: '#ef4444',
  laneKind: 'Output',
  priority: 2,
};

export const Canvas: BlockDefinition = {
  type: 'canvas',
  label: 'Canvas',
  category: 'Render',
  description: 'Final render output - displays the animation',
  inputs: [input('render', 'Render', 'RenderTree')],
  outputs: [], // True sink - no outputs
  defaultParams: {
    width: 400,
    height: 300,
    background: '#1a1a1a',
  },
  paramSchema: [
    { key: 'width', label: 'Width', type: 'number', min: 100, max: 1920, step: 10, defaultValue: 400 },
    { key: 'height', label: 'Height', type: 'number', min: 100, max: 1080, step: 10, defaultValue: 300 },
    { key: 'background', label: 'Background', type: 'string', defaultValue: '#1a1a1a' },
  ],
  color: '#6366f1',
  laneKind: 'Output',
  priority: 1,
};

// =============================================================================
// Adapter Blocks
// =============================================================================

export const SceneToTargets: BlockDefinition = {
  type: 'SceneToTargets',
  label: 'Scene → Targets',
  category: 'Adapters',
  description: 'Convert Scene to SceneTargets (sample points from paths)',
  inputs: [input('scene', 'Scene', 'Scene')],
  outputs: [output('targets', 'Targets', 'SceneTargets')],
  defaultParams: {},
  paramSchema: [],
  color: '#71717a',
  laneKind: 'Scene',
  priority: 10,
};

export const FieldToSignal: BlockDefinition = {
  type: 'FieldToSignal',
  label: 'Field → Signal',
  category: 'Adapters',
  description: 'Convert Field<A> to Signal<A> by freezing at compilation time',
  inputs: [input('field', 'Field', 'Field<number>')],
  outputs: [output('signal', 'Signal', 'Signal<number>')],
  defaultParams: {},
  paramSchema: [],
  color: '#71717a',
  laneKind: 'Fields',
  priority: 10,
};

// =============================================================================
// Block Registry
// =============================================================================

export const BLOCK_DEFINITIONS: readonly BlockDefinition[] = [
  // Scene
  SVGPathSource,
  SamplePoints,
  // Fields
  RadialOrigin,
  LinearStagger,
  // Math (Slice 2.5)
  MathConstNumber,
  MathAddScalar,
  MathMulScalar,
  MathSinScalar,
  // Time
  PhaseMachine,
  EaseRamp,
  // Compose
  PerElementTransport,
  DemoProgram,
  OutputProgram,
  // Render
  ParticleRenderer,
  Canvas,
  // Adapters
  SceneToTargets,
  FieldToSignal,
  LiftScalarToField,
];

/**
 * Get all blocks for a category.
 */
export function getBlocksByCategory(category: BlockCategory): readonly BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter((b) => b.category === category);
}

/**
 * Get a block definition by type.
 */
export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((b) => b.type === type);
}

/**
 * Get all categories that have blocks.
 */
export function getCategoriesWithBlocks(): readonly BlockCategory[] {
  const categories = new Set(BLOCK_DEFINITIONS.map((b) => b.category));
  return Array.from(categories);
}

// =============================================================================
// Lane Filtering
// =============================================================================

/**
 * Get blocks that match a lane kind, sorted by priority.
 */
export function getBlocksForLaneKind(
  laneKind: LaneKind,
  laneFlavor?: LaneFlavor
): readonly BlockDefinition[] {
  let blocks = BLOCK_DEFINITIONS.filter((b) => b.laneKind === laneKind);

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
  if (!filterByLane || !laneKind) {
    // No filtering - return all blocks sorted by priority
    const all = [...BLOCK_DEFINITIONS].sort(
      (a, b) => (a.priority ?? 99) - (b.priority ?? 99)
    );
    return { matched: all, other: [] };
  }

  const matched = getBlocksForLaneKind(laneKind, laneFlavor);
  const matchedTypes = new Set(matched.map((b) => b.type));
  const other = BLOCK_DEFINITIONS.filter((b) => !matchedTypes.has(b.type)).sort(
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
