/**
 * BlockLibrary Component
 *
 * Searchable catalog of available blocks (left panel).
 * Blocks can be dragged from here to the PatchBay.
 */

import { observer } from 'mobx-react-lite';
import { useDraggable } from '@dnd-kit/core';
import type { EditorStore } from './store';
import type { BlockCategory } from './types';
import { getBlocksByCategory, type BlockDefinition } from './blocks';
import './BlockLibrary.css';

interface BlockLibraryProps {
  store: EditorStore;
}

/**
 * Individual draggable block item in the library.
 */
function DraggableBlockItem({ definition }: { definition: BlockDefinition }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${definition.type}`,
    data: {
      type: 'library-block',
      blockType: definition.type,
      definition,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`block-item ${isDragging ? 'dragging' : ''}`}
      data-block-type={definition.type}
    >
      <div
        className="block-color-indicator"
        style={{ backgroundColor: definition.color }}
      />
      <div className="block-info">
        <div className="block-name">{definition.label}</div>
        <div className="block-description">{definition.description}</div>
      </div>
    </div>
  );
}

/**
 * BlockLibrary displays available blocks by category.
 */
export const BlockLibrary = observer(({ store: _store }: BlockLibraryProps) => {
  // All categories (even empty ones for structure)
  const allCategories: BlockCategory[] = [
    'Scene',
    'Derivers',
    'Fields',
    'Time',
    'Events',
    'Dynamics',
    'Compose',
    'Render',
    'FX',
    'Adapters',
  ];

  return (
    <div className="block-library">
      <div className="library-header">
        <h2>Block Library</h2>
        {/* TODO Phase 3: Add search input */}
      </div>

      <div className="library-categories">
        {allCategories.map((category) => {
          const blocks = getBlocksByCategory(category);

          return (
            <div key={category} className="category">
              <h3 className="category-label">
                {category}
                {blocks.length > 0 && (
                  <span className="category-count">{blocks.length}</span>
                )}
              </h3>
              <div className="category-blocks">
                {blocks.length === 0 ? (
                  <div className="category-empty">No blocks yet</div>
                ) : (
                  blocks.map((definition) => (
                    <DraggableBlockItem
                      key={definition.type}
                      definition={definition}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
