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
  LaneName,
  Patch,
  EditorUIState,
  BlockType,
  BlockCategory,
} from './types';
import { getBlockDefinition } from './blocks';

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

  /** Lane definitions with block assignments */
  lanes: Lane[] = this.createDefaultLanes();

  /** Global settings */
  settings = {
    seed: 42,
    speed: 1.0,
  };

  /** UI state (non-serializable) */
  uiState: EditorUIState = {
    selectedBlockId: null,
    draggingBlockType: null,
    isPlaying: false,
    currentTime: 0,
  };

  /** ID counter for blocks/connections */
  private nextId = 1;

  // =============================================================================
  // Constructor
  // =============================================================================

  constructor() {
    makeObservable(this, {
      blocks: observable,
      connections: observable,
      lanes: observable,
      settings: observable,
      uiState: observable,
      addBlock: action,
      removeBlock: action,
      updateBlockParams: action,
      connect: action,
      disconnect: action,
      selectBlock: action,
      setPlaying: action,
      setCurrentTime: action,
      setSeed: action,
      setSpeed: action,
      loadPatch: action,
      selectedBlock: computed,
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

  // =============================================================================
  // Actions - Block Management
  // =============================================================================

  /**
   * Add a new block to the patch.
   * @param type Block type (e.g., 'RadialOrigin')
   * @param lane Lane to add block to
   * @param params Optional initial parameters
   * @returns Created block ID
   */
  addBlock(type: BlockType, lane: LaneName, params?: Record<string, unknown>): BlockId {
    const id = `block-${this.nextId++}`;

    // Look up block definition from registry
    const definition = getBlockDefinition(type);

    const block: Block = {
      id,
      type,
      label: definition?.label ?? type,
      inputs: definition?.inputs ?? [],
      outputs: definition?.outputs ?? [],
      params: params ?? definition?.defaultParams ?? {},
      category: definition?.category ?? this.inferCategory(lane),
      description: definition?.description ?? `${type} block`,
    };

    this.blocks.push(block);

    // Add to lane
    const laneObj = this.lanes.find((l) => l.name === lane);
    if (laneObj) {
      laneObj.blockIds.push(id);
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

    // Remove from lanes (in-place mutation for MobX)
    for (const lane of this.lanes) {
      const idx = lane.blockIds.indexOf(blockId);
      if (idx !== -1) {
        lane.blockIds.splice(idx, 1);
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
  // Helpers
  // =============================================================================

  private createDefaultLanes(): Lane[] {
    return [
      {
        name: 'Scene',
        label: 'Scene',
        description: 'What exists: geometry, text, assets',
        blockIds: [],
      },
      {
        name: 'Fields',
        label: 'Fields',
        description: 'Per-element parameters: origin, delay, color, size',
        blockIds: [],
      },
      {
        name: 'Time',
        label: 'Time',
        description: 'Clocks, easings, phase machines',
        blockIds: [],
      },
      {
        name: 'Events',
        label: 'Events',
        description: 'Discrete occurrences: clicks, timers, scripts',
        blockIds: [],
      },
      {
        name: 'Dynamics',
        label: 'Dynamics',
        description: 'Stateful transforms: spring, noise, integrators',
        blockIds: [],
      },
      {
        name: 'Composition',
        label: 'Composition',
        description: 'How animations relate: parallel, sequence, stagger',
        blockIds: [],
      },
      {
        name: 'Render',
        label: 'Render',
        description: 'Output: renderer + effects',
        blockIds: [],
      },
    ];
  }

  private inferCategory(lane: LaneName): BlockCategory {
    // Map lane to category (for now, 1:1)
    const mapping: Record<LaneName, BlockCategory> = {
      Scene: 'Scene',
      Fields: 'Fields',
      Time: 'Time',
      Events: 'Events',
      Dynamics: 'Dynamics',
      Composition: 'Compose',
      Render: 'Render',
    };
    return mapping[lane];
  }
}
