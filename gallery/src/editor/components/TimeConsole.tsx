/**
 * TimeConsole Component
 *
 * Mode-aware time control console that replaces the linear timeline scrubber.
 * Switches between three UI modes based on TimeModel.kind:
 * - finite: Bounded progress bar with start/end
 * - cyclic: Phase ring (stub for now)
 * - infinite: Sliding window (stub for now)
 *
 * Always-present controls: Run/Freeze, Speed, Seed
 */

import { memo } from 'react';
import type { TimeModel, CuePoint } from '../compiler/types';
import type { PlayState } from '../runtime';
import './TimeConsole.css';

// =============================================================================
// Types
// =============================================================================

export interface TimeConsoleProps {
  timeModel: TimeModel;
  currentTime: number;
  playState: PlayState;
  speed: number;
  seed: number;
  cuePoints: readonly CuePoint[];

  // Callbacks
  onScrub: (tMs: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeedChange: (seed: number) => void;
}

interface FiniteControlsProps {
  durationMs: number;
  currentTime: number;
  onScrub: (tMs: number) => void;
  cuePoints: readonly CuePoint[];
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

// =============================================================================
// FiniteControls Component
// =============================================================================

const FiniteControls = memo(function FiniteControls({
  durationMs,
  currentTime,
  onScrub,
  cuePoints,
}: FiniteControlsProps) {
  const progress = durationMs > 0 ? (currentTime / durationMs) * 100 : 0;
  const isEnded = durationMs > 0 && currentTime >= durationMs;

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    onScrub(Number(e.target.value));
  };

  return (
    <div className="finite-controls">
      {/* Time Readouts */}
      <div className="finite-readouts">
        <span className="finite-time-display">
          Time: {formatTime(currentTime)} / {formatTime(durationMs)}
        </span>
        <span className="finite-progress-display">
          Progress: {Math.round(progress)}%
          {isEnded && <span className="finite-ended-badge">ENDED</span>}
        </span>
      </div>

      {/* Bounded Scrubber */}
      <div className="finite-scrubber">
        <span className="finite-time-label finite-time-start">{formatTime(0)}</span>

        <div className="finite-scrubber-container">
          <input
            type="range"
            className="finite-scrubber-input"
            min={0}
            max={durationMs}
            step={16}
            value={currentTime}
            onChange={handleScrub}
          />

          {/* Cue Point Markers */}
          {cuePoints.map((cue, i) => {
            const percent = durationMs > 0 ? (cue.tMs / durationMs) * 100 : 0;
            return (
              <div
                key={`cue-${i}`}
                className={`finite-cue-marker cue-${cue.kind ?? 'marker'}`}
                style={{ left: `${percent}%` }}
                title={`${cue.label} (${formatTime(cue.tMs)})`}
              />
            );
          })}
        </div>

        <span className="finite-time-label finite-time-end">{formatTime(durationMs)}</span>
      </div>
    </div>
  );
});

// =============================================================================
// CyclicControls Placeholder
// =============================================================================

const CyclicControls = memo(function CyclicControls() {
  return (
    <div className="mode-placeholder">
      <span className="mode-placeholder-icon">🔄</span>
      <span className="mode-placeholder-text">CYCLE mode (coming soon)</span>
      <span className="mode-placeholder-hint">Phase ring visualization</span>
    </div>
  );
});

// =============================================================================
// InfiniteControls Placeholder
// =============================================================================

const InfiniteControls = memo(function InfiniteControls() {
  return (
    <div className="mode-placeholder">
      <span className="mode-placeholder-icon">∞</span>
      <span className="mode-placeholder-text">INFINITE mode (coming soon)</span>
      <span className="mode-placeholder-hint">Sliding window scope</span>
    </div>
  );
});

// =============================================================================
// TimeConsole Component
// =============================================================================

export const TimeConsole = memo(function TimeConsole({
  timeModel,
  currentTime,
  playState,
  speed,
  seed,
  cuePoints,
  onScrub,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
  onSeedChange,
}: TimeConsoleProps) {
  const isPlaying = playState === 'playing';

  const handleToggle = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value) || 1;
    const clampedSpeed = Math.max(0.1, Math.min(4, newSpeed));
    onSpeedChange(clampedSpeed);
  };

  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSeed = parseInt(e.target.value) || 0;
    onSeedChange(newSeed);
  };

  // Get duration/period for mode-specific controls
  const getDuration = (): number => {
    switch (timeModel.kind) {
      case 'finite':
        return timeModel.durationMs;
      case 'cyclic':
        return timeModel.periodMs;
      case 'infinite':
        return timeModel.windowMs;
    }
  };

  return (
    <div className="time-console">
      {/* Mode Badge */}
      <div className="time-console-header">
        <span className={`mode-badge mode-${timeModel.kind}`}>
          {timeModel.kind.toUpperCase()}
        </span>
      </div>

      {/* Mode-Specific Controls */}
      <div className="time-console-body">
        {timeModel.kind === 'finite' && (
          <FiniteControls
            durationMs={getDuration()}
            currentTime={currentTime}
            onScrub={onScrub}
            cuePoints={cuePoints}
          />
        )}
        {timeModel.kind === 'cyclic' && <CyclicControls />}
        {timeModel.kind === 'infinite' && <InfiniteControls />}
      </div>

      {/* Always-Present Controls */}
      <div className="time-console-controls">
        <button
          className={`tc-btn ${isPlaying ? 'active' : ''}`}
          onClick={handleToggle}
          title={isPlaying ? 'Freeze' : 'Run'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          className="tc-btn"
          onClick={onReset}
          title="Reset to start"
        >
          ⏮
        </button>

        <div className="tc-divider" />

        <div className="tc-setting">
          <span className="tc-setting-label">Speed</span>
          <input
            type="number"
            className="tc-setting-input"
            value={speed}
            onChange={handleSpeedChange}
            min={0.1}
            max={4}
            step={0.1}
            title="Playback speed (0.1 - 4x)"
          />
        </div>

        <div className="tc-setting">
          <span className="tc-setting-label">Seed</span>
          <input
            type="number"
            className="tc-setting-input"
            value={seed}
            onChange={handleSeedChange}
            min={0}
            step={1}
            title="Random seed (changes animation variation)"
          />
        </div>
      </div>
    </div>
  );
});

export default TimeConsole;
