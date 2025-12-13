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
  type ProofProgramName,
  type PlayState,
  type RenderTree,
  type Scene,
} from './runtime';
import type { CompilerService } from './compiler';
import type { Program } from './compiler/types';
import { logStore } from './logStore';
import './PreviewPanel.css';

type ProgramSource = 'compiled' | ProofProgramName;

interface PreviewPanelProps {
  width?: number;
  height?: number;
  compilerService?: CompilerService;
}

/**
 * Default scene for proof programs.
 */
const DEFAULT_SCENE: Scene = {
  id: 'default',
  bounds: { width: 800, height: 600 },
};

export const PreviewPanel = observer(({ width = 800, height = 600, compilerService }: PreviewPanelProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const playerRef = useRef<Player | null>(null);
  const rendererRef = useRef<SvgRenderer | null>(null);
  const lastGoodProgramRef = useRef<Program<RenderTree> | null>(null);

  const [playState, setPlayState] = useState<PlayState>('paused');
  const [currentTime, setCurrentTime] = useState(0);
  const [programSource, setProgramSource] = useState<ProgramSource>(compilerService ? 'compiled' : 'lineDrawing');
  const [maxTime, setMaxTime] = useState(10000); // 10 seconds default
  const [hasCompiledProgram, setHasCompiledProgram] = useState(false);

  // Initialize player and renderer
  useEffect(() => {
    if (!svgRef.current) return;

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
      }
    );
    playerRef.current = player;

    // Set initial scene
    player.setScene(DEFAULT_SCENE);

    // Set initial program based on source
    if (programSource === 'compiled' && compilerService) {
      const compiled = compilerService.getProgram();
      if (compiled) {
        player.setFactory(() => compiled);
        lastGoodProgramRef.current = compiled;
        setHasCompiledProgram(true);
        logStore.info('renderer', 'Loaded compiled program');
      } else {
        // Fallback to proof program
        const program = PROOF_PROGRAMS.lineDrawing;
        player.setFactory(() => program);
        logStore.info('renderer', 'No compiled program, using fallback');
      }
    } else {
      const program = PROOF_PROGRAMS[programSource as ProofProgramName] ?? PROOF_PROGRAMS.lineDrawing;
      player.setFactory(() => program);
      logStore.info('renderer', `Loaded proof program: ${programSource}`);
    }

    // Render initial frame
    player.scrubTo(0);

    return () => {
      player.destroy();
      renderer.clear();
    };
  }, [width, height]);

  // Update program when source selection changes
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (programSource === 'compiled' && compilerService) {
      const compiled = compilerService.getProgram();
      if (compiled) {
        player.setFactory(() => compiled);
        lastGoodProgramRef.current = compiled;
        setHasCompiledProgram(true);
        logStore.info('renderer', 'Switched to compiled program');
      } else if (lastGoodProgramRef.current) {
        // Use last good program
        player.setFactory(() => lastGoodProgramRef.current!);
        logStore.warn('renderer', 'Using last good compiled program');
      } else {
        logStore.warn('renderer', 'No compiled program available');
      }
    } else {
      const program = PROOF_PROGRAMS[programSource as ProofProgramName] ?? PROOF_PROGRAMS.lineDrawing;
      player.setFactory(() => program);
      logStore.info('renderer', `Switched to: ${programSource}`);
    }

    // Re-render at current time
    player.scrubTo(currentTime);
  }, [programSource, compilerService]);

  // Watch for compiler service program changes
  useEffect(() => {
    if (programSource !== 'compiled' || !compilerService) return;

    // Poll for changes (in future, use MobX reaction)
    const interval = setInterval(() => {
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
    }, 500);

    return () => clearInterval(interval);
  }, [programSource, compilerService]);

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

  const handleProgramChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setProgramSource(e.target.value as ProgramSource);
  }, []);

  const formatTime = (ms: number): string => {
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
  };

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <span className="preview-title">Preview</span>
        <select
          className="preview-program-select"
          value={programSource}
          onChange={handleProgramChange}
        >
          {compilerService && (
            <option value="compiled">
              Compiled {hasCompiledProgram ? '✓' : '(no program)'}
            </option>
          )}
          <optgroup label="Proof Programs">
            {Object.keys(PROOF_PROGRAMS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </optgroup>
        </select>
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
