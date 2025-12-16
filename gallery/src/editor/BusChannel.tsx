/**
 * BusChannel Component
 *
 * Individual channel strip for a single bus (DAW mixer metaphor).
 */

import { observer } from 'mobx-react-lite';
import type { Bus, BusCombineMode, CoreDomain } from './types';
import type { EditorStore } from './store';
import { BusViz } from './BusViz';
import './BusBoard.css';

interface BusChannelProps {
  bus: Bus;
  store: EditorStore;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Get domain icon for bus type badge.
 */
function getDomainIcon(domain: string): string {
  const icons: Record<string, string> = {
    number: '◆',
    vec2: '⬡',
    color: '■',
    boolean: '▢',
    time: '⏱',
    phase: '◷',
    rate: '⟲',
    trigger: '◉',
  };
  return icons[domain] ?? '?';
}

/**
 * Get domain-appropriate combine mode options.
 */
function getCombineModeOptions(domain: string): BusCombineMode[] {
  const options: Record<string, BusCombineMode[]> = {
    number: ['sum', 'average', 'max', 'min', 'last'],
    vec2: ['sum', 'average', 'last'],
    color: ['layer', 'last'],
    phase: ['last'],
    time: ['last'],
    rate: ['last'],
    trigger: ['last'], // Note: spec says "or" but type doesn't include it yet
    boolean: ['last'],
  };
  return options[domain] ?? ['last'];
}

/**
 * Check if domain is a core domain (for type guard).
 */
function isCoreDomain(domain: string): domain is CoreDomain {
  return ['number', 'vec2', 'color', 'boolean', 'time', 'phase', 'rate', 'trigger'].includes(domain);
}

/**
 * Individual bus channel strip.
 */
export const BusChannel = observer(({ bus, store, isSelected, onSelect }: BusChannelProps) => {
  const publishers = store.getPublishersByBus(bus.id);
  const listeners = store.getListenersByBus(bus.id);
  const subscriberCount = listeners.length;

  const domainIcon = getDomainIcon(bus.type.domain);
  const combineOptions = getCombineModeOptions(bus.type.domain);

  const handleNameChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const newName = e.target.value.trim();
    if (newName && newName !== bus.name) {
      store.updateBus(bus.id, { name: newName });
    }
  };

  const handleCombineModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    store.updateBus(bus.id, { combineMode: e.target.value as BusCombineMode });
  };

  return (
    <div
      className={`bus-channel ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="bus-channel-header">
        <input
          className="bus-channel-name"
          type="text"
          defaultValue={bus.name}
          onBlur={handleNameChange}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="bus-channel-type-badge">
          <span className="bus-type-icon">{domainIcon}</span>
          <span className="bus-type-label">Signal:{bus.type.domain}</span>
        </div>
        <div className="bus-channel-active-indicator" title="Active indicator (placeholder)">
          ●
        </div>
      </div>

      {/* Live Visualization */}
      <div className="bus-channel-viz" title={`${bus.type.domain} visualization`}>
        {isCoreDomain(bus.type.domain) ? (
          <BusViz
            domain={bus.type.domain}
            defaultValue={bus.defaultValue}
            size={20}
          />
        ) : (
          <div className="bus-viz-placeholder">
            {/* Fallback for non-core domains */}
            <span className="bus-viz-icon">{domainIcon}</span>
          </div>
        )}
      </div>

      {/* Combine Mode */}
      <div className="bus-channel-combine">
        <label className="bus-channel-combine-label">Combine:</label>
        <select
          className="bus-channel-combine-select"
          value={bus.combineMode}
          onChange={handleCombineModeChange}
          onClick={(e) => e.stopPropagation()}
        >
          {combineOptions.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      {/* Publishers List */}
      <div className="bus-channel-publishers">
        <div className="bus-channel-section-header">Publishers ({publishers.length})</div>
        {publishers.length === 0 ? (
          <div className="bus-channel-empty">No publishers</div>
        ) : (
          <div className="bus-channel-publisher-list">
            {publishers.map((pub) => {
              const block = store.blocks.find((b) => b.id === pub.from.blockId);
              const blockLabel = block?.label ?? pub.from.blockId;
              return (
                <div key={pub.id} className="bus-channel-publisher-row">
                  <span className="bus-publisher-label" title={`${blockLabel}.${pub.from.port}`}>
                    {blockLabel}.{pub.from.port}
                  </span>
                  <button
                    className="bus-publisher-mute-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement mute toggle
                    }}
                    title="Mute (not implemented)"
                  >
                    {pub.enabled ? '◼' : '◻'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscriber Count */}
      <div className="bus-channel-subscribers">
        <span className="bus-channel-subscriber-count">
          Used by {subscriberCount} input{subscriberCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
});
