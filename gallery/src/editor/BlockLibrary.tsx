/**
 * BlockLibrary Component
 *
 * Searchable catalog of available blocks (left panel).
 * Blocks can be dragged from here to the PatchBay.
 */

import { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useDraggable } from '@dnd-kit/core';
import type { EditorStore } from './store';
import { ALL_CATEGORIES, type BlockCategory } from './types';
import {
  BLOCK_DEFINITIONS,
  getBlocksByCategory,
  getBlocksForPalette,
  type BlockDefinition,
} from './blocks';
import './BlockLibrary.css';

interface BlockLibraryProps {
  store: EditorStore;
}

interface DraggableBlockItemProps {
  definition: BlockDefinition;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClickAdd: () => void;
}

/**
 * Individual draggable block item in the library.
 * Compact design with description in tooltip.
 * Left side (drag handle) = drag to place OR double-click to add, right side (name) = click to preview.
 */
function DraggableBlockItem({ definition, isSelected, onSelect, onDoubleClickAdd }: DraggableBlockItemProps) {
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClickAdd();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-item ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
      data-block-type={definition.type}
      title={definition.description}
    >
      {/* Drag handle - left portion */}
      <div
        className="block-drag-handle"
        style={{ backgroundColor: definition.color }}
        {...listeners}
        {...attributes}
      >
        <span className="drag-grip">⋮⋮</span>
      </div>
      {/* Click area - right portion (double-click to add) */}
      <span
        className="block-name"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onDoubleClick={handleDoubleClick}
      >
        {definition.label}
      </span>
    </div>
  );
}


/**
 * BlockLibrary displays available blocks by category with search.
 * Supports lane-based filtering when an active lane is set.
 */
export const BlockLibrary = observer(({ store }: BlockLibraryProps) => {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<BlockCategory>>(new Set());
  const [showAllBlocks, setShowAllBlocks] = useState(false);

  const previewedType = store.previewedDefinition?.type ?? null;
  const activeLane = store.activeLane;
  const filterByLane = store.settings.filterByLane;

  /**
   * Add a block to its suggested lane (first lane matching laneKind).
   */
  const addBlockToSuggestedLane = (definition: BlockDefinition) => {
    const targetLane = store.lanes.find((lane) => lane.kind === definition.laneKind);
    if (targetLane) {
      store.addBlock(definition.type, targetLane.id, definition.defaultParams);
    }
  };

  // Get filtered blocks based on lane context
  const { matched: matchedBlocks, other: otherBlocks } = useMemo(() => {
    return getBlocksForPalette(
      filterByLane,
      activeLane?.kind,
      activeLane?.flavor
    );
  }, [filterByLane, activeLane?.kind, activeLane?.flavor]);

  // Filter by search term
  const searchFilteredBlocks = useMemo(() => {
    if (!search.trim()) return null;
    const term = search.toLowerCase();
    return BLOCK_DEFINITIONS.filter(
      (b) =>
        b.label.toLowerCase().includes(term) ||
        b.description.toLowerCase().includes(term)
    );
  }, [search]);

  const toggleCategory = (category: BlockCategory) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Determine if we're in filtered mode (active lane + filter enabled)
  const isFiltered = filterByLane && activeLane !== null;

  return (
    <div className="block-library">
      <div className="library-header">
        <h2>Blocks <span className="library-total-count">({BLOCK_DEFINITIONS.length})</span></h2>
        {isFiltered && (
          <div className="library-filter-badge" title={`Showing blocks for ${activeLane.label}`}>
            {activeLane.kind}
          </div>
        )}
        <input
          type="text"
          className="library-search"
          placeholder="Search blocks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="library-categories">
        {searchFilteredBlocks ? (
          // Search results (flat list)
          <div className="search-results">
            {searchFilteredBlocks.length === 0 ? (
              <div className="category-empty">No matches</div>
            ) : (
              searchFilteredBlocks.map((definition) => (
                <DraggableBlockItem
                  key={definition.type}
                  definition={definition}
                  isSelected={previewedType === definition.type}
                  onSelect={() => store.previewDefinition(definition)}
                  onDoubleClickAdd={() => addBlockToSuggestedLane(definition)}
                />
              ))
            )}
          </div>
        ) : isFiltered ? (
          // Lane-filtered view
          <>
            {/* Matched blocks section */}
            <div className="filtered-section matched">
              <div className="filtered-section-header">
                <span className="filtered-section-label">For {activeLane.label}</span>
                <span className="filtered-section-count">{matchedBlocks.length}</span>
              </div>
              <div className="filtered-blocks">
                {matchedBlocks.length === 0 ? (
                  <div className="category-empty">No blocks for this lane type</div>
                ) : (
                  matchedBlocks.map((definition) => (
                    <DraggableBlockItem
                      key={definition.type}
                      definition={definition}
                      isSelected={previewedType === definition.type}
                      onSelect={() => store.previewDefinition(definition)}
                      onDoubleClickAdd={() => addBlockToSuggestedLane(definition)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Other blocks section (collapsible) */}
            {otherBlocks.length > 0 && (
              <div className={`filtered-section other ${showAllBlocks ? 'expanded' : ''}`}>
                <div
                  className="filtered-section-header clickable"
                  onClick={() => setShowAllBlocks(!showAllBlocks)}
                >
                  <span className="filtered-section-chevron">
                    {showAllBlocks ? '▾' : '▸'}
                  </span>
                  <span className="filtered-section-label">All other blocks</span>
                  <span className="filtered-section-count">{otherBlocks.length}</span>
                </div>
                {showAllBlocks && (
                  <div className="filtered-blocks">
                    {otherBlocks.map((definition) => (
                      <DraggableBlockItem
                        key={definition.type}
                        definition={definition}
                        isSelected={previewedType === definition.type}
                        onSelect={() => store.previewDefinition(definition)}
                        onDoubleClickAdd={() => addBlockToSuggestedLane(definition)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Category view (default, no filtering)
          ALL_CATEGORIES.map((category) => {
            const blocks = getBlocksByCategory(category);
            if (blocks.length === 0) return null;
            const isCollapsed = collapsed.has(category);

            return (
              <div key={category} className={`category ${isCollapsed ? 'collapsed' : ''}`}>
                <h3
                  className="category-label"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="category-chevron">{isCollapsed ? '▸' : '▾'}</span>
                  {category}
                  <span className="category-count">{blocks.length}</span>
                </h3>
                {!isCollapsed && (
                  <div className="category-blocks">
                    {blocks.map((definition) => (
                      <DraggableBlockItem
                        key={definition.type}
                        definition={definition}
                        isSelected={previewedType === definition.type}
                        onSelect={() => store.previewDefinition(definition)}
                        onDoubleClickAdd={() => addBlockToSuggestedLane(definition)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
