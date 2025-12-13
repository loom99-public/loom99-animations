/**
 * Transport Component
 *
 * Playback controls and global settings (bottom bar).
 */

import { observer } from 'mobx-react-lite';
import type { EditorStore } from './store';
import { StatusBadge } from './StatusBadge';
import './Transport.css';

interface TransportProps {
  store: EditorStore;
}

/**
 * Transport provides playback controls and global settings.
 *
 * Phase 1: Static UI (non-functional buttons)
 * Phase 2: Wire up play/pause, scrubber
 * Phase 3: Add speed, seed controls
 * Phase 6: Add save/load buttons
 */
export const Transport = observer(({ store }: TransportProps) => {
  const { uiState, settings } = store;

  // TODO Phase 2: Implement playback (RAF loop)
  const handlePlayPause = () => {
    store.setPlaying(!uiState.isPlaying);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    store.setCurrentTime(parseFloat(e.target.value));
  };

  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    store.setSeed(parseInt(e.target.value) || 0);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    store.setSpeed(parseFloat(e.target.value) || 1);
  };

  return (
    <div className="transport">
      {/* Playback controls */}
      <div className="transport-section playback">
        <button
          className={`transport-button ${uiState.isPlaying ? 'playing' : ''}`}
          onClick={handlePlayPause}
          title={uiState.isPlaying ? 'Pause' : 'Play'}
        >
          {uiState.isPlaying ? '⏸' : '▶'}
        </button>

        <button className="transport-button" title="Stop" disabled>
          ⏹
        </button>
      </div>

      {/* Scrubber */}
      <div className="transport-section scrubber">
        <span className="time-display">
          {uiState.currentTime.toFixed(2)}s
        </span>
        <input
          type="range"
          className="scrubber-slider"
          min="0"
          max="10"
          step="0.01"
          value={uiState.currentTime}
          onChange={handleScrub}
        />
      </div>

      {/* Settings */}
      <div className="transport-section settings">
        <label className="setting-item">
          <span className="setting-label">Speed</span>
          <input
            type="number"
            className="setting-input"
            min="0.1"
            max="4"
            step="0.1"
            value={settings.speed}
            onChange={handleSpeedChange}
          />
        </label>

        <label className="setting-item">
          <span className="setting-label">Seed</span>
          <input
            type="number"
            className="setting-input"
            value={settings.seed}
            onChange={handleSeedChange}
          />
        </label>
      </div>

      {/* Actions (Phase 6) */}
      <div className="transport-section actions">
        <button className="transport-button secondary" disabled title="Save (Phase 6)">
          Save
        </button>
        <button className="transport-button secondary" disabled title="Load (Phase 6)">
          Load
        </button>
        <button className="transport-button secondary" disabled title="Export (Phase 6)">
          Export
        </button>
      </div>

      {/* Status */}
      <div className="transport-section status">
        <StatusBadge />
      </div>
    </div>
  );
});
