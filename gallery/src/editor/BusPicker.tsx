/**
 * BusPicker Component
 *
 * Dropdown for selecting a bus to bind to an input port.
 * Shows compatible buses filtered by exact type match.
 * Positioned near the clicked port, stays on screen.
 */

import { observer } from 'mobx-react-lite';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { EditorStore } from './store';
import type { Bus, TypeDesc, PortRef } from './types';
import { SLOT_TYPE_TO_TYPE_DESC, isDirectlyCompatible } from './types';
import { BusCreationDialog } from './BusCreationDialog';
import './BusPicker.css';

interface BusPickerProps {
  store: EditorStore;
  isOpen: boolean;
  onClose: () => void;
  /** Port being bound */
  portRef: PortRef;
  /** Position to render dropdown */
  position: { x: number; y: number };
}

/**
 * Get compatible buses for a port's type.
 */
function getCompatibleBuses(store: EditorStore, portType: TypeDesc): Bus[] {
  return store.buses.filter((bus) => isDirectlyCompatible(bus.type, portType));
}

/**
 * Check if a port is already subscribed to a bus.
 */
function isPortSubscribedToBus(store: EditorStore, portRef: PortRef, busId: string): boolean {
  return store.listeners.some(
    (l) =>
      l.busId === busId &&
      l.to.blockId === portRef.blockId &&
      l.to.port === portRef.slotId
  );
}

/**
 * Bus picker dropdown component.
 */
export const BusPicker = observer((props: BusPickerProps) => {
  const { store, isOpen, onClose, portRef, position } = props;
  const [showConvertible, setShowConvertible] = useState(false);
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Get the port's TypeDesc
  const block = store.blocks.find((b) => b.id === portRef.blockId);
  const slot = block?.inputs.find((s) => s.id === portRef.slotId);

  if (!slot) {
    return null; // Port not found
  }

  const portTypeDesc = SLOT_TYPE_TO_TYPE_DESC[slot.type];
  if (!portTypeDesc) {
    console.warn(`No TypeDesc found for slot type: ${slot.type}`);
    return null;
  }

  const compatibleBuses = getCompatibleBuses(store, portTypeDesc);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSelectBus = (busId: string) => {
    // Add listener
    store.addListener(busId, portRef.blockId, portRef.slotId);
    onClose();
  };

  const handleCreateNewBus = () => {
    setIsCreationDialogOpen(true);
  };

  const handleBusCreated = (busId: string) => {
    // Auto-subscribe is handled by BusCreationDialog's autoSubscribeToBlock/Port props
    setIsCreationDialogOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  // Calculate position to keep dropdown on screen
  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 1000,
  };

  return createPortal(
    <>
      <div ref={pickerRef} className="bus-picker" style={dropdownStyle}>
        <div className="bus-picker-header">
          <h4 className="bus-picker-title">Select Bus</h4>
          <span className="bus-picker-type-hint">
            {portTypeDesc.world} · {portTypeDesc.domain}
          </span>
        </div>

        {/* Bus list */}
        <div className="bus-picker-list">
          {compatibleBuses.length === 0 ? (
            <div className="bus-picker-empty">No compatible buses</div>
          ) : (
            compatibleBuses.map((bus) => {
              const isSubscribed = isPortSubscribedToBus(store, portRef, bus.id);
              return (
                <div
                  key={bus.id}
                  className={`bus-picker-item ${isSubscribed ? 'subscribed' : ''}`}
                  onClick={() => !isSubscribed && handleSelectBus(bus.id)}
                  title={isSubscribed ? 'Already subscribed' : `Subscribe to ${bus.name}`}
                >
                  <span className="bus-picker-item-name">{bus.name}</span>
                  {isSubscribed && <span className="bus-picker-checkmark">✓</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Show convertible toggle (disabled in Phase 3) */}
        <div className="bus-picker-toggle">
          <label className="bus-picker-toggle-label" title="Phase 4 feature">
            <input
              type="checkbox"
              checked={showConvertible}
              onChange={(e) => setShowConvertible(e.target.checked)}
              disabled
            />
            <span>Show convertible</span>
          </label>
        </div>

        {/* Create new bus button */}
        <div className="bus-picker-footer">
          <button
            className="bus-picker-create-btn"
            onClick={handleCreateNewBus}
            title="Create a new bus of this type"
          >
            + Create new bus of this type
          </button>
        </div>
      </div>

      {/* Bus creation dialog */}
      <BusCreationDialog
        store={store}
        isOpen={isCreationDialogOpen}
        onClose={() => setIsCreationDialogOpen(false)}
        onCreated={handleBusCreated}
        suggestedType={portTypeDesc}
        autoSubscribeToBlock={portRef.blockId}
        autoSubscribeToPort={portRef.slotId}
      />
    </>,
    document.body
  );
});
