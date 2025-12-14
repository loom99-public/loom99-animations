/**
 * Editor Type Definitions
 *
 * Core types for the unified animation editor.
 * These types are loosely coupled to V4 kernel types - editor has its own
 * type system that compiles to V4 primitives.
 */

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
  | 'Field<Duration>'   // Per-element delays/durations
  | 'Field<number>'     // Per-element scalars (radius, opacity)
  | 'Field<HSL>'        // Per-element colors
  | 'Field<string>'     // Per-element strings (colors, easing names)
  | 'Field<Path>'       // Per-element path data
  | 'Field<Wobble>'     // Per-element wobble parameters
  | 'Field<Spiral>'     // Per-element spiral parameters
  | 'Field<Wave>'       // Per-element wave parameters
  | 'Field<Jitter>'     // Per-element jitter parameters
  | 'Signal<Point>'     // Time-varying position
  | 'Signal<number>'    // Time-varying scalar
  | 'Signal<Unit>'      // Time-varying progress [0,1]
  | 'Signal<Time>'      // Time-varying time value (for local time)
  | 'Signal<PhaseSample>' // Phase machine output
  | 'Event<string>'     // Discrete text events (typewriter)
  | 'Event<any>'        // Generic events
  | 'Program'           // Compiled animation program
  | 'RenderTree'        // Final render output
  | 'RenderNode'        // Single render node
  | 'RenderNode[]'      // Array of render nodes
  | 'FilterDef'         // SVG filter definition
  | 'StrokeStyle'       // Stroke styling configuration
  | 'ElementCount';     // Number of elements (from scene)

// =============================================================================
// Block Definitions
// =============================================================================

/**
 * Unique identifier for a block instance.
 * Phase 1: Simple incrementing IDs. Phase 3+: UUIDs for stability.
 */
export type BlockId = string;

/**
 * Block type identifies the block's behavior (used to look up factory in registry).
 */
export type BlockType = string; // e.g., 'RadialOrigin', 'PhaseMachine', 'ParticleRenderer'

// =============================================================================
// Block Form System (Primitives, Compounds, Macros)
// =============================================================================

/**
 * Block form defines the fundamental nature of a block.
 *
 * - 'primitive': Irreducible atomic operations (implemented in TypeScript)
 * - 'composite': Built from primitives, behaves as single block in UI
 * - 'legacy-composite': Existing blocks to be migrated to composite definitions
 * - 'macro': Expands into visible blocks when added to patch
 */
export type BlockForm = 'primitive' | 'composite' | 'legacy-composite' | 'macro';

/**
 * Top-level block categories (form groupings).
 */
export const BLOCK_FORMS = ['Macros', 'Composites', 'Primitives'] as const;
export type BlockFormCategory = (typeof BLOCK_FORMS)[number];

/**
 * Subcategories within each form.
 * These organize blocks by domain/function.
 */
export const ALL_SUBCATEGORIES = [
  // Macro subcategories
  'Animation Styles',
  'Effects',

  // Compound/Primitive subcategories (shared)
  'Sources',        // Data entry points (SVG, Text)
  'Fields',         // Per-element values
  'Timing',         // Delays, durations, staggers
  'Spatial',        // Positions, transforms
  'Style',          // Colors, sizes, opacity
  'Behavior',       // Motion parameters (wobble, spiral)
  'Math',           // Arithmetic operations
  'Vector',         // Point/Vec2 operations
  'Time',           // Clock, phase, easing
  'Compose',        // Combining operations
  'Render',         // Drawing primitives
  'FX',             // Filters and effects
  'Adapters',       // Type conversions
  'Output',         // Final sinks
] as const;

export type BlockSubcategory = (typeof ALL_SUBCATEGORIES)[number];

/**
 * Legacy categories - kept for backwards compatibility during migration.
 * @deprecated Use BlockForm + BlockSubcategory instead
 */
export const ALL_CATEGORIES = [
  'Macros',     // Recipe starters - expand into multiple blocks
  'Scene',
  'Derivers',
  'Fields',
  'Math',       // Scalar math blocks
  'Time',
  'Events',
  'Dynamics',
  'Compose',
  'Render',
  'FX',
  'Adapters',
] as const;

/**
 * Block category for library organization.
 * @deprecated Use BlockSubcategory instead
 */
export type BlockCategory = (typeof ALL_CATEGORIES)[number];

/**
 * A Slot is a typed connection point on a block.
 */
export interface Slot {
  /** Unique identifier for this slot (unique within block) */
  readonly id: string;

  /** Human-readable label */
  readonly label: string;

  /** Type of value this slot accepts/produces */
  readonly type: SlotType;

  /** Input or output? */
  readonly direction: 'input' | 'output';
}

/**
 * Block parameters (user-editable values).
 * Phase 1: Any object. Phase 3+: Validated schemas.
 */
export type BlockParams = Record<string, unknown>;

/**
 * A Block is a functional unit in the patch bay.
 * This is the data representation (serializable to JSON).
 */
export interface Block {
  /** Unique ID for this block instance */
  readonly id: BlockId;

  /** Type of block (maps to behavior in registry) */
  readonly type: BlockType;

  /** Human-readable label (defaults to type, user can override) */
  label: string;

  /** Input slots */
  readonly inputs: readonly Slot[];

  /** Output slots */
  readonly outputs: readonly Slot[];

  /** User-editable parameters */
  params: BlockParams;

  /** Category for library organization */
  readonly category: BlockCategory;

  /** Optional description for inspector */
  readonly description?: string;
}

// =============================================================================
// Connections
// =============================================================================

/**
 * A Connection links an output slot to an input slot.
 */
export interface Connection {
  /** Unique ID for this connection */
  readonly id: string;

  /** Source block + slot */
  readonly from: {
    readonly blockId: BlockId;
    readonly slotId: string;
  };

  /** Destination block + slot */
  readonly to: {
    readonly blockId: BlockId;
    readonly slotId: string;
  };
}

// =============================================================================
// Lanes
// =============================================================================

/**
 * Canonical lane kinds (structural types).
 * These define what kind of values live in a lane.
 * Per lanes-overview.md: lanes represent value domains.
 */
export type LaneKind =
  | 'Scene'      // Scene / Targets / selections
  | 'Phase'      // PhaseMachine
  | 'Fields'     // Field<T> (bulk per-element values)
  | 'Scalars'    // Scalar<T> (constants, params)
  | 'Spec'       // Spec:* (intent declarations)
  | 'Program'    // Program<RenderTree>
  | 'Output';    // Export / render output

/**
 * Lane flavor - optional UI hints for organization.
 * Does NOT affect type validity, only palette suggestions.
 */
export type LaneFlavor =
  | 'Timing'     // Delays, durations, easing
  | 'Style'      // Colors, sizes, opacity
  | 'Motion'     // Positions, trajectories
  | 'General';   // Default, no specific flavor

/**
 * Lane flow style - how blocks relate within the lane.
 * Per lanes-overview.md: chain vs patch-bay.
 */
export type LaneFlowStyle =
  | 'chain'      // Pipeline: blocks flow left-to-right
  | 'patchbay';  // Fan-out: blocks are sources for other lanes

/**
 * Lane identifier - unique string for each lane instance.
 * Allows multiple lanes of the same kind.
 */
export type LaneId = string;

/**
 * Legacy lane name type for compatibility.
 * @deprecated Use LaneId instead
 */
export type LaneName = LaneId;

/**
 * A Lane is a horizontal track in the patch bay.
 * Blocks are assigned to lanes for organization.
 *
 * Key principles (from lanes-overview.md):
 * - Lanes are UI affordances, not semantic truth
 * - Port types determine connection validity
 * - Multiple lanes of same kind allowed
 * - Lanes guide users into sane structure
 */
export interface Lane {
  /** Unique identifier for this lane */
  readonly id: LaneId;

  /** Structural kind (what type of values live here) */
  readonly kind: LaneKind;

  /** Human-readable label (user can rename) */
  label: string;

  /** Description shown in UI */
  description: string;

  /** Optional flavor hint for palette filtering */
  flavor?: LaneFlavor;

  /** Flow style: chain (pipeline) or patchbay (fan-out sources) */
  flowStyle: LaneFlowStyle;

  /** Blocks in this lane (by ID) */
  blockIds: BlockId[];

  /** UI state: is lane collapsed? */
  collapsed: boolean;

  /** UI state: is lane pinned (always visible)? */
  pinned: boolean;

  // Legacy compatibility
  /** @deprecated Use id instead */
  readonly name: LaneId;
}

/**
 * Lane template for defining layouts (without runtime state like blockIds).
 */
export interface LaneTemplate {
  readonly id: LaneId;
  readonly kind: LaneKind;
  readonly label: string;
  readonly description: string;
  readonly flavor?: LaneFlavor;
  readonly flowStyle: LaneFlowStyle;
}

/**
 * A lane layout defines a preset arrangement of lanes.
 * Users can switch between layouts; blocks are migrated based on lane kind.
 */
export interface LaneLayout {
  /** Unique identifier */
  readonly id: string;

  /** Display name */
  readonly name: string;

  /** Description of when to use this layout */
  readonly description: string;

  /** Lane templates in order */
  readonly lanes: readonly LaneTemplate[];

  /** Is this a built-in preset or user-created? */
  readonly isPreset: boolean;
}

// =============================================================================
// Patch (Complete Editor State)
// =============================================================================

/**
 * A Patch is the complete editor state (serializable to JSON).
 * This is what gets saved/loaded.
 */
export interface Patch {
  /** Format version for migration */
  readonly version: number;

  /** All blocks in the patch */
  blocks: Block[];

  /** All connections between blocks */
  connections: Connection[];

  /** Lane assignments (which blocks are in which lanes) */
  lanes: Lane[];

  /** Global settings (seed, speed, etc.) */
  settings: {
    seed: number;
    speed: number;
  };
}

// =============================================================================
// Block Registry (Behavior Mapping)
// =============================================================================

/**
 * Block behavior definition (how to compile block to V4).
 * Phase 1: Stub type. Phase 4: Implement compilation.
 */
export interface BlockBehavior {
  /** Block type this behavior handles */
  readonly type: BlockType;

  /** Default parameters for new instances */
  readonly defaultParams: BlockParams;

  /** Compile this block to a V4 function/value */
  // TODO Phase 4: Define compilation signature
  compile?: (block: Block, inputs: unknown[]) => unknown;
}

/**
 * Registry of block behaviors.
 * Maps block type → behavior.
 */
export type BlockRegistry = Map<BlockType, BlockBehavior>;

// =============================================================================
// Editor UI State (Non-Serializable)
// =============================================================================

/**
 * Editor UI state (selection, drag, etc.).
 * Not part of Patch (UI-only state).
 */
/**
 * Identifies a specific port on a specific block.
 */
export interface PortRef {
  readonly blockId: BlockId;
  readonly slotId: string;
  readonly direction: 'input' | 'output';
}

/**
 * Context menu state for right-click actions.
 */
export interface ContextMenuState {
  /** Is the context menu open? */
  isOpen: boolean;
  /** Screen position */
  x: number;
  y: number;
  /** The port this context menu is for */
  portRef: PortRef | null;
}

export interface EditorUIState {
  /** Currently selected block (for inspector) */
  selectedBlockId: BlockId | null;

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
 * A Template is a pre-wired patch (archetype).
 */
export interface Template {
  readonly name: string;
  readonly description: string;
  readonly archetype: 'Particles' | 'LineDrawing' | 'Typewriter';

  /** Generate a patch for this template */
  createPatch: () => Patch;
}
