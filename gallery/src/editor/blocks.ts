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
// Macro Blocks (Recipe Starters)
// These expand into multiple primitive blocks when dropped
// =============================================================================

export const MacroLineDrawing: BlockDefinition = {
  type: 'macro:lineDrawing',
  label: '✨ Line Drawing',
  category: 'Macros',
  description: 'Macro: Particles animate from random positions to form a shape. Expands into ~12 primitive blocks.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#fbbf24',
  laneKind: 'Program',
  priority: -100,
};

export const MacroParticles: BlockDefinition = {
  type: 'macro:particles',
  label: '✨ Particles',
  category: 'Macros',
  description: 'Macro: Glowing particles converge to form a shape. Expands into ~12 primitive blocks.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#fbbf24',
  laneKind: 'Program',
  priority: -99,
};

export const MacroBouncingCircle: BlockDefinition = {
  type: 'macro:bouncingCircle',
  label: '✨ Bouncing Circle',
  category: 'Macros',
  description: 'Macro: Simple oscillating circle animation. Expands into primitive blocks.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#fbbf24',
  laneKind: 'Program',
  priority: -98,
};

export const MacroOscillator: BlockDefinition = {
  type: 'macro:oscillator',
  label: '✨ Oscillator',
  category: 'Macros',
  description: 'Macro: Math-driven oscillating animation. Expands into primitive blocks.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#fbbf24',
  laneKind: 'Program',
  priority: -97,
};

export const MacroRadialBurst: BlockDefinition = {
  type: 'macro:radialBurst',
  label: '✨ Radial Burst',
  category: 'Macros',
  description: 'Macro: Particles burst from center, then converge to form shape.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#fbbf24',
  laneKind: 'Program',
  priority: -96,
};

export const MacroCascade: BlockDefinition = {
  type: 'macro:cascade',
  label: '✨ Cascade',
  category: 'Macros',
  description: 'Macro: Particles fall from top like a waterfall.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#fbbf24',
  laneKind: 'Program',
  priority: -95,
};

export const MacroScatter: BlockDefinition = {
  type: 'macro:scatter',
  label: '✨ Scatter',
  category: 'Macros',
  description: 'Macro: Particles start scattered, slowly converge to form shape.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#fbbf24',
  laneKind: 'Program',
  priority: -94,
};

export const MacroImplosion: BlockDefinition = {
  type: 'macro:implosion',
  label: '✨ Implosion',
  category: 'Macros',
  description: 'Macro: Particles rush in from all sides to form shape.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#fbbf24',
  laneKind: 'Program',
  priority: -93,
};

export const MacroSwarm: BlockDefinition = {
  type: 'macro:swarm',
  label: '✨ Swarm',
  category: 'Macros',
  description: 'Macro: Particles swarm up from bottom to form shape.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#fbbf24',
  laneKind: 'Program',
  priority: -92,
};

export const MacroLoveYouBaby: BlockDefinition = {
  type: 'macro:loveYouBaby',
  label: '💖 Love You Baby',
  category: 'Macros',
  description: 'Macro: Particles swarm into a big heart shape.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#ff2d75',
  laneKind: 'Program',
  priority: -91,
};

export const MacroNebula: BlockDefinition = {
  type: 'macro:nebula',
  label: '🌌 Nebula',
  category: 'Macros',
  description: 'Macro: Cosmic particles with rainbow colors, varied sizes, and dreamy motion. Uses 16 blocks!',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#a855f7',
  laneKind: 'Program',
  priority: -90,
};

export const MacroGlitchStorm: BlockDefinition = {
  type: 'macro:glitchStorm',
  label: '⚡ Glitch Storm',
  category: 'Macros',
  description: 'Macro: Digital chaos with grid positions, scan-line timing, and RGB chromatic aberration.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#22c55e',
  laneKind: 'Program',
  priority: -89,
};

export const MacroAurora: BlockDefinition = {
  type: 'macro:aurora',
  label: '🌊 Aurora',
  category: 'Macros',
  description: 'Macro: Ethereal curtain of light descending with wave-based flow and gradient colors.',
  inputs: [],
  outputs: [],
  defaultParams: {},
  paramSchema: [],
  color: '#06b6d4',
  laneKind: 'Program',
  priority: -88,
};

// =============================================================================
// Scene Blocks
// =============================================================================

export const SVGPathSource: BlockDefinition = {
  type: 'SVGPathSource',
  label: 'SVG Paths',
  category: 'Scene',
  description: 'Load SVG path data from target (logo, text, or heart)',
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
        { value: 'heart', label: 'Heart' },
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

export const RegionField: BlockDefinition = {
  type: 'regionField',
  label: 'Region Field',
  category: 'Fields',
  description: 'Generate random points within a rectangular region',
  inputs: [],
  outputs: [output('positions', 'Positions', 'Field<Point>')],
  defaultParams: {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  },
  paramSchema: [
    { key: 'x', label: 'X', type: 'number', min: -1000, max: 1000, step: 10, defaultValue: 0 },
    { key: 'y', label: 'Y', type: 'number', min: -1000, max: 1000, step: 10, defaultValue: 0 },
    { key: 'width', label: 'Width', type: 'number', min: 10, max: 2000, step: 10, defaultValue: 800 },
    { key: 'height', label: 'Height', type: 'number', min: 10, max: 2000, step: 10, defaultValue: 600 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Motion',
  priority: 2,
};

export const ConstantFieldDuration: BlockDefinition = {
  type: 'constantFieldDuration',
  label: 'Constant Duration',
  category: 'Fields',
  description: 'Same duration for all elements',
  inputs: [],
  outputs: [output('durations', 'Durations', 'Field<Duration>')],
  defaultParams: {
    duration: 1.0,
  },
  paramSchema: [
    { key: 'duration', label: 'Duration (s)', type: 'number', min: 0.1, max: 10, step: 0.1, defaultValue: 1.0 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Timing',
  priority: 2,
};

export const WaveStagger: BlockDefinition = {
  type: 'WaveStagger',
  label: 'Wave Stagger',
  category: 'Fields',
  description: 'Generate wave-based delays for organic staggering effects',
  inputs: [],
  outputs: [output('delays', 'Delays', 'Field<Duration>')],
  defaultParams: {
    frequency: 1.0,
    amplitude: 0.3,
    baseDelay: 0.5,
    phase: 0,
    jitter: 0.1,
  },
  paramSchema: [
    { key: 'frequency', label: 'Frequency', type: 'number', min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
    { key: 'amplitude', label: 'Amplitude', type: 'number', min: 0, max: 1.0, step: 0.05, defaultValue: 0.3 },
    { key: 'baseDelay', label: 'Base Delay (s)', type: 'number', min: 0, max: 2.0, step: 0.1, defaultValue: 0.5 },
    { key: 'phase', label: 'Phase', type: 'number', min: 0, max: 6.28, step: 0.1, defaultValue: 0 },
    { key: 'jitter', label: 'Jitter', type: 'number', min: 0, max: 0.5, step: 0.05, defaultValue: 0.1 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Timing',
  priority: 3,
};

export const SizeVariation: BlockDefinition = {
  type: 'SizeVariation',
  label: 'Size Variation',
  category: 'Fields',
  description: 'Generate per-element size multipliers for varied effects',
  inputs: [],
  outputs: [output('sizes', 'Sizes', 'Field<number>')],
  defaultParams: {
    mode: 'random',
    baseSize: 1.0,
    variation: 0.5,
    minSize: 0.3,
    maxSize: 2.0,
  },
  paramSchema: [
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'uniform', label: 'Uniform' },
        { value: 'random', label: 'Random' },
        { value: 'distanceFade', label: 'Distance Fade' },
        { value: 'pulse', label: 'Pulse' },
      ],
      defaultValue: 'random',
    },
    { key: 'baseSize', label: 'Base Size', type: 'number', min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.0 },
    { key: 'variation', label: 'Variation', type: 'number', min: 0, max: 2.0, step: 0.1, defaultValue: 0.5 },
    { key: 'minSize', label: 'Min Size', type: 'number', min: 0.1, max: 1.0, step: 0.1, defaultValue: 0.3 },
    { key: 'maxSize', label: 'Max Size', type: 'number', min: 1.0, max: 5.0, step: 0.1, defaultValue: 2.0 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Style',
  priority: 4,
};

export const NoiseField: BlockDefinition = {
  type: 'noiseField',
  label: 'Noise Field',
  category: 'Fields',
  description: 'Generate noise-based values for procedural effects',
  inputs: [],
  outputs: [output('out', 'Out', 'Field<number>')],
  defaultParams: {
    amplitude: 1.0,
    offset: 0,
  },
  paramSchema: [
    { key: 'amplitude', label: 'Amplitude', type: 'number', min: 0.1, max: 10, step: 0.1, defaultValue: 1.0 },
    { key: 'offset', label: 'Offset', type: 'number', min: -10, max: 10, step: 0.1, defaultValue: 0 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 5,
};

export const ColorField: BlockDefinition = {
  type: 'ColorField',
  label: 'Color Field',
  category: 'Fields',
  description: 'Generate per-element colors for varied effects',
  inputs: [],
  outputs: [output('colors', 'Colors', 'Field<string>')],
  defaultParams: {
    mode: 'solid',
    baseColor: '#ffffff',
    endColor: '#ff0000',
    hueRange: 30,
    saturation: 0.8,
    lightness: 0.6,
  },
  paramSchema: [
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'solid', label: 'Solid' },
        { value: 'gradient', label: 'Gradient' },
        { value: 'randomHue', label: 'Random Hue' },
        { value: 'rainbow', label: 'Rainbow' },
      ],
      defaultValue: 'solid',
    },
    { key: 'baseColor', label: 'Base Color', type: 'color', defaultValue: '#ffffff' },
    { key: 'endColor', label: 'End Color', type: 'color', defaultValue: '#ff0000' },
    { key: 'hueRange', label: 'Hue Range', type: 'number', min: 0, max: 180, step: 5, defaultValue: 30 },
    { key: 'saturation', label: 'Saturation', type: 'number', min: 0, max: 1, step: 0.1, defaultValue: 0.8 },
    { key: 'lightness', label: 'Lightness', type: 'number', min: 0, max: 1, step: 0.1, defaultValue: 0.6 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Style',
  priority: 6,
};

// --- Timing/Stagger Fields ---

export const RandomStagger: BlockDefinition = {
  type: 'RandomStagger',
  label: 'Random Stagger',
  category: 'Fields',
  description: 'Random delays within a range (for particles, liquid)',
  inputs: [],
  outputs: [output('delays', 'Delays', 'Field<Duration>')],
  defaultParams: { minDelay: 0, maxDelay: 0.5, distribution: 'uniform' },
  paramSchema: [
    { key: 'minDelay', label: 'Min Delay (s)', type: 'number', min: 0, max: 2, step: 0.05, defaultValue: 0 },
    { key: 'maxDelay', label: 'Max Delay (s)', type: 'number', min: 0, max: 2, step: 0.05, defaultValue: 0.5 },
    { key: 'distribution', label: 'Distribution', type: 'select', options: [
      { value: 'uniform', label: 'Uniform' },
      { value: 'easeIn', label: 'Ease In' },
      { value: 'easeOut', label: 'Ease Out' },
      { value: 'gaussian', label: 'Gaussian' },
    ], defaultValue: 'uniform' },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Timing',
  priority: 7,
};

export const IndexStagger: BlockDefinition = {
  type: 'IndexStagger',
  label: 'Index Stagger',
  category: 'Fields',
  description: 'Sequential delays by element index (typewriter, line drawing)',
  inputs: [],
  outputs: [output('delays', 'Delays', 'Field<Duration>')],
  defaultParams: { delayPerElement: 0.1, startDelay: 0, reverse: false },
  paramSchema: [
    { key: 'delayPerElement', label: 'Delay/Element (s)', type: 'number', min: 0.01, max: 0.5, step: 0.01, defaultValue: 0.1 },
    { key: 'startDelay', label: 'Start Delay (s)', type: 'number', min: 0, max: 2, step: 0.1, defaultValue: 0 },
    { key: 'reverse', label: 'Reverse', type: 'boolean', defaultValue: false },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Timing',
  priority: 8,
};

export const DurationVariation: BlockDefinition = {
  type: 'DurationVariation',
  label: 'Duration Variation',
  category: 'Fields',
  description: 'Per-element duration with random variation',
  inputs: [],
  outputs: [output('durations', 'Durations', 'Field<Duration>')],
  defaultParams: { baseDuration: 1.0, variation: 0.2, minDuration: 0.1 },
  paramSchema: [
    { key: 'baseDuration', label: 'Base (s)', type: 'number', min: 0.1, max: 5, step: 0.1, defaultValue: 1.0 },
    { key: 'variation', label: 'Variation', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 0.2 },
    { key: 'minDuration', label: 'Min (s)', type: 'number', min: 0.1, max: 1, step: 0.1, defaultValue: 0.1 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Timing',
  priority: 9,
};

export const DecayEnvelope: BlockDefinition = {
  type: 'DecayEnvelope',
  label: 'Decay Envelope',
  category: 'Fields',
  description: 'Amplitude decay rates for damping effects',
  inputs: [],
  outputs: [output('decay', 'Decay', 'Field<number>')],
  defaultParams: { curve: 'exponential', rate: 1.0, variation: 0.1 },
  paramSchema: [
    { key: 'curve', label: 'Curve', type: 'select', options: [
      { value: 'linear', label: 'Linear' },
      { value: 'exponential', label: 'Exponential' },
      { value: 'easeOut', label: 'Ease Out' },
      { value: 'sudden', label: 'Sudden' },
    ], defaultValue: 'exponential' },
    { key: 'rate', label: 'Rate', type: 'number', min: 0.1, max: 5, step: 0.1, defaultValue: 1.0 },
    { key: 'variation', label: 'Variation', type: 'number', min: 0, max: 0.5, step: 0.05, defaultValue: 0.1 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 10,
};

// --- Position/Spatial Fields ---

export const ExplosionOrigin: BlockDefinition = {
  type: 'ExplosionOrigin',
  label: 'Explosion Origin',
  category: 'Fields',
  description: 'Random positions radiating from center (particle explosion)',
  inputs: [],
  outputs: [output('positions', 'Positions', 'Field<Point>')],
  defaultParams: { centerX: 400, centerY: 300, minDistance: 200, maxDistance: 600, angleSpread: 360 },
  paramSchema: [
    { key: 'centerX', label: 'Center X', type: 'number', min: 0, max: 800, step: 10, defaultValue: 400 },
    { key: 'centerY', label: 'Center Y', type: 'number', min: 0, max: 600, step: 10, defaultValue: 300 },
    { key: 'minDistance', label: 'Min Dist', type: 'number', min: 0, max: 500, step: 10, defaultValue: 200 },
    { key: 'maxDistance', label: 'Max Dist', type: 'number', min: 100, max: 1000, step: 10, defaultValue: 600 },
    { key: 'angleSpread', label: 'Angle Spread', type: 'number', min: 0, max: 360, step: 10, defaultValue: 360 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Motion',
  priority: 11,
};

export const TopDropOrigin: BlockDefinition = {
  type: 'TopDropOrigin',
  label: 'Top Drop Origin',
  category: 'Fields',
  description: 'Positions above scene for drop/fall effects (liquid)',
  inputs: [],
  outputs: [output('positions', 'Positions', 'Field<Point>')],
  defaultParams: { sceneWidth: 800, dropHeight: -100, xSpread: 1.0, heightVariation: 50 },
  paramSchema: [
    { key: 'sceneWidth', label: 'Scene Width', type: 'number', min: 100, max: 1920, step: 10, defaultValue: 800 },
    { key: 'dropHeight', label: 'Drop Height', type: 'number', min: -500, max: 0, step: 10, defaultValue: -100 },
    { key: 'xSpread', label: 'X Spread', type: 'number', min: 0.1, max: 2, step: 0.1, defaultValue: 1.0 },
    { key: 'heightVariation', label: 'Height Var', type: 'number', min: 0, max: 200, step: 10, defaultValue: 50 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Motion',
  priority: 12,
};

export const GridPositions: BlockDefinition = {
  type: 'GridPositions',
  label: 'Grid Positions',
  category: 'Fields',
  description: 'Positions arranged in a grid pattern',
  inputs: [],
  outputs: [output('positions', 'Positions', 'Field<Point>')],
  defaultParams: { startX: 100, startY: 100, cellWidth: 50, cellHeight: 50, columns: 10, jitter: 0 },
  paramSchema: [
    { key: 'startX', label: 'Start X', type: 'number', min: 0, max: 500, step: 10, defaultValue: 100 },
    { key: 'startY', label: 'Start Y', type: 'number', min: 0, max: 500, step: 10, defaultValue: 100 },
    { key: 'cellWidth', label: 'Cell Width', type: 'number', min: 10, max: 200, step: 5, defaultValue: 50 },
    { key: 'cellHeight', label: 'Cell Height', type: 'number', min: 10, max: 200, step: 5, defaultValue: 50 },
    { key: 'columns', label: 'Columns', type: 'number', min: 1, max: 20, step: 1, defaultValue: 10 },
    { key: 'jitter', label: 'Jitter', type: 'number', min: 0, max: 50, step: 1, defaultValue: 0 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Motion',
  priority: 13,
};

export const CenterPoint: BlockDefinition = {
  type: 'CenterPoint',
  label: 'Center Point',
  category: 'Fields',
  description: 'Same center position for all elements',
  inputs: [],
  outputs: [output('position', 'Position', 'Field<Point>')],
  defaultParams: { x: 400, y: 300 },
  paramSchema: [
    { key: 'x', label: 'X', type: 'number', min: 0, max: 800, step: 10, defaultValue: 400 },
    { key: 'y', label: 'Y', type: 'number', min: 0, max: 600, step: 10, defaultValue: 300 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  laneFlavor: 'Motion',
  priority: 14,
};

// --- Transform Fields ---

export const RotationField: BlockDefinition = {
  type: 'RotationField',
  label: 'Rotation Field',
  category: 'Fields',
  description: 'Per-element rotation angles',
  inputs: [],
  outputs: [output('rotations', 'Rotations', 'Field<number>')],
  defaultParams: { mode: 'random', baseRotation: 0, range: 360, direction: 1 },
  paramSchema: [
    { key: 'mode', label: 'Mode', type: 'select', options: [
      { value: 'constant', label: 'Constant' },
      { value: 'random', label: 'Random' },
      { value: 'sequential', label: 'Sequential' },
      { value: 'radial', label: 'Radial' },
    ], defaultValue: 'random' },
    { key: 'baseRotation', label: 'Base (deg)', type: 'number', min: -360, max: 360, step: 15, defaultValue: 0 },
    { key: 'range', label: 'Range (deg)', type: 'number', min: 0, max: 720, step: 15, defaultValue: 360 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 15,
};

export const ScaleField: BlockDefinition = {
  type: 'ScaleField',
  label: 'Scale Field',
  category: 'Fields',
  description: 'Per-element scale values',
  inputs: [],
  outputs: [output('scales', 'Scales', 'Field<number>')],
  defaultParams: { mode: 'constant', baseScale: 1.0, variation: 0.3, minScale: 0.1, maxScale: 2.0 },
  paramSchema: [
    { key: 'mode', label: 'Mode', type: 'select', options: [
      { value: 'constant', label: 'Constant' },
      { value: 'random', label: 'Random' },
      { value: 'progressive', label: 'Progressive' },
      { value: 'alternating', label: 'Alternating' },
    ], defaultValue: 'constant' },
    { key: 'baseScale', label: 'Base Scale', type: 'number', min: 0.1, max: 3, step: 0.1, defaultValue: 1.0 },
    { key: 'variation', label: 'Variation', type: 'number', min: 0, max: 1, step: 0.1, defaultValue: 0.3 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 16,
};

export const OpacityField: BlockDefinition = {
  type: 'OpacityField',
  label: 'Opacity Field',
  category: 'Fields',
  description: 'Per-element opacity values',
  inputs: [],
  outputs: [output('opacities', 'Opacities', 'Field<number>')],
  defaultParams: { mode: 'constant', baseOpacity: 1.0, variation: 0.3, minOpacity: 0.1 },
  paramSchema: [
    { key: 'mode', label: 'Mode', type: 'select', options: [
      { value: 'constant', label: 'Constant' },
      { value: 'random', label: 'Random' },
      { value: 'fadeByIndex', label: 'Fade by Index' },
      { value: 'pulse', label: 'Pulse' },
    ], defaultValue: 'constant' },
    { key: 'baseOpacity', label: 'Base', type: 'number', min: 0, max: 1, step: 0.1, defaultValue: 1.0 },
    { key: 'variation', label: 'Variation', type: 'number', min: 0, max: 1, step: 0.1, defaultValue: 0.3 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 17,
};

// --- Behavior/Motion Parameter Fields ---

export const WobbleParams: BlockDefinition = {
  type: 'WobbleParams',
  label: 'Wobble Params',
  category: 'Fields',
  description: 'Per-element wobble behavior (liquid animations)',
  inputs: [],
  outputs: [output('wobble', 'Wobble', 'Field<Wobble>')],
  defaultParams: { baseAmplitude: 5, amplitudeVariation: 2, baseFrequency: 3, frequencyVariation: 1, decayRate: 2 },
  paramSchema: [
    { key: 'baseAmplitude', label: 'Amplitude', type: 'number', min: 0, max: 20, step: 1, defaultValue: 5 },
    { key: 'amplitudeVariation', label: 'Amp Var', type: 'number', min: 0, max: 10, step: 1, defaultValue: 2 },
    { key: 'baseFrequency', label: 'Frequency', type: 'number', min: 0.5, max: 10, step: 0.5, defaultValue: 3 },
    { key: 'decayRate', label: 'Decay Rate', type: 'number', min: 0, max: 5, step: 0.5, defaultValue: 2 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 18,
};

export const SpiralParams: BlockDefinition = {
  type: 'SpiralParams',
  label: 'Spiral Params',
  category: 'Fields',
  description: 'Per-element spiral motion (particle effects)',
  inputs: [],
  outputs: [output('spiral', 'Spiral', 'Field<Spiral>')],
  defaultParams: { baseRadius: 10, radiusVariation: 5, baseFrequency: 2, decayRate: 1.5 },
  paramSchema: [
    { key: 'baseRadius', label: 'Radius', type: 'number', min: 1, max: 50, step: 1, defaultValue: 10 },
    { key: 'radiusVariation', label: 'Radius Var', type: 'number', min: 0, max: 25, step: 1, defaultValue: 5 },
    { key: 'baseFrequency', label: 'Frequency', type: 'number', min: 0.5, max: 5, step: 0.5, defaultValue: 2 },
    { key: 'decayRate', label: 'Decay Rate', type: 'number', min: 0, max: 5, step: 0.5, defaultValue: 1.5 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 19,
};

export const WaveParams: BlockDefinition = {
  type: 'WaveParams',
  label: 'Wave Params',
  category: 'Fields',
  description: 'Per-element wave motion (wave ripple effects)',
  inputs: [],
  outputs: [output('wave', 'Wave', 'Field<Wave>')],
  defaultParams: { amplitudeY: 35, amplitudeScale: 0.25, amplitudeRotation: 15, waveCycles: 3, decayRate: 1 },
  paramSchema: [
    { key: 'amplitudeY', label: 'Y Amplitude', type: 'number', min: 0, max: 100, step: 5, defaultValue: 35 },
    { key: 'amplitudeScale', label: 'Scale Amp', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 0.25 },
    { key: 'amplitudeRotation', label: 'Rotation Amp', type: 'number', min: 0, max: 45, step: 5, defaultValue: 15 },
    { key: 'waveCycles', label: 'Wave Cycles', type: 'number', min: 1, max: 10, step: 1, defaultValue: 3 },
    { key: 'decayRate', label: 'Decay Rate', type: 'number', min: 0, max: 5, step: 0.5, defaultValue: 1 },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 20,
};

export const JitterParams: BlockDefinition = {
  type: 'JitterParams',
  label: 'Jitter Params',
  category: 'Fields',
  description: 'Per-element jitter/shake (glitch effects)',
  inputs: [],
  outputs: [output('jitter', 'Jitter', 'Field<Jitter>')],
  defaultParams: { baseAmplitudeX: 5, baseAmplitudeY: 5, variation: 0.3, frequency: 10, bounded: true },
  paramSchema: [
    { key: 'baseAmplitudeX', label: 'X Amplitude', type: 'number', min: 0, max: 50, step: 1, defaultValue: 5 },
    { key: 'baseAmplitudeY', label: 'Y Amplitude', type: 'number', min: 0, max: 50, step: 1, defaultValue: 5 },
    { key: 'frequency', label: 'Frequency', type: 'number', min: 1, max: 30, step: 1, defaultValue: 10 },
    { key: 'bounded', label: 'Bounded', type: 'boolean', defaultValue: true },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 21,
};

export const EasingField: BlockDefinition = {
  type: 'EasingField',
  label: 'Easing Field',
  category: 'Fields',
  description: 'Per-element easing function selection',
  inputs: [],
  outputs: [output('easings', 'Easings', 'Field<string>')],
  defaultParams: { mode: 'constant', baseEasing: 'easeOutCubic', altEasing: 'easeInCubic' },
  paramSchema: [
    { key: 'mode', label: 'Mode', type: 'select', options: [
      { value: 'constant', label: 'Constant' },
      { value: 'random', label: 'Random' },
      { value: 'alternating', label: 'Alternating' },
    ], defaultValue: 'constant' },
    { key: 'baseEasing', label: 'Base Easing', type: 'select', options: [
      { value: 'linear', label: 'Linear' },
      { value: 'easeOutCubic', label: 'Ease Out Cubic' },
      { value: 'easeInCubic', label: 'Ease In Cubic' },
      { value: 'easeInOutCubic', label: 'Ease In Out Cubic' },
      { value: 'easeOutBack', label: 'Ease Out Back' },
    ], defaultValue: 'easeOutCubic' },
  ],
  color: '#a855f7',
  laneKind: 'Fields',
  priority: 22,
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

export const PhaseProgress: BlockDefinition = {
  type: 'phaseProgress',
  label: 'Phase Progress',
  category: 'Time',
  description: 'Extract eased progress signal from PhaseMachine',
  inputs: [input('phase', 'Phase', 'Signal<PhaseSample>')],
  outputs: [output('progress', 'Progress', 'Signal<Unit>')],
  defaultParams: {},
  paramSchema: [],
  color: '#22c55e',
  laneKind: 'Phase',
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

export const PerElementProgress: BlockDefinition = {
  type: 'perElementProgress',
  label: 'Per-Element Progress',
  category: 'Compose',
  description: 'Per-element staggered animation progress (0-1)',
  inputs: [
    input('phase', 'Phase', 'Signal<PhaseSample>'),
    input('delays', 'Delays', 'Field<Duration>'),
    input('durations', 'Durations', 'Field<Duration>'),
  ],
  outputs: [output('progress', 'Progress', 'Signal<Unit>')],
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
        { value: 'easeOutCubic', label: 'Ease Out Cubic' },
        { value: 'easeInOutCubic', label: 'Ease In Out Cubic' },
      ],
      defaultValue: 'easeOutCubic',
    },
  ],
  color: '#f97316',
  laneKind: 'Spec',
  priority: 2,
};

export const LerpPoints: BlockDefinition = {
  type: 'lerpPoints',
  label: 'Lerp Points',
  category: 'Compose',
  description: 'Interpolate per-element from start to end positions based on progress',
  inputs: [
    input('starts', 'Starts', 'Field<Point>'),
    input('ends', 'Ends', 'Field<Point>'),
    input('progress', 'Progress', 'Signal<Unit>'),
  ],
  outputs: [output('positions', 'Positions', 'Signal<Point>')],
  defaultParams: {},
  paramSchema: [],
  color: '#f97316',
  laneKind: 'Spec',
  laneFlavor: 'Motion',
  priority: 3,
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

export const GlowFilter: BlockDefinition = {
  type: 'glowFilter',
  label: 'Glow Filter',
  category: 'FX',
  description: 'Create an SVG glow filter definition',
  inputs: [],
  outputs: [output('filter', 'Filter', 'FilterDef')],
  defaultParams: {
    color: '#ffffff',
    blur: 10,
    intensity: 2,
  },
  paramSchema: [
    { key: 'color', label: 'Color', type: 'color', defaultValue: '#ffffff' },
    { key: 'blur', label: 'Blur', type: 'number', min: 1, max: 50, step: 1, defaultValue: 10 },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0.5, max: 5, step: 0.1, defaultValue: 2 },
  ],
  color: '#ec4899',
  laneKind: 'Program',
  laneFlavor: 'Style',
  priority: 5,
};

export const CircleNode: BlockDefinition = {
  type: 'circleNode',
  label: 'Circle Node',
  category: 'Render',
  description: 'Create a circle render node',
  inputs: [
    input('position', 'Position', 'Signal<Point>'),
    input('filter', 'Filter', 'FilterDef'),
  ],
  outputs: [output('node', 'Node', 'RenderNode')],
  defaultParams: {
    radius: 5,
    fill: '#ffffff',
    opacity: 1,
  },
  paramSchema: [
    { key: 'radius', label: 'Radius', type: 'number', min: 0.5, max: 50, step: 0.5, defaultValue: 5 },
    { key: 'fill', label: 'Fill', type: 'color', defaultValue: '#ffffff' },
    { key: 'opacity', label: 'Opacity', type: 'number', min: 0, max: 1, step: 0.1, defaultValue: 1 },
  ],
  color: '#ef4444',
  laneKind: 'Program',
  priority: 3,
};

export const GroupNode: BlockDefinition = {
  type: 'groupNode',
  label: 'Group Node',
  category: 'Render',
  description: 'Group multiple render nodes',
  inputs: [input('nodes', 'Nodes', 'RenderNode[]')],
  outputs: [output('group', 'Group', 'RenderNode')],
  defaultParams: {},
  paramSchema: [],
  color: '#ef4444',
  laneKind: 'Program',
  priority: 4,
};

export const RenderTreeAssemble: BlockDefinition = {
  type: 'renderTreeAssemble',
  label: 'Assemble Tree',
  category: 'Render',
  description: 'Assemble RenderNode(s) with filters into a RenderTree',
  inputs: [
    input('root', 'Root', 'RenderNode'),
    input('filter', 'Filter', 'FilterDef'),
  ],
  outputs: [output('tree', 'Tree', 'RenderTree')],
  defaultParams: {},
  paramSchema: [],
  color: '#ef4444',
  laneKind: 'Program',
  priority: 5,
};

export const PerElementCircles: BlockDefinition = {
  type: 'perElementCircles',
  label: 'Per-Element Circles',
  category: 'Render',
  description: 'Render animated circles for each element position',
  inputs: [
    input('positions', 'Positions', 'Signal<Point>'),
    input('count', 'Count', 'ElementCount'),
    input('filter', 'Filter', 'FilterDef'),
  ],
  outputs: [output('tree', 'Tree', 'RenderTree')],
  defaultParams: {
    radius: 5,
    fill: '#ffffff',
    opacity: 1,
  },
  paramSchema: [
    { key: 'radius', label: 'Radius', type: 'number', min: 0.5, max: 50, step: 0.5, defaultValue: 5 },
    { key: 'fill', label: 'Fill', type: 'color', defaultValue: '#ffffff' },
    { key: 'opacity', label: 'Opacity', type: 'number', min: 0, max: 1, step: 0.1, defaultValue: 1 },
  ],
  color: '#ef4444',
  laneKind: 'Program',
  priority: 2,
};

// --- New Render Blocks ---

export const PathRenderer: BlockDefinition = {
  type: 'PathRenderer',
  label: 'Path Renderer',
  category: 'Render',
  description: 'Render SVG paths with stroke styling',
  inputs: [
    input('paths', 'Paths', 'Field<Path>'),
    input('progress', 'Progress', 'Signal<Unit>'),
  ],
  outputs: [output('tree', 'Tree', 'RenderTree')],
  defaultParams: { strokeWidth: 4, strokeColor: '#ffffff', strokeLinecap: 'round', strokeLinejoin: 'round', fillColor: 'none' },
  paramSchema: [
    { key: 'strokeWidth', label: 'Stroke Width', type: 'number', min: 1, max: 20, step: 1, defaultValue: 4 },
    { key: 'strokeColor', label: 'Stroke Color', type: 'color', defaultValue: '#ffffff' },
    { key: 'strokeLinecap', label: 'Line Cap', type: 'select', options: [
      { value: 'butt', label: 'Butt' },
      { value: 'round', label: 'Round' },
      { value: 'square', label: 'Square' },
    ], defaultValue: 'round' },
    { key: 'fillColor', label: 'Fill Color', type: 'color', defaultValue: 'none' },
  ],
  color: '#ef4444',
  laneKind: 'Program',
  priority: 6,
};

export const StrokeStyle: BlockDefinition = {
  type: 'StrokeStyle',
  label: 'Stroke Style',
  category: 'FX',
  description: 'Configure stroke appearance for paths',
  inputs: [],
  outputs: [output('style', 'Style', 'StrokeStyle')],
  defaultParams: { width: 4, color: '#ffffff', linecap: 'round', linejoin: 'round' },
  paramSchema: [
    { key: 'width', label: 'Width', type: 'number', min: 1, max: 20, step: 1, defaultValue: 4 },
    { key: 'color', label: 'Color', type: 'color', defaultValue: '#ffffff' },
    { key: 'linecap', label: 'Line Cap', type: 'select', options: [
      { value: 'butt', label: 'Butt' },
      { value: 'round', label: 'Round' },
      { value: 'square', label: 'Square' },
    ], defaultValue: 'round' },
    { key: 'dasharray', label: 'Dash Array', type: 'string', defaultValue: '' },
  ],
  color: '#ec4899',
  laneKind: 'Program',
  laneFlavor: 'Style',
  priority: 6,
};

export const GooFilter: BlockDefinition = {
  type: 'GooFilter',
  label: 'Goo Filter',
  category: 'FX',
  description: 'Metaball/liquid blob merging effect',
  inputs: [],
  outputs: [output('filter', 'Filter', 'FilterDef')],
  defaultParams: { blur: 10, threshold: 20, contrast: 35 },
  paramSchema: [
    { key: 'blur', label: 'Blur', type: 'number', min: 1, max: 30, step: 1, defaultValue: 10 },
    { key: 'threshold', label: 'Threshold', type: 'number', min: 1, max: 50, step: 1, defaultValue: 20 },
    { key: 'contrast', label: 'Contrast', type: 'number', min: 10, max: 100, step: 5, defaultValue: 35 },
  ],
  color: '#ec4899',
  laneKind: 'Program',
  laneFlavor: 'Style',
  priority: 7,
};

export const RGBSplitFilter: BlockDefinition = {
  type: 'RGBSplitFilter',
  label: 'RGB Split',
  category: 'FX',
  description: 'Chromatic aberration / RGB channel separation',
  inputs: [],
  outputs: [output('filter', 'Filter', 'FilterDef')],
  defaultParams: { redOffsetX: 3, redOffsetY: 0, blueOffsetX: -3, blueOffsetY: 0 },
  paramSchema: [
    { key: 'redOffsetX', label: 'Red X', type: 'number', min: -20, max: 20, step: 1, defaultValue: 3 },
    { key: 'redOffsetY', label: 'Red Y', type: 'number', min: -20, max: 20, step: 1, defaultValue: 0 },
    { key: 'blueOffsetX', label: 'Blue X', type: 'number', min: -20, max: 20, step: 1, defaultValue: -3 },
    { key: 'blueOffsetY', label: 'Blue Y', type: 'number', min: -20, max: 20, step: 1, defaultValue: 0 },
  ],
  color: '#ec4899',
  laneKind: 'Program',
  laneFlavor: 'Style',
  priority: 8,
};

export const MaskReveal: BlockDefinition = {
  type: 'MaskReveal',
  label: 'Mask Reveal',
  category: 'Render',
  description: 'Wipe/reveal mask transition',
  inputs: [
    input('content', 'Content', 'RenderTree'),
    input('progress', 'Progress', 'Signal<Unit>'),
  ],
  outputs: [output('tree', 'Tree', 'RenderTree')],
  defaultParams: { direction: 'left-to-right', softEdge: 20, sceneWidth: 800, sceneHeight: 600 },
  paramSchema: [
    { key: 'direction', label: 'Direction', type: 'select', options: [
      { value: 'left-to-right', label: 'Left → Right' },
      { value: 'right-to-left', label: 'Right → Left' },
      { value: 'top-to-bottom', label: 'Top → Bottom' },
      { value: 'bottom-to-top', label: 'Bottom → Top' },
      { value: 'radial', label: 'Radial' },
    ], defaultValue: 'left-to-right' },
    { key: 'softEdge', label: 'Soft Edge', type: 'number', min: 0, max: 100, step: 5, defaultValue: 20 },
  ],
  color: '#ef4444',
  laneKind: 'Program',
  priority: 9,
};

// --- Text Source ---

export const TextSource: BlockDefinition = {
  type: 'TextSource',
  label: 'Text Source',
  category: 'Scene',
  description: 'Create scene from text (per-character elements)',
  inputs: [],
  outputs: [output('scene', 'Scene', 'Scene')],
  defaultParams: { text: 'LOOM99', fontSize: 48, letterSpacing: 4, startX: 100, startY: 200 },
  paramSchema: [
    { key: 'text', label: 'Text', type: 'string', defaultValue: 'LOOM99' },
    { key: 'fontSize', label: 'Font Size', type: 'number', min: 12, max: 200, step: 4, defaultValue: 48 },
    { key: 'letterSpacing', label: 'Letter Spacing', type: 'number', min: 0, max: 20, step: 1, defaultValue: 4 },
    { key: 'startX', label: 'Start X', type: 'number', min: 0, max: 500, step: 10, defaultValue: 100 },
    { key: 'startY', label: 'Start Y', type: 'number', min: 0, max: 500, step: 10, defaultValue: 200 },
  ],
  color: '#4a9eff',
  laneKind: 'Scene',
  priority: 2,
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

export const ElementCount: BlockDefinition = {
  type: 'elementCount',
  label: 'Element Count',
  category: 'Adapters',
  description: 'Get the number of elements from scene targets',
  inputs: [input('targets', 'Targets', 'SceneTargets')],
  outputs: [output('count', 'Count', 'ElementCount')],
  defaultParams: {},
  paramSchema: [],
  color: '#71717a',
  laneKind: 'Scene',
  priority: 10,
};

// =============================================================================
// Block Registry
// =============================================================================

export const BLOCK_DEFINITIONS: readonly BlockDefinition[] = [
  // Macros (Recipe Starters) - at the top
  MacroLineDrawing,
  MacroParticles,
  MacroBouncingCircle,
  MacroOscillator,
  MacroRadialBurst,
  MacroCascade,
  MacroScatter,
  MacroImplosion,
  MacroSwarm,
  MacroLoveYouBaby,
  MacroNebula,
  MacroGlitchStorm,
  MacroAurora,
  // Scene
  SVGPathSource,
  SamplePoints,
  TextSource,
  // Fields - Basic
  RadialOrigin,
  LinearStagger,
  RegionField,
  ConstantFieldDuration,
  WaveStagger,
  SizeVariation,
  NoiseField,
  ColorField,
  // Fields - Timing/Stagger
  RandomStagger,
  IndexStagger,
  DurationVariation,
  DecayEnvelope,
  // Fields - Position/Spatial
  ExplosionOrigin,
  TopDropOrigin,
  GridPositions,
  CenterPoint,
  // Fields - Transform
  RotationField,
  ScaleField,
  OpacityField,
  // Fields - Behavior/Motion
  WobbleParams,
  SpiralParams,
  WaveParams,
  JitterParams,
  // Fields - Easing
  EasingField,
  // Math (Slice 2.5)
  MathConstNumber,
  MathAddScalar,
  MathMulScalar,
  MathSinScalar,
  // Time
  PhaseMachine,
  EaseRamp,
  PhaseProgress,
  // Compose
  PerElementTransport,
  PerElementProgress,
  LerpPoints,
  OutputProgram,
  // Render
  ParticleRenderer,
  GlowFilter,
  CircleNode,
  GroupNode,
  RenderTreeAssemble,
  PerElementCircles,
  PathRenderer,
  MaskReveal,
  Canvas,
  // FX (Filters and Styles)
  StrokeStyle,
  GooFilter,
  RGBSplitFilter,
  // Adapters
  SceneToTargets,
  FieldToSignal,
  LiftScalarToField,
  ElementCount,
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
