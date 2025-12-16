/**
 * BusBoard Component
 *
 * The "mixer console" for all buses in the patch.
 * Displays buses as vertical channel strips (DAW-style).
 */

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { EditorStore } from './store';
import { BusChannel } from './BusChannel';
import { BusCreationDialog } from './BusCreationDialog';
import './BusBoard.css';

interface BusBoardProps {
  store: EditorStore;
}

/**
 * Bus Board - vertical mixer panel for all buses.
 */
export const BusBoard = observer(({ store }: BusBoardProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);

  const buses = store.buses;

  const handleNewBus = () => {
    setIsCreationDialogOpen(true);
  };

  const handleSelectBus = (busId: string) => {
    setSelectedBusId(busId);
    // TODO WI-5: Set store.selectedBusId when bus selection is added to store
  };

  const handleBusCreated = (busId: string) => {
    // Select the newly created bus
    setSelectedBusId(busId);
    // TODO WI-5: Set store.selectedBusId when bus selection is added to store
  };

  return (
    <div className={`bus-board ${collapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="bus-board-header">
        <span className="bus-board-title">Bus Board</span>
        <div className="bus-board-actions">
          <button
            className="bus-board-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand Bus Board' : 'Collapse Bus Board'}
          >
            {collapsed ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* New Bus Button */}
          <div className="bus-board-toolbar">
            <button
              className="bus-board-new-btn"
              onClick={handleNewBus}
              title="Create new bus"
            >
              + New Bus
            </button>
          </div>

          {/* Bus Channels */}
          <div className="bus-board-channels">
            {buses.length === 0 ? (
              <div className="bus-board-empty">
                <p>No buses yet</p>
                <p className="bus-board-empty-hint">
                  Click "New Bus" to create a signal bus
                </p>
              </div>
            ) : (
              buses.map((bus) => (
                <BusChannel
                  key={bus.id}
                  bus={bus}
                  store={store}
                  isSelected={selectedBusId === bus.id}
                  onSelect={() => handleSelectBus(bus.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Bus Creation Dialog */}
      <BusCreationDialog
        store={store}
        isOpen={isCreationDialogOpen}
        onClose={() => setIsCreationDialogOpen(false)}
        onCreated={handleBusCreated}
      />
    </div>
  );
});
