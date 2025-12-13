/**
 * Editor Component
 *
 * Main editor container with 4-panel layout:
 * - Left: BlockLibrary
 * - Center: PatchBay
 * - Right: Inspector
 * - Bottom: Transport
 */

import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  pointerWithin,
} from '@dnd-kit/core';
import { EditorStore } from './store';
import { BlockLibrary } from './BlockLibrary';
import { PatchBay } from './PatchBay';
import { Inspector } from './Inspector';
import { Transport } from './Transport';
import type { BlockDefinition } from './blocks';
import type { LaneName } from './types';
import './Editor.css';

/**
 * Drag overlay that shows the block being dragged.
 */
function DragOverlayContent({ definition }: { definition: BlockDefinition | null }) {
  if (!definition) return null;

  return (
    <div
      className="drag-overlay-block"
      style={{
        backgroundColor: definition.color,
        padding: '8px 12px',
        borderRadius: '6px',
        color: '#fff',
        fontWeight: 500,
        fontSize: '13px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        whiteSpace: 'nowrap',
      }}
    >
      {definition.label}
    </div>
  );
}

/**
 * Editor is the root component for the animation editor.
 */
export const Editor = observer(() => {
  // Create store once (memo to avoid recreating on re-renders)
  const store = useMemo(() => new EditorStore(), []);

  // Track active drag
  const [activeDefinition, setActiveDefinition] = useState<BlockDefinition | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'library-block') {
      setActiveDefinition(data.definition);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDefinition(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Dropping library block onto a lane
    if (activeData?.type === 'library-block' && overData?.type === 'lane') {
      const blockType = activeData.blockType as string;
      const laneName = overData.laneName as LaneName;

      // Add block to the store
      store.addBlock(blockType, laneName);
    }
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="editor">
        <div className="editor-main">
          <BlockLibrary store={store} />

          <div className="editor-center">
            <PatchBay store={store} />
          </div>

          <Inspector store={store} />
        </div>

        <Transport store={store} />
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent definition={activeDefinition} />
      </DragOverlay>
    </DndContext>
  );
});
