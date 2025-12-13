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
  | 'Field<Point>'      // Per-element positions
  | 'Field<Duration>'   // Per-element delays/durations
  | 'Field<number>'     // Per-element scalars (radius, opacity)
  | 'Field<HSL>'        // Per-element colors
  | 'Signal<Point>'     // Time-varying position
  | 'Signal<number>'    // Time-varying scalar
  | 'Signal<Unit>'      // Time-varying progress [0,1]
  | 'Signal<PhaseSample>' // Phase machine output
  | 'Event<string>'     // Discrete text events (typewriter)
  | 'Event<any>'        // Generic events
  | 'Program'           // Compiled animation program
  | 'RenderTree';       // Final render output

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

/**
 * Block category for library organization.
 */
export type BlockCategory =
  | 'Scene'
  | 'Derivers'
  | 'Fields'
  | 'Time'
  | 'Events'
  | 'Dynamics'
  | 'Compose'
  | 'Render'
  | 'FX'
  | 'Adapters';

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
 * Lane names in the patch bay.
 * Fixed set of 7 lanes (per design doc).
 */
export type LaneName =
  | 'Scene'
  | 'Fields'
  | 'Time'
  | 'Events'
  | 'Dynamics'
  | 'Composition'
  | 'Render';

/**
 * A Lane is a horizontal track in the patch bay.
 * Blocks are assigned to lanes for organization.
 */
export interface Lane {
  readonly name: LaneName;
  readonly label: string;
  readonly description: string;
  /** Blocks in this lane (by ID) */
  blockIds: BlockId[];
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
export interface EditorUIState {
  /** Currently selected block (for inspector) */
  selectedBlockId: BlockId | null;

  /** Currently dragging block type (from library) */
  draggingBlockType: BlockType | null;

  /** Playback state */
  isPlaying: boolean;
  currentTime: number; // seconds
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
