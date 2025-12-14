/**
 * Editor Component
 *
 * Main editor container with multi-panel layout:
 * - Top: SettingsToolbar (with Save/Load/Export + StatusBadge)
 * - Left: BlockLibrary
 * - Center: PatchBay
 * - Right-Top: Preview (with all player controls)
 * - Right-Middle: Inspector
 * - Right-Bottom: Control Surface
 */

import { observer } from 'mobx-react-lite';
import { useMemo, useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  pointerWithin,
} from '@dnd-kit/core';
import { EditorStore } from './store';
import { BlockLibrary } from './BlockLibrary';
import { PatchBay } from './PatchBay';
import { Inspector } from './Inspector';
import { LogWindow } from './LogWindow';
import { PreviewPanel } from './PreviewPanel';
import { SettingsToolbar } from './SettingsToolbar';
import { ContextMenu } from './ContextMenu';
import { createCompilerService, setupAutoCompile } from './compiler';
import { ControlSurfaceStore, ControlSurfacePanel, generateSurfaceForMacro } from './controlSurface';
import type { BlockDefinition } from './blocks';
import type { LaneId } from './types';
import './Editor.css';

/**
 * Trash zone that appears when dragging placed blocks.
 */
function TrashZone({ isVisible }: { isVisible: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'trash-zone',
    data: { type: 'trash' },
  });

  if (!isVisible) return null;

  return (
    <div
      ref={setNodeRef}
      className={`trash-zone ${isOver ? 'trash-zone-active' : ''}`}
    >
      <span className="trash-icon">🗑️</span>
      <span className="trash-label">{isOver ? 'Release to delete' : 'Drop to delete'}</span>
    </div>
  );
}

/**
 * Drag overlay that shows the block being dragged.
 */
function DragOverlayContent({
  definition,
  placedBlockLabel,
  placedBlockColor,
}: {
  definition: BlockDefinition | null;
  placedBlockLabel: string | null;
  placedBlockColor: string | null;
}) {
  const label = definition?.label ?? placedBlockLabel;
  const color = definition?.color ?? placedBlockColor ?? '#666';

  if (!label) return null;

  return (
    <div
      className="drag-overlay-block"
      style={{
        backgroundColor: color,
        padding: '8px 12px',
        borderRadius: '6px',
        color: '#fff',
        fontWeight: 500,
        fontSize: '13px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
}

/**
 * Editor is the root component for the animation editor.
 */
export const Editor = observer(() => {
  // Create store once (memo to avoid recreating on re-renders)
  const store = useMemo(() => new EditorStore(), []);

  // Create control surface store
  const controlSurfaceStore = useMemo(() => new ControlSurfaceStore(store), [store]);

  // Create compiler service
  const compilerService = useMemo(() => createCompilerService(store), [store]);

  // Set up auto-compile on patch changes
  useEffect(() => {
    const dispose = setupAutoCompile(store, compilerService, {
      debounce: 30,
    });
    return dispose;
  }, [store, compilerService]);

  // Load a default macro on startup and generate its control surface
  useEffect(() => {
    store.addBlock('macro:radialBurst', 'scene');
    // Generate a default surface for the macro
    // Use setTimeout to ensure blocks are fully populated after macro expansion
    setTimeout(() => {
      const blockIds = new Map<string, string>();
      store.blocks.forEach((block) => {
        blockIds.set(block.type, block.id);
      });
      const surface = generateSurfaceForMacro('radialBurst', blockIds);
      if (surface) {
        controlSurfaceStore.setSurface(surface);
      }
    }, 0);
  }, [store, controlSurfaceStore]);

  // Track active drag state
  const [activeDefinition, setActiveDefinition] = useState<BlockDefinition | null>(null);
  const [activePlacedBlock, setActivePlacedBlock] = useState<{
    label: string;
    color: string;
    blockId: string;
  } | null>(null);

  const isDraggingPlacedBlock = activePlacedBlock !== null;

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'library-block') {
      setActiveDefinition(data.definition);
      // Set dragging lane kind for highlighting suggested lanes
      store.setDraggingLaneKind(data.definition?.laneKind ?? null);
    } else if (data?.type === 'patch-block') {
      // Dragging a placed block
      const block = store.blocks.find((b) => b.id === data.blockId);
      if (block) {
        setActivePlacedBlock({
          label: block.label,
          color: getBlockColor(block.type),
          blockId: block.id,
        });
      }
    }
  }

  function getBlockColor(blockType: string): string {
    // Import would create circular dep, so inline the lookup
    const colors: Record<string, string> = {
      Scene: '#4a9eff',
      Fields: '#a855f7',
      Time: '#22c55e',
      Math: '#f59e0b',
      Compose: '#ec4899',
      Render: '#ef4444',
    };
    const block = store.blocks.find((b) => b.type === blockType);
    return colors[block?.category ?? 'Compose'] ?? '#666';
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDefinition(null);
    setActivePlacedBlock(null);
    store.setDraggingLaneKind(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Dropping library block onto a lane
    if (activeData?.type === 'library-block' && overData?.type === 'lane') {
      const blockType = activeData.blockType as string;
      const laneId = (overData.laneId ?? overData.laneName) as LaneId;
      store.addBlock(blockType, laneId);
    }

    // Dropping placed block onto trash
    if (activeData?.type === 'patch-block' && overData?.type === 'trash') {
      const blockId = activeData.blockId as string;
      store.removeBlock(blockId);
    }

    // Dropping placed block onto a lane (move/reorder)
    if (activeData?.type === 'patch-block' && overData?.type === 'lane') {
      const blockId = activeData.blockId as string;
      const sourceLaneId = activeData.sourceLaneId as string;
      const targetLaneId = (overData.laneId ?? overData.laneName) as LaneId;

      if (sourceLaneId !== targetLaneId) {
        // Move to different lane
        store.moveBlockToLane(blockId, targetLaneId);
      }
      // Note: reordering within same lane would need drop position info
      // For now, moving to same lane just keeps it in place
    }
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="editor">
        <SettingsToolbar store={store} />
        <div className="editor-main">
          <BlockLibrary store={store} />

          <div className="editor-center">
            <PatchBay store={store} />
          </div>

          <div className="editor-right-panel">
            <div className="editor-preview">
              <PreviewPanel
                compilerService={compilerService}
                isPlaying={store.uiState.isPlaying}
                store={store}
              />
            </div>

            <div className="editor-control-surface">
              <ControlSurfacePanel store={controlSurfaceStore} />
            </div>
          </div>

          <div className="editor-inspector">
            <Inspector store={store} />
          </div>
        </div>

        <LogWindow />

        {/* Trash zone appears when dragging placed blocks */}
        <TrashZone isVisible={isDraggingPlacedBlock} />

        {/* Context menu for right-click actions */}
        <ContextMenu store={store} />
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent
          definition={activeDefinition}
          placedBlockLabel={activePlacedBlock?.label ?? null}
          placedBlockColor={activePlacedBlock?.color ?? null}
        />
      </DragOverlay>
    </DndContext>
  );
});
