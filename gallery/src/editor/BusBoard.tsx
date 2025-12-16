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

  const buses = store.buses;

  const handleNewBus = () => {
    // Stub for WI-2 - actual creation dialog will be implemented later
    console.log('New Bus clicked - creation dialog not yet implemented (WI-2)');
  };

  const handleSelectBus = (busId: string) => {
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
              title="Create new bus (WI-2)"
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
    </div>
  );
});
