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
} from './runtime';
import type { CompilerService, Viewport } from './compiler';
import type { Program } from './compiler/types';
import { logStore } from './logStore';
import './PreviewPanel.css';

interface PreviewPanelProps {
  compilerService?: CompilerService;
}

/**
 * Default scene for proof programs.
 */
const DEFAULT_SCENE: Scene = {
  id: 'default',
  bounds: { width: 800, height: 600 },
};

const DEFAULT_VIEWPORT: Viewport = { width: 800, height: 600 };

export const PreviewPanel = observer(({ compilerService }: PreviewPanelProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const playerRef = useRef<Player | null>(null);
  const rendererRef = useRef<SvgRenderer | null>(null);
  const lastGoodProgramRef = useRef<Program<RenderTree> | null>(null);

  const [playState, setPlayState] = useState<PlayState>('playing');
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(10000); // 10 seconds default
  const [hasCompiledProgram, setHasCompiledProgram] = useState(false);
  const [viewport, setViewport] = useState<Viewport>(
    compilerService?.getViewport() ?? DEFAULT_VIEWPORT
  );
  const [loopMode, setLoopMode] = useState<LoopMode>('loop');

  // Derive dimensions from viewport
  const { width, height } = viewport;

  // Initialize player and renderer ONCE (never destroy/recreate)
  useEffect(() => {
    if (!svgRef.current) return;
    if (playerRef.current) return; // Already initialized

    const svg = svgRef.current;
    const renderer = new SvgRenderer(svg);
    rendererRef.current = renderer;

    const player = createPlayer(
      (tree: RenderTree, tMs: number) => {
        renderer.render(tree);
      },
      {
        width,
        height,
        onStateChange: setPlayState,
        onTimeChange: setCurrentTime,
        onLoopModeChange: setLoopMode,
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

  const formatTime = (ms: number): string => {
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
  };

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <span className="preview-title">Preview</span>
        <span className="preview-status">
          {hasCompiledProgram ? '● Live' : '○ No program'}
        </span>
      </div>

      <div className="preview-canvas" style={{ width, height }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="preview-svg"
        />
      </div>

      <div className="preview-controls">
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

        <span className="preview-time">{formatTime(currentTime)}</span>

        <input
          type="range"
          className="preview-scrubber"
          min={0}
          max={maxTime}
          step={16}
          value={currentTime}
          onChange={handleScrub}
        />

        <span className="preview-time">{formatTime(maxTime)}</span>
      </div>
    </div>
  );
});
