/**
 * @file Editor Store (MobX)
 * @description Central state management for the patch editor.
 *
 * ## MobX Decorators
 * - `observable`: State fields that trigger UI updates
 * - `computed`: Derived values that cache and auto-update
 * - `action`: Methods that modify state (must be decorated for MobX)
 *
 * ## Store Sections
 * - Blocks & Connections: Core patch graph
 * - Lanes: Vertical organization (legacy, may be removed)
 * - UI State: Selection, playback, transport
 * - Composites: Saved block groups
 * - Buses: Phase 2 Signal buses for global routing
 */

import { makeObservable, observable, action, computed } from 'mobx';
import type {
  Block,
  Connection,
  Lane,
  BlockId,
  LaneId,
  LaneKind,
  LaneLayout,
  Patch,
  Composite,
  Bus,
  Publisher,
  Listener,
  AdapterStep,
  PortRef,
} from './types';
import { SIMPLE_LAYOUT, DETAILED_LAYOUT, getLayoutById, PRESET_LAYOUTS, DEFAULT_LAYOUT, mapLaneToLayout } from './laneLayouts';
import type { TypeDescriptor, BusCombineMode, BlockCategory, BlockType } from './types';
import { getBlockDefinition } from './blocks';
import { getMacroKey, getMacroExpansion, type MacroExpansion } from './macros';

// =============================================================================
// Migration Helpers
// =============================================================================

/**
 * Migrate SVGPathSource target values from old format to new library ID format.
 * Old: 'logo', 'text', 'heart'
 * New: 'builtin:logo', 'builtin:text', 'builtin:heart'
 */
function migrateBlockParams(type: string, params: Record<string, unknown>): Record<string, unknown> {
  if (type === 'SVGPathSource' && params.target) {
    const target = String(params.target);
    // Migrate old format to new
    if (target === 'logo') return { ...params, target: 'builtin:logo' };
    if (target === 'text') return { ...params, target: 'builtin:text' };
    if (target === 'heart') return { ...params, target: 'builtin:heart' };
  }
  return params;
}

/**
 * Editor Store
 */
export class EditorStore {
  // =============================================================================
  // Observable State
  // =============================================================================

  blocks: Block[] = [];
  connections: Connection[] = [];
  buses: Bus[] = [];
  publishers: Publisher[] = [];
  listeners: Listener[] = [];

  /** Current lane layout ID */
  currentLayoutId: string = DEFAULT_LAYOUT.id;

  /** Lane definitions with block assignments */
  lanes: Lane[] = this.createLanesFromLayout(DEFAULT_LAYOUT);

  composites: Composite[] = []; // Saved macros

  uiState = {
    selectedBlockId: null as BlockId | null,
    selectedBusId: null as string | null,
    draggingBlockType: null as string | null,
    draggingLaneKind: null as LaneKind | null,
    activeLaneId: null as LaneId | null,
    hoveredPort: null as { blockId: BlockId; slotId: string; direction: 'input' | 'output' } | null,
    selectedPort: null as { blockId: BlockId; slotId: string; direction: 'input' | 'output' } | null,
    contextMenu: {
      isOpen: false,
      x: 0,
      y: 0,
      portRef: null as { blockId: BlockId; slotId: string; direction: 'input' | 'output' } | null,
    },
    isPlaying: false,
    currentTime: 0, // seconds
  };

  settings = {
    seed: 0,
    speed: 1.0,
    advancedLaneMode: false, // Controls lane visibility (Simple vs Detailed)
    autoConnect: false, // Auto-create connections on block drop
    showTypeHints: false, // Show type labels on ports
    highlightCompatible: false, // Highlight compatible ports when dragging
    warnBeforeDisconnect: false, // Confirmation before removing connections
    filterByLane: false, // Filter library by lane compatibility
    filterByConnection: false, // Filter library by connection context
  };

  // ID counter for generating unique IDs
  private nextId = 1;

  // Compiled program for preview (cached)
  previewedDefinition: any = null;

  // =============================================================================
  // Constructor
  // =============================================================================

  constructor() {
    makeObservable(this, {
      blocks: observable,
      connections: observable,
      lanes: observable,
      buses: observable,
      publishers: observable,
      listeners: observable,
      composites: observable,
      currentLayoutId: observable,
      uiState: observable,
      settings: observable,
      previewedDefinition: observable,
      // Computed getters
      selectedBlock: computed,
      selectedBus: computed,
      activeLane: computed,
      selectedPortInfo: computed,
      currentLayout: computed,
      availableLayouts: computed,
      // Actions
      addBlock: action,
      expandMacro: action,
      updateBlock: action,
      removeBlock: action,
      addConnection: action,
      connect: action,
      disconnect: action,
      removeConnection: action,
      selectBlock: action,
      deselectBlock: action,
      selectBus: action,
      deselectBus: action,
      play: action,
      pause: action,
      seek: action,
      togglePlayPause: action,
      setSeed: action,
      setSpeed: action,
      loadPatch: action,
      loadDemoAnimation: action,
      clearPatch: action,
      createBus: action,
      deleteBus: action,
      updateBus: action,
      addPublisher: action,
      updatePublisher: action,
      removePublisher: action,
      addListener: action,
      updateListener: action,
      removeListener: action,
      reorderPublisher: action,
      // getBusPublishers: action,
      // getBusListeners: action,
      // getPortRouting: action,
      // findBusesByTypeDesc: action,
      // isBusBound: action,
      // getNextSortKey: action,
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
      setWarnBeforeDisconnect: action,
      setFilterByLane: action,
      setFilterByConnection: action,
      saveComposite: action,
      deleteComposite: action,
      instantiateComposite: action,
      setPreviewedDefinition: action,
      // Missing actions restored:
      updateBlockParams: action,
      previewDefinition: action,
      setPlaying: action,
      setActiveLane: action,
      setHoveredPort: action,
      setSelectedPort: action,
      openContextMenu: action,
      closeContextMenu: action,
      setDraggingLaneKind: action,
    });
  }

  // =============================================================================
  // Computed Values
  // =============================================================================

  get selectedBlock(): Block | null {
    if (!this.uiState.selectedBlockId) return null;
    return this.blocks.find((b) => b.id === this.uiState.selectedBlockId) ?? null;
  }

  get selectedBus(): Bus | null {
    if (!this.uiState.selectedBusId) return null;
    return this.buses.find((b) => b.id === this.uiState.selectedBusId) ?? null;
  }

  /** Get active lane (for palette filtering) */
  get activeLane(): Lane | null {
    if (!this.uiState.activeLaneId) return null;
    return this.lanes.find((l) => l.id === this.uiState.activeLaneId) ?? null;
  }

  /** Get selected port with full block/slot info */
  get selectedPortInfo(): { block: Block; slot: { id: string; label: string; type: string; direction: string }; direction: 'input' | 'output' } | null {
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
   * Add a block to the patch.
   *
   * @param type Block type to create
   * @param laneId Lane to place it in
   * @param params Optional initial parameters
   * @returns Created block ID (or first block ID if macro expanded)
   */
  addBlock(type: BlockType, laneId: LaneId, params?: Record<string, unknown>): BlockId {
    // Check if this is a macro that should expand
    const macroKey = getMacroKey(type, params);
    if (macroKey) {
      const expansion = getMacroExpansion(macroKey);
      if (expansion) {
        return this.expandMacro(expansion);
      }
    }

    // Regular block addition
    const id = `block-${this.nextId++}`;

    // Look up block definition from registry
    const definition = getBlockDefinition(type);

    // Find lane to infer category
    const laneObj = this.lanes.find((l) => l.id === laneId);

    // Merge params with defaults and migrate old values
    const rawParams = params ?? definition?.defaultParams ?? {};
    const migratedParams = migrateBlockParams(type, rawParams);

    const block: Block = {
      id,
      type,
      label: definition?.label ?? type,
      inputs: definition?.inputs ?? [],
      outputs: definition?.outputs ?? [],
      params: migratedParams,
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
   * Expand a macro into multiple blocks with connections.
   *
   * @param expansion The macro expansion definition
   * @returns The ID of the first block created
   */
  expandMacro(expansion: MacroExpansion): BlockId {
    // Clear the patch first - macros replace everything
    this.clearPatch();

    // Map from macro ref IDs to actual block IDs
    const refToId = new Map<string, BlockId>();

    // Create all blocks
    for (const macroBlock of expansion.blocks) {
      // Find the appropriate lane for this block's kind
      const lane = this.lanes.find((l) => l.kind === macroBlock.laneKind);
      if (!lane) continue;

      const id = `block-${this.nextId++}`;
      const definition = getBlockDefinition(macroBlock.type);

      const block: Block = {
        id,
        type: macroBlock.type,
        label: macroBlock.label ?? definition?.label ?? macroBlock.type,
        inputs: definition?.inputs ?? [],
        outputs: definition?.outputs ?? [],
        params: { ...(definition?.defaultParams ?? {}), ...(macroBlock.params ?? {}) },
        category: definition?.category ?? this.inferCategory(lane.kind),
        description: definition?.description ?? `${macroBlock.type} block`,
      };

      this.blocks.push(block);
      lane.blockIds = [...lane.blockIds, id];
      refToId.set(macroBlock.ref, id);
    }

    // Create all connections
    for (const conn of expansion.connections) {
      const fromId = refToId.get(conn.fromRef);
      const toId = refToId.get(conn.toRef);
      if (fromId && toId) {
        this.connect(fromId, conn.fromSlot, toId, conn.toSlot);
      }
    }

    // Return the first block ID (for selection purposes)
    const firstRef = expansion.blocks[0]?.ref;
    return firstRef ? refToId.get(firstRef) ?? '' : '';
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

  updateBlock(id: BlockId, updates: Partial<Block>): void {
    const block = this.blocks.find((b) => b.id === id);
    if (!block) return;
    Object.assign(block, updates);
  }

  removeBlock(id: BlockId): void {
    // Remove block
    this.blocks = this.blocks.filter((b) => b.id !== id);

    // Remove connections to/from this block
    this.connections = this.connections.filter(
      (c) => c.from.blockId !== id && c.to.blockId !== id
    );

    // Remove from lanes
    for (const lane of this.lanes) {
      lane.blockIds = lane.blockIds.filter((bid) => bid !== id);
    }

    // Remove publishers and listeners
    this.publishers = this.publishers.filter((p) => p.from.blockId !== id);
    this.listeners = this.listeners.filter((l) => l.to.blockId !== id);

    // Deselect if selected
    if (this.uiState.selectedBlockId === id) {
      this.uiState.selectedBlockId = null;
    }
  }

  // =============================================================================
  // Actions - Connection Management
  // =============================================================================

  addConnection(connection: Connection): void {
    this.connections.push(connection);
  }


  /**
   * Create a connection between two blocks (helper method).
   * Prevents duplicate connections between the same ports.
   */
  connect(
    fromBlockId: BlockId,
    fromSlotId: string,
    toBlockId: BlockId,
    toSlotId: string
  ): void {
    // Prevent duplicate connections between the same ports
    const exists = this.connections.some(
      (c) =>
        c.from.blockId === fromBlockId &&
        c.from.slotId === fromSlotId &&
        c.to.blockId === toBlockId &&
        c.to.slotId === toSlotId
    );
    if (exists) return;

    const id = `conn-${this.nextId++}`;

    const connection: Connection = {
      id,
      from: { blockId: fromBlockId, slotId: fromSlotId },
      to: { blockId: toBlockId, slotId: toSlotId },
    };

    this.connections.push(connection);
  }

  /**
   * Remove a connection (helper method).
   */
  disconnect(connectionId: string): void {
    this.connections = this.connections.filter((c) => c.id !== connectionId);
  }

  removeConnection(id: string): void {
    this.connections = this.connections.filter((c) => c.id !== id);
  }

  // =============================================================================
  // Actions - Selection
  // =============================================================================

  selectBlock(id: BlockId | null): void {
    this.uiState.selectedBlockId = id;
    if (id !== null) {
      this.uiState.selectedBusId = null; // Deselect bus when block selected
    }
  }

  deselectBlock(): void {
    this.uiState.selectedBlockId = null;
  }

  selectBus(id: string | null): void {
    this.uiState.selectedBusId = id;
    if (id !== null) {
      this.uiState.selectedBlockId = null; // Deselect block when bus selected
    }
  }

  deselectBus(): void {
    this.uiState.selectedBusId = null;
  }

  // =============================================================================
  // Actions - Transport
  // =============================================================================

  play(): void {
    this.uiState.isPlaying = true;
  }

  pause(): void {
    this.uiState.isPlaying = false;
  }

  seek(time: number): void {
    this.uiState.currentTime = time;
  }

  togglePlayPause(): void {
    this.uiState.isPlaying = !this.uiState.isPlaying;
  }

  setSeed(seed: number): void {
    this.settings.seed = seed;
  }

  setSpeed(speed: number): void {
    this.settings.speed = speed;
  }

  // =============================================================================
  // Actions - Lane Management
  // =============================================================================

  toggleLaneCollapsed(laneId: LaneId): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (!lane) return;
    lane.isCollapsed = !lane.isCollapsed;
  }

  toggleLanePinned(laneId: LaneId): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (!lane) return;
    lane.pinned = !lane.pinned;
  }

  renameLane(laneId: LaneId, newName: string): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (!lane) return;
    lane.label = newName;
  }

  addLane(lane: Lane): void {
    this.lanes.push(lane);
  }

  removeLane(laneId: LaneId): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (!lane || lane.pinned) return; // Don't remove pinned lanes

    // Move blocks to first available lane
    const firstLane = this.lanes.find((l) => l.id !== laneId);
    if (firstLane) {
      firstLane.blockIds.push(...lane.blockIds);
    }

    this.lanes = this.lanes.filter((l) => l.id !== laneId);
  }

  moveBlockToLane(blockId: BlockId, targetLaneId: LaneId): void {
    // Remove from all lanes
    for (const lane of this.lanes) {
      lane.blockIds = lane.blockIds.filter((id) => id !== blockId);
    }

    // Add to target lane
    const targetLane = this.lanes.find((l) => l.id === targetLaneId);
    if (targetLane) {
      targetLane.blockIds.push(blockId);
    }
  }

  reorderBlockInLane(laneId: LaneId, blockId: BlockId, newIndex: number): void {
    const lane = this.lanes.find((l) => l.id === laneId);
    if (!lane) return;

    const oldIndex = lane.blockIds.indexOf(blockId);
    if (oldIndex === -1) return;

    // Remove from old position
    lane.blockIds.splice(oldIndex, 1);

    // Insert at new position
    lane.blockIds.splice(newIndex, 0, blockId);
  }

  // =============================================================================
  // Actions - Layout Management
  // =============================================================================

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
  // Actions - Settings
  // =============================================================================

  setAdvancedLaneMode(enabled: boolean): void {
    this.settings.advancedLaneMode = enabled;

    // Switch layout based on mode
    if (enabled) {
      this.switchLayout('detailed');
    } else {
      this.switchLayout('simple');
    }
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

  setWarnBeforeDisconnect(enabled: boolean): void {
    this.settings.warnBeforeDisconnect = enabled;
  }

  setFilterByLane(enabled: boolean): void {
    this.settings.filterByLane = enabled;
  }

  setFilterByConnection(enabled: boolean): void {
    this.settings.filterByConnection = enabled;
  }

  // =============================================================================
  // Actions - Composite Management
  // =============================================================================

  saveComposite(composite: Composite): void {
    this.composites.push(composite);
  }

  deleteComposite(id: string): void {
    this.composites = this.composites.filter((c) => c.id !== id);
  }

  instantiateComposite(compositeId: string, laneId: LaneId, position: { x: number; y: number }): void {
    const composite = this.composites.find((c) => c.id === compositeId);
    if (!composite) return;

    // Create new blocks with updated IDs and positions
    const idMap = new Map<BlockId, BlockId>();
    for (const block of composite.blocks) {
      const newId = `block-${this.nextId++}` as BlockId;
      idMap.set(block.id, newId);

      const newBlock: Block = {
        ...block,
        id: newId,
        position: {
          x: block.position.x + position.x,
          y: block.position.y + position.y,
        },
      };

      this.blocks.push(newBlock);

      // Add to lane
      const lane = this.lanes.find((l) => l.id === laneId);
      if (lane) {
        lane.blockIds.push(newId);
      }
    }

    // Create new connections with updated IDs
    for (const conn of composite.connections) {
      const fromId = idMap.get(conn.from.blockId);
      const toId = idMap.get(conn.to.blockId);
      if (!fromId || !toId) continue;

      const newConn: Connection = {
        id: `conn-${this.nextId++}`,
        from: { blockId: fromId, port: conn.from.port },
        to: { blockId: toId, port: conn.to.port },
      };

      this.connections.push(newConn);
    }
  }

  // =============================================================================
  // Actions - Preview Management
  // =============================================================================

  setPreviewedDefinition(definition: any): void {
    this.previewedDefinition = definition;
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
   * Preview a block definition from the library (before placement).
   */
  previewDefinition(definition: any | null): void {
    this.previewedDefinition = definition;
    // Clear selected block when previewing
    if (definition) {
      this.uiState.selectedBlockId = null;
    }
  }

  setPlaying(playing: boolean): void {
    this.uiState.isPlaying = playing;
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

  setDraggingLaneKind(laneKind: LaneKind | null): void {
    this.uiState.draggingLaneKind = laneKind;
  }

  /**
   * Get bus by ID.
   */
  getBusById(id: string): Bus | null {
    return this.buses.find((b) => b.id === id) ?? null;
  }

  // =============================================================================
  // Actions - Bus Management
  // =============================================================================

  /**
   * Create a new bus.
   * @param typeDesc Type descriptor for the bus
   * @param name Human-readable name
   * @param combineMode How to combine multiple publishers
   * @param defaultValue Default value when no publishers
   * @returns Created bus ID
   */
  createBus(
    typeDesc: TypeDescriptor,
    name: string,
    combineMode: BusCombineMode,
    defaultValue?: any
  ): string {
    // Check for duplicate name (case-insensitive)
    const normalizedName = name.toLowerCase();
    if (this.buses.some(b => b.name.toLowerCase() === normalizedName)) {
      throw new Error(`Bus name "${name}" already exists`);
    }

    const bus: Bus = {
      id: `bus-${this.nextId++}`,
      name,
      type: typeDesc,
      combineMode,
      defaultValue,
      sortKey: this.buses.length,
    };

    this.buses.push(bus);
    return bus.id;
  }

  /**
   * Delete a bus and all its routing.
   * @param busId Bus ID to delete
   */
  deleteBus(busId: string): void {
    // Remove bus
    this.buses = this.buses.filter(b => b.id !== busId);

    // Remove all publishers and listeners for this bus
    this.publishers = this.publishers.filter(p => p.busId !== busId);
    this.listeners = this.listeners.filter(l => l.busId !== busId);

    // Deselect if selected
    if (this.uiState.selectedBusId === busId) {
      this.uiState.selectedBusId = null;
    }
  }

  /**
   * Update bus properties.
   * @param busId Bus ID to update
   * @param updates Partial bus properties to update
   */
  updateBus(busId: string, updates: Partial<Pick<Bus, 'name' | 'combineMode' | 'defaultValue'>>): void {
    const bus = this.buses.find(b => b.id === busId);
    if (!bus) {
      throw new Error(`Bus ${busId} not found`);
    }

    if (updates.name !== undefined) bus.name = updates.name;
    if (updates.combineMode !== undefined) bus.combineMode = updates.combineMode;
    if (updates.defaultValue !== undefined) bus.defaultValue = updates.defaultValue;
  }

  // =============================================================================
  // Actions - Routing Management
  // =============================================================================

  /**
   * Add a publisher from an output to a bus.
   * @param busId Bus ID to publish to
   * @param blockId Block ID with output
   * @param port Output port name
   * @param adapterChain Optional adapter chain
   * @returns Created publisher ID
   */
  addPublisher(
    busId: string,
    blockId: BlockId,
    port: string,
    adapterChain?: AdapterStep[]
  ): string {
    const bus = this.buses.find(b => b.id === busId);
    if (!bus) {
      throw new Error(`Bus ${busId} not found`);
    }

    // Get next sort key
    const maxSortKey = this.publishers
      .filter(p => p.busId === busId)
      .reduce((max, p) => Math.max(max, p.sortKey), 0);

    const publisher: Publisher = {
      id: `pub-${this.nextId++}`,
      busId,
      from: { blockId, port },
      adapterChain,
      enabled: true,
      sortKey: maxSortKey + 10,
    };

    this.publishers.push(publisher);
    return publisher.id;
  }

  /**
   * Update publisher properties.
   * @param publisherId Publisher ID to update
   * @param updates Partial publisher properties to update
   */
  updatePublisher(publisherId: string, updates: Partial<Pick<Publisher, 'enabled' | 'sortKey'>>): void {
    const publisher = this.publishers.find(p => p.id === publisherId);
    if (!publisher) {
      throw new Error(`Publisher ${publisherId} not found`);
    }

    if (updates.enabled !== undefined) publisher.enabled = updates.enabled;
    if (updates.sortKey !== undefined) publisher.sortKey = updates.sortKey;
  }

  /**
   * Remove a publisher.
   * @param publisherId Publisher ID to remove
   */
  removePublisher(publisherId: string): void {
    this.publishers = this.publishers.filter(p => p.id !== publisherId);
  }

  /**
   * Add a listener from a bus to an input.
   * @param busId Bus ID to listen from
   * @param blockId Block ID with input
   * @param port Input port name
   * @param adapterChain Optional adapter chain
   * @returns Created listener ID
   */
  addListener(
    busId: string,
    blockId: BlockId,
    port: string,
    adapterChain?: AdapterStep[]
  ): string {
    const bus = this.buses.find(b => b.id === busId);
    if (!bus) {
      throw new Error(`Bus ${busId} not found`);
    }

    const listener: Listener = {
      id: `list-${this.nextId++}`,
      busId,
      to: { blockId, port },
      adapterChain,
      enabled: true,
    };

    this.listeners.push(listener);
    return listener.id;
  }

  /**
   * Update listener properties.
   * @param listenerId Listener ID to update
   * @param updates Partial listener properties to update
   */
  updateListener(listenerId: string, updates: Partial<Pick<Listener, 'enabled'>>): void {
    const listener = this.listeners.find(l => l.id === listenerId);
    if (!listener) {
      throw new Error(`Listener ${listenerId} not found`);
    }

    if (updates.enabled !== undefined) listener.enabled = updates.enabled;
  }

  /**
   * Remove a listener.
   * @param listenerId Listener ID to remove
   */
  removeListener(listenerId: string): void {
    this.listeners = this.listeners.filter(l => l.id !== listenerId);
  }

  /**
   * Reorder publishers within a bus.
   * @param publisherId Publisher to reorder
   * @param newSortKey New sort key position
   */
  reorderPublisher(publisherId: string, newSortKey: number): void {
    const publisher = this.publishers.find(p => p.id === publisherId);
    if (!publisher) {
      throw new Error(`Publisher ${publisherId} not found`);
    }

    const oldSortKey = publisher.sortKey;
    publisher.sortKey = newSortKey;

    // Adjust other publishers in the same bus
    this.publishers
      .filter(p => p.busId === publisher.busId && p.id !== publisherId)
      .forEach(p => {
        if (oldSortKey < newSortKey && p.sortKey > oldSortKey && p.sortKey <= newSortKey) {
          p.sortKey--;
        } else if (oldSortKey > newSortKey && p.sortKey < oldSortKey && p.sortKey >= newSortKey) {
          p.sortKey++;
        }
        });
  }

  // =============================================================================
  // Query Methods - Bus Routing
  // =============================================================================

  /**
   * Get all publishers for a bus.
   */
  getPublishersByBus(busId: string): Publisher[] {
    return this.publishers
      .filter(p => p.busId === busId)
      .sort((a, b) => a.sortKey - b.sortKey);
  }

  /**
   * Get all listeners for a bus.
   */
  getListenersByBus(busId: string): Listener[] {
    return this.listeners.filter(l => l.busId === busId);
  }

  /**
   * Get publishers for a specific block output port.
   */
  getPublishersByOutput(blockId: BlockId, port: string): Publisher[] {
    return this.publishers.filter(
      p => p.from.blockId === blockId && p.from.port === port
    );
  }

  /**
   * Get listeners for a specific block input port.
   */
  getListenersByInput(blockId: BlockId, port: string): Listener[] {
    return this.listeners.filter(
      l => l.to.blockId === blockId && l.to.port === port
    );
  }

  /**
   * Find all buses matching a type descriptor.
   */
  findBusesByTypeDesc(typeDesc: TypeDescriptor): Bus[] {
    return this.buses.filter(b =>
      b.type.world === typeDesc.world && b.type.domain === typeDesc.domain
    );
  }

  // =============================================================================
  // Serialization
  // =============================================================================

  /**
   * Serialize to JSON (for save/export).
   * Clean, version-controlled format.
   */
  toJSON(): Patch {
    const hasBuses = this.buses.length > 0 || this.publishers.length > 0 || this.listeners.length > 0;

    return {
      version: hasBuses ? 2 : 1,
      features: hasBuses ? { buses: true } : undefined,
      blocks: this.blocks.map((b) => ({ ...b })), // Clone to plain objects
      connections: this.connections.map((c) => ({ ...c })),
      lanes: this.lanes.map((l) => ({ ...l })),
      // Only include bus arrays if we have them (v2 patches)
      ...(hasBuses && {
        buses: this.buses.map((b) => ({ ...b })),
        publishers: this.publishers.map((p) => ({ ...p })),
        listeners: this.listeners.map((l) => ({ ...l })),
      }),
      settings: { ...this.settings },
      composites: this.composites.map((c) => ({ ...c })),
    };
  }

  /**
   * Deserialize from JSON (for load).
   * NOTE: Preserves playback state for live updates.
   */
  loadPatch(patch: Patch): void {
    // Migrate block params from old formats
    const migratedBlocks = patch.blocks.map(block => ({
      ...block,
      params: migrateBlockParams(block.type, block.params),
    }));

    this.blocks = migratedBlocks;
    this.connections = patch.connections;
    this.lanes = patch.lanes;
    this.settings = {
      seed: patch.settings?.seed || 0,
      speed: patch.settings?.speed || 1,
      advancedLaneMode: patch.settings?.advancedLaneMode || false,
      autoConnect: patch.settings?.autoConnect || false,
      showTypeHints: patch.settings?.showTypeHints || false,
      highlightCompatible: patch.settings?.highlightCompatible || false,
      warnBeforeDisconnect: patch.settings?.warnBeforeDisconnect || true,
      filterByLane: patch.settings?.filterByLane || false,
      filterByConnection: patch.settings?.filterByConnection || false,
    };

    // Handle v2 patch format with buses
    if (patch.version >= 2 || (patch.features?.buses)) {
      this.buses = patch.buses || [];
      this.publishers = patch.publishers || [];
      this.listeners = patch.listeners || [];
    } else {
      // Legacy v1 patch - ensure empty bus arrays
      this.buses = [];
      this.publishers = [];
      this.listeners = [];
    }

    if ('composites' in patch && Array.isArray((patch as any).composites)) {
      this.composites = (patch as any).composites;
    } else {
      this.composites = [];
    }
    this.uiState.selectedBlockId = null;
    // NOTE: Do NOT reset isPlaying - preserve playback state

    // Update ID counter to avoid collisions
    const maxId = Math.max(
      ...this.blocks.map((b) => parseInt(b.id.split('-')[1]) || 0),
      ...this.connections.map((c) => parseInt(c.id.split('-')[1]) || 0)
    );
    this.nextId = maxId + 1;
  }

  /**
   * Clear all blocks and connections.
   * NOTE: Preserves playback state (isPlaying) for live updates.
   */
  clearPatch(): void {
    this.blocks = [];
    this.connections = [];
    this.buses = [];
    this.publishers = [];
    this.listeners = [];
    this.uiState.selectedBlockId = null;
    // NOTE: Do NOT reset isPlaying - preserve playback state
    this.previewedDefinition = null;

    // Reset lane block assignments
    for (const lane of this.lanes) {
      lane.blockIds = [];
    }
  }

  /**
   * Load a demo animation with pre-wired blocks.
   */
  loadDemoAnimation(): void {
    this.clearPatch();

    // TODO: Add demo blocks here
  }
}
