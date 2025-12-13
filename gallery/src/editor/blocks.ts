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

import type { BlockCategory, Slot, BlockParams, SlotType } from './types';

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
  // Time
  PhaseMachine,
  EaseRamp,
  // Compose
  PerElementTransport,
  // Render
  ParticleRenderer,
  // Adapters
  SceneToTargets,
  FieldToSignal,
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
