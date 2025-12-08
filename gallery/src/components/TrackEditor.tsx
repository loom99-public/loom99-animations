/**
 * TrackEditor - Visual editor for animation tracks
 * Allows per-property easing curve editing
 */

import { useState, useRef, useEffect } from 'react';
import { Track } from '../core/Track';
import type { TrackConfig } from '../core/Track';
import { EASING_NAMES, getEasing } from '../core/easing';

interface TrackEditorProps {
  tracks: Map<string, Track<number>>;
  onTrackUpdate?: (name: string, config: Partial<TrackConfig<number>>) => void;
  onPreview?: () => void;
  totalDuration?: number;
}

interface TrackDisplayProps {
  name: string;
  track: Track<number>;
  totalDuration: number;
  onUpdate?: (config: Partial<TrackConfig<number>>) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function EasingCurvePreview({
  easing,
  width = 80,
  height = 40
}: {
  easing: string;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const easingFn = getEasing(easing);
    const padding = 4;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#3a3a50';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Easing curve
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i <= drawWidth; i++) {
      const t = i / drawWidth;
      const easedT = easingFn(t);
      const x = padding + i;
      const y = height - padding - easedT * drawHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }, [easing, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="easing-curve-preview"
    />
  );
}

function TrackDisplay({
  name,
  track,
  totalDuration,
  onUpdate,
  isExpanded,
  onToggleExpand,
}: TrackDisplayProps) {
  const [selectedEasing, setSelectedEasing] = useState(
    EASING_NAMES.find((e) => getEasing(e) === track.easing) || 'linear'
  );

  const handleEasingChange = (newEasing: string) => {
    setSelectedEasing(newEasing);
    onUpdate?.({ easing: newEasing });
  };

  // Calculate timeline position
  const startPercent = (track.delay / totalDuration) * 100;
  const widthPercent = (track.duration / totalDuration) * 100;

  return (
    <div className={`track-display ${isExpanded ? 'expanded' : ''}`}>
      <div className="track-header" onClick={onToggleExpand}>
        <span className="track-name">{name}</span>
        <span className="track-values">
          {typeof track.from === 'number' && typeof track.to === 'number'
            ? `${track.from.toFixed(1)} → ${track.to.toFixed(1)}`
            : 'complex'}
        </span>
        <span className="track-timing">
          {track.delay > 0 && `${track.delay}ms + `}
          {track.duration}ms
        </span>
        <EasingCurvePreview easing={selectedEasing} width={60} height={30} />
        <span className="track-expand-icon">{isExpanded ? '−' : '+'}</span>
      </div>

      {/* Timeline bar */}
      <div className="track-timeline">
        <div
          className="track-bar"
          style={{
            left: `${startPercent}%`,
            width: `${widthPercent}%`,
          }}
        />
      </div>

      {isExpanded && (
        <div className="track-details">
          <div className="track-row">
            <label>From</label>
            <input
              type="number"
              value={track.from as number}
              onChange={(e) => onUpdate?.({ from: parseFloat(e.target.value) })}
              step="0.1"
            />
          </div>
          <div className="track-row">
            <label>To</label>
            <input
              type="number"
              value={track.to as number}
              onChange={(e) => onUpdate?.({ to: parseFloat(e.target.value) })}
              step="0.1"
            />
          </div>
          <div className="track-row">
            <label>Duration</label>
            <input
              type="number"
              value={track.duration}
              onChange={(e) =>
                onUpdate?.({ duration: parseInt(e.target.value, 10) })
              }
              step="50"
              min="0"
            />
            <span className="unit">ms</span>
          </div>
          <div className="track-row">
            <label>Delay</label>
            <input
              type="number"
              value={track.delay}
              onChange={(e) =>
                onUpdate?.({ delay: parseInt(e.target.value, 10) })
              }
              step="50"
              min="0"
            />
            <span className="unit">ms</span>
          </div>
          <div className="track-row easing-row">
            <label>Easing</label>
            <div className="easing-selector">
              <select
                value={selectedEasing}
                onChange={(e) => handleEasingChange(e.target.value)}
              >
                {EASING_NAMES.map((easingName) => (
                  <option key={easingName} value={easingName}>
                    {easingName}
                  </option>
                ))}
              </select>
              <EasingCurvePreview easing={selectedEasing} width={100} height={50} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TrackEditor({
  tracks,
  onTrackUpdate,
  onPreview,
  totalDuration: propTotalDuration,
}: TrackEditorProps) {
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());

  // Calculate total duration from all tracks
  const totalDuration =
    propTotalDuration ||
    Math.max(
      ...Array.from(tracks.values()).map((t) => t.delay + t.duration),
      1000
    );

  const toggleExpand = (name: string) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTracks(new Set(tracks.keys()));
  };

  const collapseAll = () => {
    setExpandedTracks(new Set());
  };

  return (
    <div className="track-editor">
      <div className="track-editor-header">
        <h3>Animation Tracks</h3>
        <div className="track-editor-actions">
          <button onClick={expandAll} className="btn-small">
            Expand All
          </button>
          <button onClick={collapseAll} className="btn-small">
            Collapse All
          </button>
          {onPreview && (
            <button onClick={onPreview} className="btn-small btn-primary">
              Preview
            </button>
          )}
        </div>
      </div>

      {/* Master timeline */}
      <div className="master-timeline">
        <div className="timeline-markers">
          {[0, 25, 50, 75, 100].map((percent) => (
            <span key={percent} className="timeline-marker">
              {Math.round((percent / 100) * totalDuration)}ms
            </span>
          ))}
        </div>
        <div className="timeline-ruler" />
      </div>

      {/* Track list */}
      <div className="track-list">
        {Array.from(tracks.entries()).map(([name, track]) => (
          <TrackDisplay
            key={name}
            name={name}
            track={track}
            totalDuration={totalDuration}
            onUpdate={(config) => onTrackUpdate?.(name, config)}
            isExpanded={expandedTracks.has(name)}
            onToggleExpand={() => toggleExpand(name)}
          />
        ))}
      </div>

      <div className="track-editor-footer">
        <span className="total-duration">Total: {totalDuration}ms</span>
      </div>
    </div>
  );
}

export default TrackEditor;
