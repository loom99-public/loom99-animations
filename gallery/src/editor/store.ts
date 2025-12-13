/**
 * Editor Store (MobX)
 *
 * Observable state for the patch bay graph.
 * Designed for serialization (clean JSON export).
 */

import { makeObservable, observable, action, computed } from 'mobx';
import type {
  Block,
  BlockId,
  Connection,
  Lane,
  LaneId,
  LaneKind,
  LaneLayout,
  Patch,
  EditorUIState,
  BlockType,
  BlockCategory,
  PortRef,
} from './types';
import { getBlockDefinition, type BlockDefinition } from './blocks';
import {
  DEFAULT_LAYOUT,
  getLayoutById,
  mapLaneToLayout,
  PRESET_LAYOUTS,
} from './laneLayouts';

/**
 * EditorStore manages the patch bay graph state.
 *
 * Design:
 * - Observable mutable graph (blocks, connections, lanes)
 * - Actions for all mutations (MobX best practice)
 * - Computed values for derived state
 * - Serialization to clean JSON (toJSON/fromJSON)
 */
export class EditorStore {
  // =============================================================================
  // Observable State
  // =============================================================================

  /** All blocks in the patch */
  blocks: Block[] = [];

  /** All connections between blocks */
  connections: Connection[] = [];

  /** Current lane layout ID */
  currentLayoutId: string = DEFAULT_LAYOUT.id;

  /** Lane definitions with block assignments */
  lanes: Lane[] = this.createLanesFromLayout(DEFAULT_LAYOUT);

  /** Global settings */
  settings = {
    seed: 42,
    speed: 1.0,
    // Lane mode settings
    advancedLaneMode: false, // Advanced mode unlocks lane customization
    // Connection settings
    autoConnect: false, // Auto-wire obvious connections (disabled for now)
    showTypeHints: true, // Show port types on hover
    highlightCompatible: true, // Highlight compatible ports when dragging
    warnBeforeDisconnect: true, // Show confirmation before disconnecting
    // Palette filtering settings
    filterByLane: true, // Filter palette to blocks matching lane type
    filterByConnection: false, // Filter to blocks compatible with selection
  };

  /** UI state (non-serializable) */
  uiState: EditorUIState = {
    selectedBlockId: null,
    draggingBlockType: null,
    draggingLaneKind: null,
    activeLaneId: null,
    hoveredPort: null,
    selectedPort: null,
    contextMenu: {
      isOpen: false,
      x: 0,
      y: 0,
      portRef: null,
    },
    isPlaying: false,
    currentTime: 0,
  };

  /** Previewed block definition (from library, before placement) */
  previewedDefinition: BlockDefinition | null = null;

  /** ID counter for blocks/connections */
  private nextId = 1;

  // =============================================================================
  // Constructor
  // =============================================================================

  constructor() {
    makeObservable(this, {
      blocks: observable,
      connections: observable,
      currentLayoutId: observable,
      lanes: observable,
      settings: observable,
      uiState: observable,
      previewedDefinition: observable,
      addBlock: action,
      removeBlock: action,
      updateBlockParams: action,
      connect: action,
      disconnect: action,
      selectBlock: action,
      previewDefinition: action,
      setPlaying: action,
      setCurrentTime: action,
      setSeed: action,
      setSpeed: action,
      loadPatch: action,
      toggleLaneCollapsed: action,
      toggleLanePinned: action,
      renameLane: action,
      addLane: action,
      removeLane: action,
      moveBlockToLane: action,
      reorderBlockInLane: action,
      switchLayout: action,
      setAdvancedLaneMode: action,
      setAutoConnect: action,
      setShowTypeHints: action,
      setHighlightCompatible: action,
      setFilterByLane: action,
      setFilterByConnection: action,
      setWarnBeforeDisconnect: action,
      setActiveLane: action,
      setHoveredPort: action,
      setSelectedPort: action,
      openContextMenu: action,
      closeContextMenu: action,
      setDraggingLaneKind: action,
      selectedBlock: computed,
      activeLane: computed,
      selectedPortInfo: computed,
      currentLayout: computed,
      availableLayouts: computed,
    });
  }

  // =============================================================================
  // Computed Values
  // =============================================================================

  /** Get currently selected block */
  get selectedBlock(): Block | null {
    if (!this.uiState.selectedBlockId) return null;
    return this.blocks.find((b) => b.id === this.uiState.selectedBlockId) ?? null;
  }

  /** Get active lane (for palette filtering) */
  get activeLane(): Lane | null {
    if (!this.uiState.activeLaneId) return null;
    return this.lanes.find((l) => l.id === this.uiState.activeLaneId) ?? null;
  }

  /** Get selected port with full block/slot info */
  get selectedPortInfo(): { block: Block; slot: import('./types').Slot; direction: 'input' | 'output' } | null {
    const portRef = this.uiState.selectedPort;
    if (!portRef) return null;

    const block = this.blocks.find((b) => b.id === portRef.blockId);
    if (!block) return null;

    const slots = portRef.direction === 'input' ? block.inputs : block.outputs;
    const slot = slots.find((s) => s.id === portRef.slotId);
    if (!slot) return null;

    return { block, slot, direction: portRef.direction };
  }

  /** Get current lane layout */
  get currentLayout(): LaneLayout {
    return getLayoutById(this.currentLayoutId) ?? DEFAULT_LAYOUT;
  }

  /** Get all available layouts */
  get availableLayouts(): readonly LaneLayout[] {
    return PRESET_LAYOUTS;
  }

  // =============================================================================
  // Actions - Block Management
  // =============================================================================

  /**
   * Add a new block to the patch.
   * @param type Block type (e.g., 'RadialOrigin')
   * @param laneId Lane ID to add block to
   * @param params Optional initial parameters
   * @returns Created block ID
   */
  addBlock(type: BlockType, laneId: LaneId, params?: Record<string, unknown>): BlockId {
    const id = `block-${this.nextId++}`;

    // Look up block definition from registry
    const definition = getBlockDefinition(type);

    // Find lane to infer category
    const laneObj = this.lanes.find((l) => l.id === laneId);

    const block: Block = {
      id,
      type,
      label: definition?.label ?? type,
      inputs: definition?.inputs ?? [],
      outputs: definition?.outputs ?? [],
      params: params ?? definition?.defaultParams ?? {},
      category: definition?.category ?? this.inferCategory(laneObj?.kind ?? 'Program'),
      description: definition?.description ?? `${type} block`,
    };

    this.blocks.push(block);

    // Add to lane - use array spread to ensure MobX detects the change
    if (laneObj) {
      laneObj.blockIds = [...laneObj.blockIds, id];
    }

    return id;
  }

  /**
   * Remove a block and all its connections.
   */
  removeBlock(blockId: BlockId): void {
    // Remove connections (in-place mutation for MobX)
    const connToRemove = this.connections.filter(
      (c) => c.from.blockId === blockId || c.to.blockId === blockId
    );
    connToRemove.forEach((c) => {
      const idx = this.connections.indexOf(c);
      if (idx !== -1) this.connections.splice(idx, 1);
    });

    // Remove from blocks (in-place mutation for MobX)
    const blockIdx = this.blocks.findIndex((b) => b.id === blockId);
    if (blockIdx !== -1) {
      this.blocks.splice(blockIdx, 1);
    }

    // Remove from lanes - use filter to ensure MobX detects the change
    for (const lane of this.lanes) {
      if (lane.blockIds.includes(blockId)) {
        lane.blockIds = lane.blockIds.filter((id) => id !== blockId);
      }
    }

    // Deselect if selected
    if (this.uiState.selectedBlockId === blockId) {
      this.uiState.selectedBlockId = null;
    }
  }

  /**
   * Update block parameters.
   */
  updateBlockParams(blockId: BlockId, params: Record<string, unknown>): void {
    const block = this.blocks.find((b) => b.id === blockId);
    if (block) {
      // Use Object.assign to mutate in place for MobX reactivity
      Object.assign(block.params, params);
    }
  }

  /**
   * Move a block to a different lane (or same lane at different position).
   * @param blockId Block to move
   * @param targetLaneId Destination lane
   * @param targetIndex Position in destination lane (default: end)
   */
  moveBlockToLane(blockId: BlockId, targetLaneId: LaneId, targetIndex?: number): void {
    // Remove from current lane
    for (const lane of this.lanes) {
      if (lane.blockIds.includes(blockId)) {
        lane.blockIds = lane.blockIds.filter((id) => id !== blockId);
        break;
      }
    }

    // Add to target lane
    const targetLane = this.lanes.find((l) => l.id === targetLaneId);
    if (targetLane) {
      const insertIdx = targetIndex ?? targetLane.blockIds.length;
      const newBlockIds = [...targetLane.blockIds];
      newBlockIds.splice(insertIdx, 0, blockId);
      targetLane.blockIds = newBlockIds;
    }
  }

  /**
   * Reorder a block within its current lane.
   * @param blockId Block to reorder
   * @param newIndex New position index
   */
  reorderBlockInLane(blockId: BlockId, newIndex: number): void {
    for (const lane of this.lanes) {
      const currentIdx = lane.blockIds.indexOf(blockId);
      if (currentIdx !== -1) {
        // Create new array without the block
        const newBlockIds = lane.blockIds.filter((id) => id !== blockId);
        // Insert at new position (clamped to valid range)
        const clampedIdx = Math.max(0, Math.min(newIndex, newBlockIds.length));
        newBlockIds.splice(clampedIdx, 0, blockId);
        lane.blockIds = newBlockIds;
        break;
      }
    }
  }

  // =============================================================================
  // Actions - Connection Management
  // =============================================================================

  /**
   * Create a connection between two slots.
   * TODO Phase 3: Add type checking
   */
  connect(
    fromBlockId: BlockId,
    fromSlotId: string,
    toBlockId: BlockId,
    toSlotId: string
  ): void {
    const id = `conn-${this.nextId++}`;

    const connection: Connection = {
      id,
      from: { blockId: fromBlockId, slotId: fromSlotId },
      to: { blockId: toBlockId, slotId: toSlotId },
    };

    this.connections.push(connection);
  }

  /**
   * Remove a connection.
   */
  disconnect(connectionId: string): void {
    this.connections = this.connections.filter((c) => c.id !== connectionId);
  }

  // =============================================================================
  // Actions - UI State
  // =============================================================================

  selectBlock(blockId: BlockId | null): void {
    this.uiState.selectedBlockId = blockId;
    // Clear preview when selecting a placed block
    if (blockId) {
      this.previewedDefinition = null;
    }
  }

  /**
   * Preview a block definition from the library (before placement).
   */
  previewDefinition(definition: BlockDefinition | null): void {
    this.previewedDefinition = definition;
    // Clear selected block when previewing
    if (definition) {
      this.uiState.selectedBlockId = null;
    }
  }

  setPlaying(playing: boolean): void {
    this.uiState.isPlaying = playing;
  }

  setCurrentTime(time: number): void {
    this.uiState.currentTime = time;
  }

  setSeed(seed: number): void {
    this.settings.seed = seed;
  }

  setSpeed(speed: number): void {
    this.settings.speed = speed;
  }

  // =============================================================================
  // Actions - Editor Settings
  // =============================================================================

  setAdvancedLaneMode(enabled: boolean): void {
    this.settings.advancedLaneMode = enabled;
  }

  setAutoConnect(enabled: boolean): void {
    this.settings.autoConnect = enabled;
  }

  setShowTypeHints(enabled: boolean): void {
    this.settings.showTypeHints = enabled;
  }

  setHighlightCompatible(enabled: boolean): void {
    this.settings.highlightCompatible = enabled;
  }

  setFilterByLane(enabled: boolean): void {
    this.settings.filterByLane = enabled;
  }

  setFilterByConnection(enabled: boolean): void {
    this.settings.filterByConnection = enabled;
  }

  setWarnBeforeDisconnect(enabled: boolean): void {
    this.settings.warnBeforeDisconnect = enabled;
  }

  setActiveLane(laneId: LaneId | null): void {
    this.uiState.activeLaneId = laneId;
  }

  setHoveredPort(port: PortRef | null): void {
    this.uiState.hoveredPort = port;
  }

  setSelectedPort(port: PortRef | null): void {
    this.uiState.selectedPort = port;
  }

  openContextMenu(x: number, y: number, portRef: PortRef): void {
    this.uiState.contextMenu = {
      isOpen: true,
      x,
      y,
      portRef,
    };
  }

  closeContextMenu(): void {
    this.uiState.contextMenu = {
      isOpen: false,
      x: 0,
      y: 0,
      portRef: null,
    };
  }

  setDraggingLaneKind(laneKind: import('./types').LaneKind | null): void {
    this.uiState.draggingLaneKind = laneKind;
  }

  // =============================================================================
  // Serialization
  // =============================================================================

  /**
   * Serialize to JSON (for save/export).
   * Clean, version-controlled format.
   */
  toJSON(): Patch {
    return {
      version: 1,
      blocks: this.blocks.map((b) => ({ ...b })), // Clone to plain objects
      connections: this.connections.map((c) => ({ ...c })),
      lanes: this.lanes.map((l) => ({ ...l })),
      settings: { ...this.settings },
    };
  }

  /**
   * Deserialize from JSON (for load).
   */
  loadPatch(patch: Patch): void {
    this.blocks = patch.blocks;
    this.connections = patch.connections;
    this.lanes = patch.lanes;
    this.settings = patch.settings;
    this.uiState.selectedBlockId = null;
    this.uiState.currentTime = 0;

    // Update ID counter to avoid collisions
    const maxId = Math.max(
      ...this.blocks.map((b) => parseInt(b.id.split('-')[1]) || 0),
      ...this.connections.map((c) => parseInt(c.id.split('-')[1]) || 0)
    );
    this.nextId = maxId + 1;
  }

  // =============================================================================
  // Actions - Lane Management
  // =============================================================================

  /**
   * Toggle lane collapsed state.
   */
  toggleLaneCollapsed(laneId: LaneId): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (lane) {
      lane.collapsed = !lane.collapsed;
    }
  }

  /**
   * Toggle lane pinned state.
   */
  toggleLanePinned(laneId: LaneId): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (lane) {
      lane.pinned = !lane.pinned;
    }
  }

  /**
   * Rename a lane.
   */
  renameLane(laneId: LaneId, newLabel: string): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (lane) {
      lane.label = newLabel;
    }
  }

  /**
   * Add a new lane of given kind.
   * Multiple lanes of the same kind are allowed.
   */
  addLane(kind: LaneKind, label?: string): LaneId {
    const id = `lane-${this.nextId++}`;
    const defaults = this.getLaneKindDefaults(kind);

    const lane: Lane = {
      id,
      name: id, // Legacy compatibility
      kind,
      label: label ?? defaults.label,
      description: defaults.description,
      flowStyle: defaults.flowStyle,
      blockIds: [],
      collapsed: false,
      pinned: false,
    };

    this.lanes.push(lane);
    return id;
  }

  /**
   * Remove a lane (blocks are orphaned, not deleted).
   */
  removeLane(laneId: LaneId): void {
    const idx = this.lanes.findIndex((l) => l.id === laneId);
    if (idx !== -1) {
      this.lanes.splice(idx, 1);
    }
  }

  /**
   * Switch to a different lane layout.
   * Blocks are migrated to appropriate lanes based on kind matching.
   */
  switchLayout(layoutId: string): void {
    const newLayout = getLayoutById(layoutId);
    if (!newLayout || layoutId === this.currentLayoutId) return;

    const oldLayout = this.currentLayout;

    // Collect all blocks with their current lane assignments
    const blockAssignments: Array<{ blockId: BlockId; oldLaneId: string }> = [];
    for (const lane of this.lanes) {
      for (const blockId of lane.blockIds) {
        blockAssignments.push({ blockId, oldLaneId: lane.id });
      }
    }

    // Create new lanes from the new layout
    this.lanes = this.createLanesFromLayout(newLayout);
    this.currentLayoutId = layoutId;

    // Migrate blocks to new lanes
    for (const { blockId, oldLaneId } of blockAssignments) {
      const newLaneId = mapLaneToLayout(oldLaneId, oldLayout, newLayout);
      const newLane = this.lanes.find((l) => l.id === newLaneId);
      if (newLane) {
        newLane.blockIds.push(blockId);
      } else {
        // Fallback: put in first lane
        this.lanes[0]?.blockIds.push(blockId);
      }
    }
  }

  // =============================================================================
  // Helpers
  // =============================================================================

  /**
   * Create lanes from a layout template.
   */
  private createLanesFromLayout(layout: LaneLayout): Lane[] {
    return layout.lanes.map((template) => ({
      id: template.id,
      name: template.id, // Legacy compatibility
      kind: template.kind,
      label: template.label,
      description: template.description,
      flavor: template.flavor,
      flowStyle: template.flowStyle,
      blockIds: [],
      collapsed: false,
      pinned: false,
    }));
  }

  /**
   * Get default properties for a lane kind.
   */
  private getLaneKindDefaults(kind: LaneKind): {
    label: string;
    description: string;
    flowStyle: 'chain' | 'patchbay';
  } {
    const defaults: Record<LaneKind, { label: string; description: string; flowStyle: 'chain' | 'patchbay' }> = {
      Scene: { label: 'Scene', description: 'Geometry, text, assets', flowStyle: 'patchbay' },
      Phase: { label: 'Phase', description: 'Phase machines', flowStyle: 'patchbay' },
      Fields: { label: 'Fields', description: 'Per-element values', flowStyle: 'patchbay' },
      Scalars: { label: 'Scalars', description: 'Constants and params', flowStyle: 'patchbay' },
      Spec: { label: 'Spec', description: 'Animation intent', flowStyle: 'chain' },
      Program: { label: 'Program', description: 'Compiled behavior', flowStyle: 'chain' },
      Output: { label: 'Output', description: 'Render output', flowStyle: 'chain' },
    };
    return defaults[kind];
  }

  /**
   * Map lane kind to block category.
   */
  private inferCategory(kind: LaneKind): BlockCategory {
    const mapping: Record<LaneKind, BlockCategory> = {
      Scene: 'Scene',
      Phase: 'Time',
      Fields: 'Fields',
      Scalars: 'Math',
      Spec: 'Compose',
      Program: 'Compose',
      Output: 'Render',
    };
    return mapping[kind];
  }
}
