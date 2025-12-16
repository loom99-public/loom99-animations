/**
 * BusCreationDialog Component
 *
 * Modal dialog for creating new buses with three entry paths:
 * 1. From Bus Board "New Bus" button
 * 2. From output port (auto-publish after creation)
 * 3. From input port (auto-subscribe after creation)
 */

import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import type { EditorStore } from './store';
import type { TypeDesc, BusCombineMode, CoreDomain } from './types';
import { isBusEligible } from './types';
import './BusCreationDialog.css';

interface BusCreationDialogProps {
  store: EditorStore;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (busId: string) => void;

  // For pre-filling when creating from output/input port
  suggestedType?: TypeDesc;
  suggestedName?: string;

  // For auto-publish/subscribe after creation
  autoPublishFromBlock?: string;
  autoPublishFromPort?: string;
  autoSubscribeToBlock?: string;
  autoSubscribeToPort?: string;
}

/**
 * Default bus names by domain (per spec).
 */
const DEFAULT_BUS_NAMES: Record<CoreDomain, string> = {
  number: 'energy',
  vec2: 'position',
  color: 'palette',
  phase: 'phaseA',
  time: 'clock',
  rate: 'speed',
  trigger: 'pulse',
  boolean: 'gate',
};

/**
 * Default combine modes by domain (per spec).
 */
const DEFAULT_COMBINE_MODES: Record<CoreDomain, BusCombineMode> = {
  number: 'sum',
  vec2: 'sum',
  color: 'layer',
  phase: 'last',
  time: 'last',
  rate: 'last',
  trigger: 'last', // Note: spec says "or" but type system uses 'last' for now
  boolean: 'last', // Note: spec says "or" but type system uses 'last' for now
};

/**
 * Get combine mode options for a domain (per spec).
 */
function getCombineModeOptions(domain: CoreDomain): BusCombineMode[] {
  const options: Record<CoreDomain, BusCombineMode[]> = {
    number: ['sum', 'average', 'max', 'min', 'last'],
    vec2: ['sum', 'average', 'last'],
    color: ['layer', 'last'],
    phase: ['last'],
    time: ['last'],
    rate: ['last'],
    trigger: ['last'], // Note: "or" in spec but not in type system yet
    boolean: ['last'], // Note: "or" in spec but not in type system yet
  };
  return options[domain] ?? ['last'];
}

/**
 * Core bus-eligible Signal types only.
 */
const CORE_SIGNAL_TYPES: Array<{ domain: CoreDomain; label: string }> = [
  { domain: 'number', label: 'Number (scalar)' },
  { domain: 'vec2', label: 'Vec2 (2D position/vector)' },
  { domain: 'color', label: 'Color' },
  { domain: 'boolean', label: 'Boolean (true/false)' },
  { domain: 'time', label: 'Time (seconds)' },
  { domain: 'phase', label: 'Phase [0,1]' },
  { domain: 'rate', label: 'Rate (multiplier)' },
  { domain: 'trigger', label: 'Trigger (pulse/event)' },
];

/**
 * Check if a bus name already exists (case-insensitive).
 */
function busNameExists(store: EditorStore, name: string): boolean {
  const lowerName = name.toLowerCase().trim();
  return store.buses.some((b) => b.name.toLowerCase() === lowerName);
}

/**
 * Bus creation dialog.
 */
export const BusCreationDialog = observer((props: BusCreationDialogProps) => {
  const {
    store,
    isOpen,
    onClose,
    onCreated,
    suggestedType,
    suggestedName,
    autoPublishFromBlock,
    autoPublishFromPort,
    autoSubscribeToBlock,
    autoSubscribeToPort,
  } = props;

  // Determine initial type from suggestion or default to number
  const getInitialDomain = (): CoreDomain => {
    if (suggestedType && isBusEligible(suggestedType)) {
      return suggestedType.domain as CoreDomain;
    }
    return 'number';
  };

  const [selectedDomain, setSelectedDomain] = useState<CoreDomain>(getInitialDomain());
  const [busName, setBusName] = useState<string>('');
  const [combineMode, setCombineMode] = useState<BusCombineMode>('last');
  const [validationError, setValidationError] = useState<string>('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      const domain = getInitialDomain();
      setSelectedDomain(domain);

      // Set name: suggested > default by domain
      const defaultName = suggestedName ?? DEFAULT_BUS_NAMES[domain];
      setBusName(defaultName);

      // Set combine mode: default by domain
      setCombineMode(DEFAULT_COMBINE_MODES[domain]);

      setValidationError('');
    }
  }, [isOpen, suggestedType, suggestedName]);

  // Update combine mode when domain changes
  useEffect(() => {
    setCombineMode(DEFAULT_COMBINE_MODES[selectedDomain]);
  }, [selectedDomain]);

  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const domain = e.target.value as CoreDomain;
    setSelectedDomain(domain);
    // Update name if it's still the default for previous domain
    if (busName === DEFAULT_BUS_NAMES[selectedDomain]) {
      setBusName(DEFAULT_BUS_NAMES[domain]);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusName(e.target.value);
    setValidationError('');
  };

  const handleCreate = () => {
    // Validation
    const trimmedName = busName.trim();

    if (!trimmedName) {
      setValidationError('Bus name cannot be empty');
      return;
    }

    if (busNameExists(store, trimmedName)) {
      setValidationError(`Bus named "${trimmedName}" already exists (case-insensitive)`);
      return;
    }

    // Create TypeDesc for the bus
    const typeDesc: TypeDesc = {
      world: 'signal',
      domain: selectedDomain,
      category: 'core',
      busEligible: true,
    };

    // Create the bus
    const busId = store.createBus(typeDesc, trimmedName, combineMode);

    // Auto-publish if requested
    if (autoPublishFromBlock && autoPublishFromPort) {
      store.addPublisher(busId, autoPublishFromBlock, autoPublishFromPort);
    }

    // Auto-subscribe if requested
    if (autoSubscribeToBlock && autoSubscribeToPort) {
      store.addListener(busId, autoSubscribeToBlock, autoSubscribeToPort);
    }

    // Notify caller
    onCreated?.(busId);

    // Close dialog
    onClose();
  };

  const handleCancel = () => {
    setValidationError('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !validationError) {
      handleCreate();
    }
  };

  if (!isOpen) return null;

  const combineOptions = getCombineModeOptions(selectedDomain);

  return (
    <div className="bus-creation-dialog-overlay" onClick={handleCancel}>
      <div
        className="bus-creation-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="bus-creation-dialog-header">
          <h2>Create New Bus</h2>
          <button className="bus-creation-close-btn" onClick={handleCancel} title="Close (Esc)">
            ×
          </button>
        </div>

        <div className="bus-creation-dialog-body">
          {/* Bus Name */}
          <div className="bus-creation-field">
            <label htmlFor="bus-name" className="bus-creation-label">
              Bus Name
            </label>
            <input
              id="bus-name"
              type="text"
              className="bus-creation-input"
              value={busName}
              onChange={handleNameChange}
              autoFocus
              placeholder="Enter bus name"
            />
            {validationError && <div className="bus-creation-error">{validationError}</div>}
          </div>

          {/* Type Picker (Signal types, core domains only) */}
          <div className="bus-creation-field">
            <label htmlFor="bus-type" className="bus-creation-label">
              Type
            </label>
            <select
              id="bus-type"
              className="bus-creation-select"
              value={selectedDomain}
              onChange={handleDomainChange}
            >
              {CORE_SIGNAL_TYPES.map(({ domain, label }) => (
                <option key={domain} value={domain}>
                  Signal&lt;{label}&gt;
                </option>
              ))}
            </select>
          </div>

          {/* Combine Mode Picker */}
          <div className="bus-creation-field">
            <label htmlFor="bus-combine-mode" className="bus-creation-label">
              Combine Mode
            </label>
            <select
              id="bus-combine-mode"
              className="bus-creation-select"
              value={combineMode}
              onChange={(e) => setCombineMode(e.target.value as BusCombineMode)}
            >
              {combineOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
            <div className="bus-creation-hint">How to combine multiple publishers</div>
          </div>
        </div>

        <div className="bus-creation-dialog-footer">
          <button className="bus-creation-btn bus-creation-cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="bus-creation-btn bus-creation-create-btn"
            onClick={handleCreate}
            disabled={!!validationError || !busName.trim()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
});
