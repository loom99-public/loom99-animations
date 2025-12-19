/**
 * @file Domain blocks - Primitives for element population and identity.
 *
 * These are the foundation blocks that create element populations with stable IDs.
 * Everything that needs per-element behavior (Fields) starts with a Domain.
 */
import { createBlock } from './factory';
import { input, output } from './utils';

/**
 * DomainN - Create a domain with N elements.
 *
 * This is the fundamental primitive that creates elements with stable IDs.
 * Element IDs are stable across frames and recompiles for the same (n, seed) pair.
 */
export const DomainN = createBlock({
  type: 'DomainN',
  label: 'Domain N',
  form: 'primitive',
  subcategory: 'Sources',
  category: 'Scene',
  description: 'Create a domain with N elements, each with a stable ID',
  inputs: [
    input('n', 'Element Count', 'Scalar:number'),
  ],
  outputs: [
    output('domain', 'Domain', 'Domain'),
  ],
  paramSchema: [
    {
      key: 'n',
      label: 'Count',
      type: 'number',
      min: 1,
      max: 10000,
      step: 1,
      defaultValue: 100,
    },
    {
      key: 'seed',
      label: 'Seed',
      type: 'number',
      min: 0,
      max: 999999,
      step: 1,
      defaultValue: 0,
    },
  ],
  color: '#8B5CF6',
  laneKind: 'Scene',
  priority: 0,
});

/**
 * PositionMapGrid - Map domain elements to grid positions.
 *
 * Takes a Domain and produces Field<vec2> of positions arranged in a grid.
 */
export const PositionMapGrid = createBlock({
  type: 'PositionMapGrid',
  label: 'Grid Layout',
  form: 'primitive',
  subcategory: 'Spatial',
  category: 'Fields',
  description: 'Arrange domain elements in a grid pattern',
  inputs: [
    input('domain', 'Domain', 'Domain'),
  ],
  outputs: [
    output('pos', 'Positions', 'Field<vec2>'),
  ],
  paramSchema: [
    {
      key: 'rows',
      label: 'Rows',
      type: 'number',
      min: 1,
      max: 100,
      step: 1,
      defaultValue: 10,
    },
    {
      key: 'cols',
      label: 'Columns',
      type: 'number',
      min: 1,
      max: 100,
      step: 1,
      defaultValue: 10,
    },
    {
      key: 'spacing',
      label: 'Spacing',
      type: 'number',
      min: 1,
      max: 200,
      step: 1,
      defaultValue: 20,
    },
    {
      key: 'originX',
      label: 'Origin X',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 100,
    },
    {
      key: 'originY',
      label: 'Origin Y',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 100,
    },
    {
      key: 'order',
      label: 'Order',
      type: 'select',
      options: [
        { value: 'rowMajor', label: 'Row Major' },
        { value: 'serpentine', label: 'Serpentine' },
      ],
      defaultValue: 'rowMajor',
    },
  ],
  color: '#22C55E',
  laneKind: 'Fields',
  priority: 1,
});

/**
 * PositionMapCircle - Map domain elements to circular positions.
 *
 * Takes a Domain and produces Field<vec2> of positions arranged in a circle/ring.
 */
export const PositionMapCircle = createBlock({
  type: 'PositionMapCircle',
  label: 'Circle Layout',
  form: 'primitive',
  subcategory: 'Spatial',
  category: 'Fields',
  description: 'Arrange domain elements in a circle',
  inputs: [
    input('domain', 'Domain', 'Domain'),
  ],
  outputs: [
    output('pos', 'Positions', 'Field<vec2>'),
  ],
  paramSchema: [
    {
      key: 'centerX',
      label: 'Center X',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 400,
    },
    {
      key: 'centerY',
      label: 'Center Y',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 300,
    },
    {
      key: 'radius',
      label: 'Radius',
      type: 'number',
      min: 10,
      max: 500,
      step: 10,
      defaultValue: 150,
    },
    {
      key: 'startAngle',
      label: 'Start Angle (deg)',
      type: 'number',
      min: 0,
      max: 360,
      step: 15,
      defaultValue: 0,
    },
    {
      key: 'winding',
      label: 'Winding',
      type: 'select',
      options: [
        { value: '1', label: 'Clockwise' },
        { value: '-1', label: 'Counter-Clockwise' },
      ],
      defaultValue: '1',
    },
    {
      key: 'distribution',
      label: 'Distribution',
      type: 'select',
      options: [
        { value: 'even', label: 'Even' },
        { value: 'goldenAngle', label: 'Golden Angle' },
      ],
      defaultValue: 'even',
    },
  ],
  color: '#22C55E',
  laneKind: 'Fields',
  priority: 2,
});

/**
 * PositionMapLine - Map domain elements to linear positions.
 *
 * Takes a Domain and produces Field<vec2> of positions along a line.
 */
export const PositionMapLine = createBlock({
  type: 'PositionMapLine',
  label: 'Line Layout',
  form: 'primitive',
  subcategory: 'Spatial',
  category: 'Fields',
  description: 'Arrange domain elements along a line',
  inputs: [
    input('domain', 'Domain', 'Domain'),
  ],
  outputs: [
    output('pos', 'Positions', 'Field<vec2>'),
  ],
  paramSchema: [
    {
      key: 'ax',
      label: 'Start X',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 100,
    },
    {
      key: 'ay',
      label: 'Start Y',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 200,
    },
    {
      key: 'bx',
      label: 'End X',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 700,
    },
    {
      key: 'by',
      label: 'End Y',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 200,
    },
    {
      key: 'distribution',
      label: 'Distribution',
      type: 'select',
      options: [
        { value: 'even', label: 'Even' },
      ],
      defaultValue: 'even',
    },
  ],
  color: '#22C55E',
  laneKind: 'Fields',
  priority: 3,
});

/**
 * FieldConstNumber - Constant numeric field across all elements.
 */
export const FieldConstNumber = createBlock({
  type: 'FieldConstNumber',
  label: 'Constant Number',
  form: 'primitive',
  subcategory: 'Fields',
  category: 'Fields',
  description: 'Uniform numeric value for all elements',
  inputs: [
    input('domain', 'Domain', 'Domain'),
  ],
  outputs: [
    output('out', 'Value', 'Field<number>'),
  ],
  paramSchema: [
    {
      key: 'value',
      label: 'Value',
      type: 'number',
      min: -10000,
      max: 10000,
      step: 0.1,
      defaultValue: 1,
    },
  ],
  color: '#F59E0B',
  laneKind: 'Fields',
  priority: 4,
});

/**
 * FieldConstColor - Constant color field across all elements.
 */
export const FieldConstColor = createBlock({
  type: 'FieldConstColor',
  label: 'Constant Color',
  form: 'primitive',
  subcategory: 'Style',
  category: 'Fields',
  description: 'Uniform color for all elements',
  inputs: [
    input('domain', 'Domain', 'Domain'),
  ],
  outputs: [
    output('out', 'Color', 'Field<color>'),
  ],
  paramSchema: [
    {
      key: 'color',
      label: 'Color',
      type: 'color',
      defaultValue: '#3B82F6',
    },
  ],
  color: '#F59E0B',
  laneKind: 'Fields',
  priority: 5,
});

/**
 * FieldHash01ById - Per-element deterministic random in [0,1).
 *
 * Produces stable per-element variation based on element ID and seed.
 */
export const FieldHash01ById = createBlock({
  type: 'FieldHash01ById',
  label: 'Random Per Element',
  form: 'primitive',
  subcategory: 'Fields',
  category: 'Fields',
  description: 'Deterministic random value per element (0 to 1)',
  inputs: [
    input('domain', 'Domain', 'Domain'),
  ],
  outputs: [
    output('u', 'Random', 'Field<number>'),
  ],
  paramSchema: [
    {
      key: 'seed',
      label: 'Seed',
      type: 'number',
      min: 0,
      max: 999999,
      step: 1,
      defaultValue: 0,
    },
  ],
  color: '#EC4899',
  laneKind: 'Fields',
  priority: 6,
});

/**
 * FieldMapNumber - Map a numeric field with a unary function.
 */
export const FieldMapNumber = createBlock({
  type: 'FieldMapNumber',
  label: 'Map Number',
  form: 'primitive',
  subcategory: 'Math',
  category: 'Fields',
  description: 'Apply a function to each element of a numeric field',
  inputs: [
    input('x', 'Input', 'Field<number>'),
  ],
  outputs: [
    output('y', 'Output', 'Field<number>'),
  ],
  paramSchema: [
    {
      key: 'fn',
      label: 'Function',
      type: 'select',
      options: [
        { value: 'neg', label: 'Negate' },
        { value: 'abs', label: 'Absolute' },
        { value: 'sin', label: 'Sine' },
        { value: 'cos', label: 'Cosine' },
        { value: 'tanh', label: 'Tanh' },
        { value: 'smoothstep', label: 'Smoothstep' },
        { value: 'scale', label: 'Scale' },
        { value: 'offset', label: 'Offset' },
        { value: 'clamp', label: 'Clamp' },
      ],
      defaultValue: 'sin',
    },
    {
      key: 'k',
      label: 'Parameter',
      type: 'number',
      min: -100,
      max: 100,
      step: 0.1,
      defaultValue: 1,
    },
    {
      key: 'a',
      label: 'Range Min',
      type: 'number',
      min: -100,
      max: 100,
      step: 0.1,
      defaultValue: 0,
    },
    {
      key: 'b',
      label: 'Range Max',
      type: 'number',
      min: -100,
      max: 100,
      step: 0.1,
      defaultValue: 1,
    },
  ],
  color: '#A855F7',
  laneKind: 'Fields',
  priority: 10,
});

/**
 * FieldMapVec2 - Map a vec2 field with a spatial transformation.
 */
export const FieldMapVec2 = createBlock({
  type: 'FieldMapVec2',
  label: 'Transform Positions',
  form: 'primitive',
  subcategory: 'Math',
  category: 'Fields',
  description: 'Apply spatial transformations to position fields',
  inputs: [
    input('vec', 'Input', 'Field<vec2>'),
  ],
  outputs: [
    output('out', 'Output', 'Field<vec2>'),
  ],
  paramSchema: [
    {
      key: 'fn',
      label: 'Function',
      type: 'select',
      options: [
        { value: 'rotate', label: 'Rotate' },
        { value: 'scale', label: 'Scale' },
        { value: 'translate', label: 'Translate' },
        { value: 'reflect', label: 'Reflect' },
      ],
      defaultValue: 'rotate',
    },
    {
      key: 'angle',
      label: 'Angle (deg)',
      type: 'number',
      min: -360,
      max: 360,
      step: 15,
      defaultValue: 0,
    },
    {
      key: 'scaleX',
      label: 'Scale X',
      type: 'number',
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1,
    },
    {
      key: 'scaleY',
      label: 'Scale Y',
      type: 'number',
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1,
    },
    {
      key: 'offsetX',
      label: 'Offset X',
      type: 'number',
      min: -500,
      max: 500,
      step: 10,
      defaultValue: 0,
    },
    {
      key: 'offsetY',
      label: 'Offset Y',
      type: 'number',
      min: -500,
      max: 500,
      step: 10,
      defaultValue: 0,
    },
    {
      key: 'centerX',
      label: 'Center X',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 400,
    },
    {
      key: 'centerY',
      label: 'Center Y',
      type: 'number',
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 300,
    },
  ],
  color: '#A855F7',
  laneKind: 'Fields',
  priority: 11,
});

/**
 * FieldZipNumber - Combine two numeric fields with a binary operation.
 */
export const FieldZipNumber = createBlock({
  type: 'FieldZipNumber',
  label: 'Combine Numbers',
  form: 'primitive',
  subcategory: 'Math',
  category: 'Fields',
  description: 'Combine two numeric fields element-wise',
  inputs: [
    input('a', 'A', 'Field<number>'),
    input('b', 'B', 'Field<number>'),
  ],
  outputs: [
    output('out', 'Result', 'Field<number>'),
  ],
  paramSchema: [
    {
      key: 'op',
      label: 'Operation',
      type: 'select',
      options: [
        { value: 'add', label: 'Add' },
        { value: 'sub', label: 'Subtract' },
        { value: 'mul', label: 'Multiply' },
        { value: 'min', label: 'Min' },
        { value: 'max', label: 'Max' },
      ],
      defaultValue: 'add',
    },
  ],
  color: '#A855F7',
  laneKind: 'Fields',
  priority: 12,
});

// =============================================================================
// Time/Phase Blocks
// =============================================================================

/**
 * PhaseClock - Derived clock that transforms upstream time into phase.
 *
 * Generates phase [0,1] and progress u [0,1] from upstream time signal.
 * Requires a TimeRoot input for explicit time management.
 */
export const PhaseClock = createBlock({
  type: 'PhaseClock',
  label: 'Phase Clock',
  form: 'primitive',
  subcategory: 'Time',
  category: 'Time',
  description: 'Derived clock: transforms upstream time into phase [0,1]',
  inputs: [
    input('tIn', 'Time In', 'Signal<time>'),
  ],
  outputs: [
    output('phase', 'Phase', 'Signal<phase>'),
    output('u', 'Progress', 'Signal<Unit>'),
  ],
  paramSchema: [
    {
      key: 'period',
      label: 'Period (s)',
      type: 'number',
      min: 0.1,
      max: 60.0,
      step: 0.1,
      defaultValue: 3.0,
    },
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'loop', label: 'Loop' },
        { value: 'once', label: 'Once' },
        { value: 'pingpong', label: 'Ping-Pong' },
      ],
      defaultValue: 'loop',
    },
  ],
  color: '#6366F1',
  laneKind: 'Phase',
  priority: 0,
});

/**
 * PhaseClockLegacy - Legacy time-based phase progression.
 *
 * @deprecated Use PhaseClock with TimeRoot input instead.
 *
 * This block owns its own time, which conflicts with TimeRoot-based time management.
 * Kept for backward compatibility with existing patches.
 */
export const PhaseClockLegacy = createBlock({
  type: 'PhaseClockLegacy',
  label: 'Phase Clock (Legacy)',
  form: 'primitive',
  subcategory: 'Time',
  category: 'Time',
  description: 'Deprecated. Use new PhaseClock with TimeRoot.',
  inputs: [],
  outputs: [
    output('phase', 'Phase', 'Signal<number>'),
  ],
  paramSchema: [
    {
      key: 'duration',
      label: 'Duration (s)',
      type: 'number',
      min: 0.1,
      max: 10.0,
      step: 0.1,
      defaultValue: 3.0,
    },
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'loop', label: 'Loop' },
        { value: 'once', label: 'Once' },
        { value: 'pingpong', label: 'Ping-Pong' },
      ],
      defaultValue: 'loop',
    },
    {
      key: 'offset',
      label: 'Offset (s)',
      type: 'number',
      min: -10.0,
      max: 10.0,
      step: 0.1,
      defaultValue: 0.0,
    },
  ],
  color: '#9CA3AF', // Gray to indicate deprecated
  laneKind: 'Phase',
  priority: 100, // Lower priority than new PhaseClock
});

/**
 * TriggerOnWrap - Detects when a phase signal wraps from 1 to 0.
 *
 * Useful for converting continuous phase into discrete rhythm events.
 */
export const TriggerOnWrap = createBlock({
  type: 'TriggerOnWrap',
  label: 'Trigger On Wrap',
  form: 'primitive',
  subcategory: 'Time',
  category: 'Events',
  description: 'Emit a trigger when phase wraps from 1 to 0',
  inputs: [
    input('phase', 'Phase', 'Signal<number>'),
  ],
  outputs: [
    output('trigger', 'Trigger', 'Signal<Unit>'),
  ],
  paramSchema: [],
  color: '#F59E0B',
  laneKind: 'Phase',
  priority: 1,
});

// =============================================================================
// Render Blocks
// =============================================================================

/**
 * RenderInstances2D - Materialize Domain + Fields into rendered circles.
 *
 * This is the main renderer that takes domain, positions, radius, and color
 * and produces a RenderTree of circles.
 */
export const RenderInstances2D = createBlock({
  type: 'RenderInstances2D',
  label: 'Render 2D Instances',
  form: 'primitive',
  subcategory: 'Render',
  category: 'Render',
  description: 'Materialize Domain + Fields into circles',
  inputs: [
    input('domain', 'Domain', 'Domain'),
    input('positions', 'Positions', 'Field<vec2>'),
    input('radius', 'Radius', 'Field<number>'),
    input('color', 'Color', 'Field<color>'),
  ],
  outputs: [
    output('render', 'Render', 'RenderTree'),
  ],
  paramSchema: [
    {
      key: 'opacity',
      label: 'Opacity',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 1.0,
    },
    {
      key: 'glow',
      label: 'Glow',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'glowIntensity',
      label: 'Glow Intensity',
      type: 'number',
      min: 0.5,
      max: 5,
      step: 0.1,
      defaultValue: 2.0,
    },
  ],
  color: '#EF4444',
  laneKind: 'Output',
  priority: 0,
});

// =============================================================================
// Macros (Recipe Starters)
// =============================================================================

/**
 * Helper to create macro block definitions.
 */
function createMacro(config: {
  type: string;
  label: string;
  description: string;
  priority: number;
  color?: string;
}): import('./types').BlockDefinition {
  return {
    type: config.type,
    label: config.label,
    form: 'macro',
    subcategory: 'Animation Styles',
    category: 'Macros',
    description: config.description,
    inputs: [],
    outputs: [],
    defaultParams: {},
    paramSchema: [],
    color: config.color || '#fbbf24',
    laneKind: 'Fields', // Macros can be dropped anywhere, but Fields is a reasonable default
    priority: config.priority,
  };
}

/**
 * Breathing Dots macro - Grid of dots with pulsing size animation.
 *
 * Uses domain composites: GridPoints + PhaseClock + DotsRenderer.
 * The PhaseClock drives radius via the bus system.
 */
export const MacroBreathingDots = createMacro({
  type: 'macro:breathingDots',
  label: 'Breathing Dots',
  description: 'Grid of glowing dots that pulse in size. Uses domain primitives and bus-driven animation.',
  priority: -100,
  color: '#00ccff',
});
