/**
 * PreviewPanel Component
 *
 * Integrates Player + SvgRenderer to show live animation preview.
 * Supports:
 * - Play/pause/scrub
 * - Program selection (proof programs or compiled)
 * - Hot swap when program changes
 * - Uses last good program on compilation errors
 */

import { observer } from 'mobx-react-lite';
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Player,
  createPlayer,
  SvgRenderer,
  PROOF_PROGRAMS,
  type PlayState,
  type LoopMode,
  type RenderTree,
  type Scene,
  type TimelineHint,
  type CuePoint,
} from './runtime';
import type { CompilerService, Viewport } from './compiler';
import type { Program } from './compiler/types';
import type { EditorStore } from './store';
import { logStore } from './logStore';
import './PreviewPanel.css';

interface PreviewPanelProps {
  compilerService?: CompilerService;
  isPlaying?: boolean;
  store?: EditorStore;
  onShowHelp?: () => void;
}

/**
 * Default scene for proof programs.
 */
const DEFAULT_SCENE: Scene = {
  id: 'default',
  bounds: { width: 800, height: 600 },
};

const DEFAULT_VIEWPORT: Viewport = { width: 800, height: 600 };

export const PreviewPanel = observer(({ compilerService, isPlaying, store, onShowHelp }: PreviewPanelProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const playerRef = useRef<Player | null>(null);
  const rendererRef = useRef<SvgRenderer | null>(null);
  const lastGoodProgramRef = useRef<Program<RenderTree> | null>(null);

  const [playState, setPlayState] = useState<PlayState>('playing');
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(6000); // 6 seconds default
  const [hasCompiledProgram, setHasCompiledProgram] = useState(false);
  const [viewport, setViewport] = useState<Viewport>(
    compilerService?.getViewport() ?? DEFAULT_VIEWPORT
  );
  const [loopMode, setLoopMode] = useState<LoopMode>('loop');
  const [cuePoints, setCuePoints] = useState<readonly CuePoint[]>([]);
  const [timeline, setTimeline] = useState<TimelineHint | null>(null);

  // Speed and seed from store (with fallbacks)
  const speed = store?.settings.speed ?? 1.0;
  const seed = store?.settings.seed ?? 42;

  // Derive dimensions from viewport
  const { width, height } = viewport;

  // Initialize player and renderer ONCE (never destroy/recreate)
  useEffect(() => {
    if (!svgRef.current) return;
    if (playerRef.current) return; // Already initialized

    const svg = svgRef.current;
    const renderer = new SvgRenderer(svg);
    rendererRef.current = renderer;

    const handleStateChange = (state: PlayState) => {
      setPlayState(state);
      store?.setPlaying(state === 'playing');
    };

    const player = createPlayer(
      (tree: RenderTree, _tMs: number) => {
        renderer.render(tree);
      },
      {
        width,
        height,
        onStateChange: handleStateChange,
        onTimeChange: setCurrentTime,
        onLoopModeChange: setLoopMode,
        onTimelineChange: (hint) => {
          setTimeline(hint);
          // Update maxTime when timeline changes
          if (hint?.kind === 'finite') {
            setMaxTime(hint.durationMs);
          } else if (hint?.kind === 'infinite' && hint.windowMs) {
            setMaxTime(hint.windowMs);
          }
        },
        onCuePointsChange: setCuePoints,
        autoApplyTimeline: true,
      }
    );
    player.setMaxTime(maxTime);
    player.setLoopMode(loopMode);
    playerRef.current = player;

    // Set initial scene
    player.setScene(DEFAULT_SCENE);

    // Set initial program from compiler service
    if (compilerService) {
      const compiled = compilerService.getProgram();
      if (compiled) {
        player.setFactory(() => compiled);
        lastGoodProgramRef.current = compiled;
        setHasCompiledProgram(true);
        logStore.info('renderer', 'Loaded compiled program');
      } else {
        // Fallback to proof program while waiting for compilation
        const program = PROOF_PROGRAMS.lineDrawing;
        player.setFactory(() => program);
        logStore.info('renderer', 'No compiled program yet, using fallback');
      }
    } else {
      // No compiler service - use fallback
      const program = PROOF_PROGRAMS.lineDrawing;
      player.setFactory(() => program);
      logStore.info('renderer', 'No compiler service, using fallback');
    }

    // Start playing immediately
    player.play();

    return () => {
      player.destroy();
      renderer.clear();
    };
  }, []); // Empty deps - only run once

  // Sync with external isPlaying prop
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying && playState !== 'playing') {
      player.play();
    } else if (!isPlaying && playState === 'playing') {
      player.pause();
    }
  }, [isPlaying, playState]);

  // Watch for compiler service program and viewport changes
  useEffect(() => {
    if (!compilerService) return;

    // Poll for changes (in future, use MobX reaction)
    const interval = setInterval(() => {
      // Check for program changes
      const compiled = compilerService.getProgram();
      if (compiled && compiled !== lastGoodProgramRef.current) {
        const player = playerRef.current;
        if (player) {
          player.setFactory(() => compiled);
          lastGoodProgramRef.current = compiled;
          setHasCompiledProgram(true);
          logStore.debug('renderer', 'Hot swapped to new compiled program');
        }
      }

      // Check for viewport changes
      const newViewport = compilerService.getViewport();
      if (newViewport.width !== viewport.width || newViewport.height !== viewport.height) {
        setViewport(newViewport);
        logStore.debug('renderer', `Viewport changed to ${newViewport.width}x${newViewport.height}`);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [compilerService, viewport.width, viewport.height]);

  const handlePlayPause = useCallback(() => {
    playerRef.current?.toggle();
  }, []);

  const handleReset = useCallback(() => {
    playerRef.current?.reset();
  }, []);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const tMs = parseFloat(e.target.value);
    playerRef.current?.scrubTo(tMs);
  }, []);

  const handleLoopModeToggle = useCallback(() => {
    const modes: LoopMode[] = ['loop', 'pingpong', 'none'];
    const currentIndex = modes.indexOf(loopMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setLoopMode(nextMode);
    playerRef.current?.setLoopMode(nextMode);
  }, [loopMode]);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value) || 1;
    const clampedSpeed = Math.max(0.1, Math.min(4, newSpeed));
    store?.setSpeed(clampedSpeed);
    playerRef.current?.setSpeed(clampedSpeed);
  }, [store]);

  const handleSeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSeed = parseInt(e.target.value) || 0;
    store?.setSeed(newSeed);
    // Seed change triggers recompilation via autoCompile
  }, [store]);

  const formatTime = (ms: number): string => {
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
  };

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <span className="preview-title">Preview</span>
        <div className="preview-header-actions">
          <button
            className="preview-help-btn"
            onClick={() => onShowHelp?.()}
            title="What is the Preview?"
          >
            ?
          </button>
          <span className="preview-status">
            {hasCompiledProgram ? '● Live' : '○ No program'}
          </span>
        </div>
      </div>

      <div className="preview-canvas" style={{ width: '100%', height: '100%' }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="preview-svg"
        />
      </div>

      <div className="preview-controls">
        {/* Top row: Scrubber + time displays */}
        <div className="preview-controls-scrubber-row">
          <span className="preview-time">{formatTime(currentTime)}</span>

          {/* Scrubber with cue point markers */}
          <div className="preview-scrubber-container">
            <input
              type="range"
              className="preview-scrubber"
              min={0}
              max={maxTime}
              step={16}
              value={currentTime}
              onChange={handleScrub}
            />
            {/* Cue point markers */}
            {cuePoints.map((cue, i) => {
              const percent = maxTime > 0 ? (cue.tMs / maxTime) * 100 : 0;
              return (
                <div
                  key={`cue-${i}`}
                  className={`cue-marker cue-${cue.kind ?? 'marker'}`}
                  style={{ left: `${percent}%` }}
                  title={`${cue.label} (${formatTime(cue.tMs)})`}
                />
              );
            })}
          </div>

          <span className="preview-time">{formatTime(maxTime)}</span>

          {/* Timeline indicator */}
          {timeline && (
            <span className="timeline-indicator" title={timeline.kind === 'finite' ? 'Finite duration' : 'Infinite animation'}>
              {timeline.kind === 'finite' ? '⏱' : '∞'}
            </span>
          )}
        </div>

        {/* Bottom row: Playback buttons + settings */}
        <div className="preview-controls-buttons-row">
          <button
            className={`preview-btn ${playState === 'playing' ? 'active' : ''}`}
            onClick={handlePlayPause}
            title={playState === 'playing' ? 'Pause' : 'Play'}
          >
            {playState === 'playing' ? '⏸' : '▶'}
          </button>

          <button
            className="preview-btn"
            onClick={handleReset}
            title="Reset"
          >
            ⏮
          </button>

          <button
            className={`preview-btn ${loopMode !== 'none' ? 'active' : ''}`}
            onClick={handleLoopModeToggle}
            title={`Loop: ${loopMode}`}
          >
            {loopMode === 'loop' ? '🔁' : loopMode === 'pingpong' ? '🔀' : '➡️'}
          </button>

          <div className="preview-controls-divider" />

          <div className="preview-setting">
            <span className="preview-setting-label">Speed</span>
            <input
              type="number"
              className="preview-setting-input"
              value={speed}
              onChange={handleSpeedChange}
              min={0.1}
              max={4}
              step={0.1}
              title="Playback speed (0.1 - 4x)"
            />
          </div>

          <div className="preview-setting">
            <span className="preview-setting-label">Seed</span>
            <input
              type="number"
              className="preview-setting-input"
              value={seed}
              onChange={handleSeedChange}
              min={0}
              step={1}
              title="Random seed (changes animation variation)"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
