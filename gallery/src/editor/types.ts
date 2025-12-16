/**
 * Editor Type Definitions
 *
 * Core types for the unified animation editor.
 * These types are loosely coupled to V4 kernel types - editor has its own
 * type system that compiles to V4 primitives.
 */

// =============================================================================
// Bus Type System (Core/Internal Split)
// =============================================================================

/**
 * World categories for type system.
 * Only signal and field - scalar is semantics, special is category.
 */
export type TypeWorld = 'signal' | 'field';

/**
 * Core domains - what users see in the bus system.
 * These are the learnable creative vocabulary.
 */
export type CoreDomain =
  | 'number'   // Numeric values
  | 'vec2'     // 2D positions/vectors
  | 'color'    // Color values
  | 'boolean'  // True/false values
  | 'time'     // Time values (always in seconds)
  | 'phase'    // Phase values [0,1]
  | 'rate'     // Rate/multiplier values
  | 'trigger'; // Pulse/event signals

/**
 * Internal domains - engine plumbing, not bus-eligible by default.
 */
export type InternalDomain =
  | 'point'        // Point semantics
  | 'duration'     // Duration semantics
  | 'hsl'          // HSL color space
  | 'path'         // Path data
  | 'wobble'       // Wobble modulator config
  | 'spiral'       // Spiral modulator config
  | 'wave'         // Wave modulator config
  | 'jitter'       // Jitter modulator config
  | 'program'      // Compiled program
  | 'renderTree'   // Render tree output
  | 'renderNode'   // Single render node
  | 'filterDef'    // SVG filter definition
  | 'strokeStyle'  // Stroke configuration
  | 'elementCount' // Number of elements
  | 'scene'        // Scene data
  | 'sceneTargets' // Scene target points
  | 'sceneStrokes' // Scene stroke paths
  | 'event';       // Generic events

/**
 * All domains (core + internal).
 */
export type Domain = CoreDomain | InternalDomain;

/**
 * Category for type filtering.
 */
export type TypeCategory = 'core' | 'internal';

/**
 * Type descriptor for bus typing system.
 * Separates user-facing core types from internal resource types.
 */
export interface TypeDesc {
  /** World: signal=continuous time, field=per-element */
  readonly world: TypeWorld;

  /** Domain: what type of value */
  readonly domain: Domain;

  /** Category: core (user-facing) or internal (engine) */
  readonly category: TypeCategory;

  /** Whether this type can be used for buses */
  readonly busEligible: boolean;

  /** Optional semantic information for precise matching */
  readonly semantics?: string;

  /** Optional unit information (e.g., "seconds", "beats") */
  readonly unit?: string;
}

/**
 * Bus combination modes for multiple publishers.
 */
export type BusCombineMode = 'sum' | 'average' | 'max' | 'min' | 'last' | 'layer';

/**
 * Bus interface - central typed signal distributors.
 */
export interface Bus {
  /** Unique identifier for this bus */
  readonly id: string;

  /** Human-readable name */
  name: string;

  /** Type descriptor for this bus */
  readonly type: TypeDesc;

  /** How to combine multiple publishers */
  combineMode: BusCombineMode;

  /** Default value when no publishers (typed by domain) */
  defaultValue: unknown;

  /** Sort key for deterministic publisher ordering */
  sortKey: number;
}

/**
 * Adapter step for type conversions.
 */
export interface AdapterStep {
  /** Identifier for the adapter function */
  readonly adapterId: string;

  /** Parameters for the adapter */
  readonly params: Record<string, unknown>;
}

/**
 * Endpoint reference for routing.
 */
export interface BindingEndpoint {
  /** Block ID */
  readonly blockId: BlockId;

  /** Port name */
  readonly port: string;
}

/**
 * Publisher - connects an output to a bus.
 */
export interface Publisher {
  /** Unique identifier */
  readonly id: string;

  /** Bus ID being published to */
  readonly busId: string;

  /** Source output endpoint */
  readonly from: BindingEndpoint;

  /** Optional adapter chain */
  readonly adapterChain?: AdapterStep[];

  /** Whether this publisher is active */
  enabled: boolean;

  /** Optional weight for weighted combine modes */
  readonly weight?: number;

  /** Sort key for deterministic ordering within bus */
  sortKey: number;
}

/**
 * Listener - connects a bus to an input.
 */
export interface Listener {
  /** Unique identifier */
  readonly id: string;

  /** Bus ID being subscribed to */
  readonly busId: string;

  /** Target input endpoint */
  readonly to: BindingEndpoint;

  /** Optional adapter chain */
  readonly adapterChain?: AdapterStep[];

  /** Whether this listener is active */
  enabled: boolean;
}

// =============================================================================
// Slot Types (what can connect to what)
// =============================================================================

/**
 * Slot types define what can connect to what in the patch bay.
 * Start loose (strings), tighten to branded types in Phase 3.
 */
export type SlotType =
  | 'Scene'
  | 'SceneTargets'      // Sampled points from scene
  | 'SceneStrokes'      // Path segments for line drawing
  | 'Scalar:number'     // Compile-time constant number
  | 'Scalar:vec2'       // Compile-time constant vec2
  | 'Field<Point>'      // Per-element positions
  | 'Field<Duration>'   // Per-element durations
  | 'Field<number>'     // Per-element numbers (opacity, angles, etc.)
  | 'Field<Phase>'      // Per-element phase offsets
  | 'Signal<Unit>'      // Unit signal (dimensionless progress)
  | 'Signal<Phase>'     // Phase signal [0,1]
  | 'Signal<PhaseSample>' // Phase with start/duration
  | 'Signal<number>'    // Number signal (e.g., rotation angle)
  | 'Signal<Color>'     // Color signal
  | 'Signal<Point>'     // Point signal (single moving point)
  | 'Signal<vec2>'      // Vec2 signal (2D vector)
  | 'Program'           // Compiled animation program
  | 'RenderTree'        // Render tree output
  | 'RenderNode'        // Single render node
  | 'FilterDef'         // SVG filter definition
  | 'StrokeStyle'       // Stroke configuration
  | 'EventStream'       // Event stream
  | 'ElementCount';     // Number of animated elements

/**
 * Slot (port) definition on a block.
 */
export interface Slot {
  id: string;           // Port identifier (e.g., 'scene', 'output')
  label: string;        // Display label
  type: SlotType;       // What can connect to this port
}

// =============================================================================
// Block Types
// =============================================================================

/**
 * Block type identifiers (primitives + composites).
 */
export type BlockType =
  // Source blocks (emit fundamental values)
  | 'Clock'
  | 'PhaseField'
  | 'DurationField'
  | 'SVGPathSource'
  | 'RadialOrigin'
  | 'GridOrigin'
  | 'Constant'
  | 'ColorSource'
  | 'Noise'

  // Modulator blocks (transform signals)
  | 'PhaseModulator'
  | 'ColorModulator'
  | 'OffsetModulator'
  | 'ScaleModulator'
  | 'RotateModulator'
  | 'WobbleModulator'
  | 'SpiralModulator'
  | 'WaveModulator'
  | 'JitterModulator'

  // Adapter blocks (convert types)
  | 'PhaseSampler'
  | 'PointToVec2'
  | 'Vec2ToPoint'
  | 'NumberField'
  | 'FieldConst'

  // Renderer blocks (produce output)
  | 'LineRenderer'
  | 'ParticleRenderer'
  | 'TransformRenderer'

  // Composites / Macros
  | 'demoProgram'        // Legacy macro
  | 'demoParticles'      // Legacy macro
  | 'demoLineDrawing'    // Legacy macro

  // Composition blocks (filters, effects)
  | 'Compose';           // Combine multiple render trees

/**
 * Block categories for UI organization.
 */
export type BlockCategory =
  | 'Sources'
  | 'Modulators'
  | 'Adapters'
  | 'Renderers'
  | 'Composite'
  | 'Macros';

/**
 * Block forms (tier system).
 */
export type BlockForm =
  | 'primitive'          // Atomic building block
  | 'composite'          // Built from primitives (editable graph)
  | 'legacy-composite'   // Old macro system (not editable)
  | 'macro';             // Expands into blocks (deprecated)

// =============================================================================
// Lane System
// =============================================================================

/**
 * Lane kinds (semantic organization).
 */
export type LaneKind =
  | 'Scene'       // Scene definition (geometry, targets)
  | 'Phase'       // Phase control (Clock, phase modulators)
  | 'Fields'      // Per-element fields (delays, durations)
  | 'Spec'        // Spec signals (colors, transforms)
  | 'Program'     // Compilation (PhaseSampler, etc.)
  | 'Output'      // Renderers
  | 'Time'        // [Deprecated] Time control
  | 'Modulation'  // [Deprecated] Modulation layer
  | 'Rendering';  // [Deprecated] Final output

export type LaneId = string;

/**
 * Lane (horizontal row in patch bay).
 */
export interface Lane {
  id: LaneId;
  kind: LaneKind;
  label: string;
  color: string;
  blockIds: BlockId[];  // Blocks in this lane (left-to-right order)
  collapsed: boolean;
  pinned: boolean;      // Pinned lanes can't be removed in advanced mode
}

/**
 * Lane layout (preset or custom).
 */
export interface LaneLayout {
  id: string;
  label: string;
  description: string;
  lanes: Array<{
    kind: LaneKind;
    label: string;
    color: string;
  }>;
}

// =============================================================================
// Block Instance
// =============================================================================

export type BlockId = string;

/**
 * Block instance in patch bay.
 */
export interface Block {
  id: BlockId;
  type: BlockType;
  label: string;
  description?: string;
  category: BlockCategory;
  inputs: Slot[];
  outputs: Slot[];
  params: Record<string, unknown>;
}

// =============================================================================
// Connections
// =============================================================================

/**
 * Port reference (points to a specific port on a block).
 */
export interface PortRef {
  blockId: BlockId;
  slotId: string;
  direction: 'input' | 'output';
}

/**
 * Connection between two blocks.
 */
export interface Connection {
  id: string;
  from: {
    blockId: BlockId;
    slotId: string;
  };
  to: {
    blockId: BlockId;
    slotId: string;
  };
}

// =============================================================================
// Patch (entire graph)
// =============================================================================

/**
 * Complete patch bay graph (serializable).
 */
export interface Patch {
  version: string;
  blocks: Block[];
  connections: Connection[];
  buses: Bus[];
  publishers: Publisher[];
  listeners: Listener[];
  lanes: Lane[];
  currentLayoutId: string;
  settings: {
    seed: number;
    speed: number;
    advancedLaneMode: boolean;
    autoConnect: boolean;
    showTypeHints: boolean;
    highlightCompatible: boolean;
    warnBeforeDisconnect: boolean;
    filterByLane: boolean;
    filterByConnection: boolean;
  };
}

// =============================================================================
// Context Menu
// =============================================================================

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  portRef: PortRef | null;
}

// =============================================================================
// UI State
// =============================================================================

export interface EditorUIState {
  /** Currently selected block (for inspector) */
  selectedBlockId: BlockId | null;

  /** Currently selected bus (for bus inspector) */
  selectedBusId: string | null;

  /** Currently dragging block type (from library) */
  draggingBlockType: BlockType | null;

  /** Lane kind of the block being dragged (for highlighting suggested lanes) */
  draggingLaneKind: LaneKind | null;

  /** Active lane for palette filtering (lane user is working in) */
  activeLaneId: LaneId | null;

  /** Currently hovered port (for compatible highlighting) */
  hoveredPort: PortRef | null;

  /** Currently selected port (for wiring via inspector) */
  selectedPort: PortRef | null;

  /** Context menu state */
  contextMenu: ContextMenuState;

  /** Playback state */
  isPlaying: boolean;
}

// =============================================================================
// Template Definitions
// =============================================================================

/**
 * Saved template (reusable patch fragment).
 */
export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  blocks: Block[];
  connections: Connection[];
  buses: Bus[];
  publishers: Publisher[];
  listeners: Listener[];
  inputMap: Record<string, PortRef>;   // External → internal port mapping
  outputMap: Record<string, PortRef>;  // Internal → external port mapping
}

// =============================================================================
// Type Helpers
// =============================================================================

/**
 * Default values for core domains.
 */
export const CORE_DOMAIN_DEFAULTS: Record<CoreDomain, unknown> = {
  number: 0,
  vec2: { x: 0, y: 0 },
  color: '#000000',
  boolean: false,
  time: 0.0, // Always seconds!
  phase: 0.0,
  rate: 1.0,
  trigger: false, // Pulse state
};

/**
 * Check if two types are directly compatible (no adapters needed).
 */
export function isDirectlyCompatible(a: TypeDesc, b: TypeDesc): boolean {
  return a.world === b.world && a.domain === b.domain;
}

/**
 * Check if a type is eligible for bus routing.
 */
export function isBusEligible(typeDesc: TypeDesc): boolean {
  return typeDesc.busEligible && typeDesc.category === 'core';
}

/**
 * Check if a value is valid for a given type descriptor.
 */
export function isValidValueForType(typeDesc: TypeDesc, value: unknown): boolean {
  const domainDefault = CORE_DOMAIN_DEFAULTS[typeDesc.domain as CoreDomain];
  if (domainDefault === undefined) {
    return false;
  }

  // Basic type checking - could be enhanced
  switch (typeDesc.domain) {
    case 'number':
    case 'time':
    case 'phase':
    case 'rate':
      return typeof value === 'number';
    case 'boolean':
    case 'trigger':
      return typeof value === 'boolean';
    case 'vec2':
      return typeof value === 'object' && value !== null && 'x' in value && 'y' in value;
    case 'color':
      return typeof value === 'string';
    default:
      return false;
  }
}

/**
 * Get default value for a type descriptor.
 */
export function getDefaultValueForType(typeDesc: TypeDesc): unknown {
  const domainDefault = CORE_DOMAIN_DEFAULTS[typeDesc.domain as CoreDomain];
  if (domainDefault === undefined) {
    throw new Error(`No default value for domain: ${typeDesc.domain}`);
  }
  return domainDefault;
}

/**
 * Get combine modes available for a domain.
 */
export function getCombineModesForDomain(domain: CoreDomain): BusCombineMode[] {
  switch (domain) {
    case 'number':
      return ['sum', 'average', 'max', 'min', 'last'];
    case 'vec2':
      return ['sum', 'average', 'last'];
    case 'color':
      return ['layer', 'last'];
    case 'phase':
    case 'time':
    case 'rate':
      return ['last'];
    case 'trigger':
    case 'boolean':
      return ['last']; // Will display as "OR" in UI
    default:
      return ['last'];
  }
}

/**
 * Get default combine mode for a domain.
 */
export function getDefaultCombineModeForDomain(domain: CoreDomain): BusCombineMode {
  switch (domain) {
    case 'number':
      return 'sum';
    case 'vec2':
      return 'sum';
    case 'color':
      return 'layer';
    case 'trigger':
    case 'boolean':
      return 'last'; // Will display as "OR" in UI
    default:
      return 'last';
  }
}

/**
 * Format type descriptor for display.
 */
export function formatTypeDesc(typeDesc: TypeDesc): string {
  const world = typeDesc.world === 'signal' ? 'Signal' : 'Field';
  return `${world}<${typeDesc.domain}>`;
}
