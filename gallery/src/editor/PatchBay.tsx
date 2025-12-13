/**
 * PatchBay Component
 *
 * Visual representation of the 7-lane patch bay.
 * Displays lanes with blocks and connections.
 * Lanes are drop targets for blocks from the library.
 */

import { observer } from 'mobx-react-lite';
import { useDroppable } from '@dnd-kit/core';
import type { EditorStore } from './store';
import type { LaneName } from './types';
import { getBlockDefinition } from './blocks';
import './PatchBay.css';

interface PatchBayProps {
  store: EditorStore;
}

/**
 * Lane colors for visual identification.
 */
const LANE_COLORS: Record<LaneName, string> = {
  Scene: '#4a9eff',
  Fields: '#a855f7',
  Time: '#22c55e',
  Events: '#eab308',
  Dynamics: '#f97316',
  Composition: '#ec4899',
  Render: '#ef4444',
};

/**
 * Droppable lane component.
 */
function DroppableLane({
  store,
  laneName,
  label,
  description,
}: {
  store: EditorStore;
  laneName: LaneName;
  label: string;
  description: string;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `lane-${laneName}`,
    data: {
      type: 'lane',
      laneName,
    },
  });

  const lane = store.lanes.find((l) => l.name === laneName);
  const blockIds = lane?.blockIds ?? [];
  const laneColor = LANE_COLORS[laneName];

  return (
    <div
      ref={setNodeRef}
      className={`lane ${isOver ? 'drop-target' : ''}`}
      data-lane={laneName}
      style={{
        '--lane-color': laneColor,
      } as React.CSSProperties}
    >
      <div className="lane-header">
        <div className="lane-color-bar" style={{ backgroundColor: laneColor }} />
        <div className="lane-info">
          <h3 className="lane-label">{label}</h3>
          <p className="lane-description">{description}</p>
        </div>
      </div>

      <div className="lane-content">
        {blockIds.length === 0 && (
          <div className="lane-empty">
            {isOver ? 'Drop here' : 'Drag blocks here'}
          </div>
        )}

        {blockIds.map((blockId) => {
          const block = store.blocks.find((b) => b.id === blockId);
          if (!block) return null;

          const definition = getBlockDefinition(block.type);
          const isSelected = store.uiState.selectedBlockId === blockId;
          const blockColor = definition?.color ?? laneColor;

          return (
            <div
              key={blockId}
              className={`block ${isSelected ? 'selected' : ''}`}
              onClick={() => store.selectBlock(blockId)}
              style={{
                '--block-color': blockColor,
              } as React.CSSProperties}
            >
              <div
                className="block-color-bar"
                style={{ backgroundColor: blockColor }}
              />
              <div className="block-content">
                <div className="block-label">{block.label}</div>
                <div className="block-type">{block.type}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * PatchBay renders the 7 lanes with blocks.
 */
export const PatchBay = observer(({ store }: PatchBayProps) => {
  return (
    <div className="patch-bay">
      {store.lanes.map((lane) => (
        <DroppableLane
          key={lane.name}
          store={store}
          laneName={lane.name}
          label={lane.label}
          description={lane.description}
        />
      ))}
    </div>
  );
});
