/**
 * V4Viewer - Generic viewer for any V4 animation
 *
 * Works with any technique - the animation system is unified.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  compileOriginalLineDrawing,
  compileVariedLineDrawing,
  compileProceduralLineDrawing,
  compileOriginalParticles,
  compileVariedParticles,
  compileProceduralParticles,
  compileOriginalPathMorph,
  compileVariedPathMorph,
  compileProceduralPathMorph,
  compileOriginalGlitch,
  compileVariedGlitch,
  compileProceduralGlitch,
  compileLiquid,
  createLineMorphPhaseMachine,
  createParticlesPhaseMachine,
  createPathMorphPhaseMachine,
  createGlitchPhaseMachine,
  createLiquidPhaseMachine,
  getProgramDuration,
  getParticlesProgramDuration,
  getPathMorphProgramDuration,
  getGlitchProgramDuration,
  getLiquidProgramDuration,
  getGlitchScene,
  getLiquidScene,
  getLiquidViewport,
  createProceduralLiquidModeSystem,
  createVariedLiquidModeSystem,
  createLiquidModeSystem,
} from '../../anim-v4';
import type { RenderTree } from '../../anim-v4';
import { createSVGInterpreter, type SVGInterpreter } from '../../anim-v4/render/svg';
import './V4Viewer.css';

export interface V4ViewerProps {
  technique: string;
  target: 'logo' | 'text';
  variant: 'original' | 'varied' | 'procedural';
  seed?: number;
}

const DEFAULT_CONTEXT = {
  env: { viewport: { width: 600, height: 200 } },
  input: {
    pointer: { x: 0, y: 0, down: false },
    scrollY: 0,
    keysDown: new Set<string>(),
  },
};

function getViewBox(target: 'logo' | 'text'): string {
  return target === 'logo' ? '0 0 600 200' : '0 0 700 280';
}

function getEnv(target: 'logo' | 'text') {
  return target === 'logo'
    ? { viewport: { w: 600, h: 200 } }
    : { viewport: { w: 700, h: 280 } };
}

export function V4Viewer({ technique, target, variant, seed: propSeed }: V4ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const interpreterRef = useRef<SVGInterpreter | null>(null);
  const programRef = useRef<{ signal: (t: number, ctx: typeof DEFAULT_CONTEXT) => RenderTree } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const [seed] = useState(() => propSeed ?? Math.floor(Math.random() * 1000000));
  const [scrubPosition, setScrubPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(5000);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);

  const compileProgram = useCallback(() => {
    const env = getEnv(target);

    if (technique === '01') {
      // Line drawing
      const program = variant === 'original'
        ? compileOriginalLineDrawing(seed, target, env)
        : variant === 'varied'
          ? compileVariedLineDrawing(seed, target, env)
          : compileProceduralLineDrawing(seed, target, env);

      const phaseMachine = createLineMorphPhaseMachine(
        variant === 'procedural' ? 1.2 : 1.5, 2.0, 0.25
      );
      const duration = getProgramDuration(phaseMachine) * 1000;

      return { program, duration };
    } else if (technique === '02') {
      // Particles
      const program = variant === 'original'
        ? compileOriginalParticles(seed, target)
        : variant === 'varied'
          ? compileVariedParticles(seed, target)
          : compileProceduralParticles(seed, target);

      const phaseMachine = createParticlesPhaseMachine(2.5, 2.0, 0.5);
      const duration = getParticlesProgramDuration(phaseMachine) * 1000;

      return { program, duration };
    } else if (technique === '03') {
      // Path Morph
      const program = variant === 'original'
        ? compileOriginalPathMorph(seed, target, env)
        : variant === 'varied'
          ? compileVariedPathMorph(seed, target, env)
          : compileProceduralPathMorph(seed, target, env);

      const phaseMachine = createPathMorphPhaseMachine(
        variant === 'original' ? 2.0 : variant === 'varied' ? 2.5 : 3.0,
        2.0,
        0.5
      );
      const duration = getPathMorphProgramDuration(phaseMachine) * 1000;

      return { program, duration };
    } else if (technique === '04') {
      // Glitch
      const scene = getGlitchScene(target);
      const program = variant === 'original'
        ? compileOriginalGlitch(scene, seed, env)
        : variant === 'varied'
          ? compileVariedGlitch(scene, seed, env)
          : compileProceduralGlitch(scene, seed, env);

      // Calculate duration based on default timing
      const phaseMachine = createGlitchPhaseMachine(
        variant === 'procedural' ? 1.2 : 0.8,  // glitch duration
        variant === 'procedural' ? 1.5 : 1.0,  // stabilize duration
        2.0,                                    // hold duration
        0.25                                    // exit duration
      );
      const duration = getGlitchProgramDuration(phaseMachine) * 1000;

      return { program, duration };
    } else if (technique === '05') {
      // Liquid
      const scene = getLiquidScene(target);
      const viewport = getLiquidViewport(target);
      const liquidEnv = { viewport: { w: viewport.w, h: viewport.h } };

      const modeSystem = variant === 'original'
        ? createLiquidModeSystem({ origin: 'leftBand', goo: 'soft', behavior: 'wobble' })
        : variant === 'varied'
          ? createVariedLiquidModeSystem()
          : createProceduralLiquidModeSystem();

      const program = compileLiquid(scene, modeSystem, seed, liquidEnv, {
        entranceDuration: variant === 'procedural' ? 2.5 : 2.0,
        holdDuration: 1.5,
        exitDuration: 0.5,
        backgroundColor: '#0a0a0f',
      });

      const phaseMachine = createLiquidPhaseMachine(
        variant === 'procedural' ? 2.5 : 2.0,
        1.5,
        0.5
      );
      const duration = getLiquidProgramDuration(phaseMachine) * 1000;

      return { program, duration };
    }

    return null;
  }, [technique, target, variant, seed]);

  const updateAnimation = useCallback((elapsedMs: number) => {
    const program = programRef.current;
    const interpreter = interpreterRef.current;

    if (program && interpreter) {
      const elapsedSec = elapsedMs / 1000;
      const renderTree = program.signal(elapsedSec, DEFAULT_CONTEXT);
      interpreter.render(renderTree);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    // Clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Compile program
    const result = compileProgram();
    if (!result) return;

    programRef.current = result.program;
    setTotalDuration(result.duration);

    // Create interpreter
    const interpreter = createSVGInterpreter(container);
    interpreterRef.current = interpreter;

    const svg = interpreter.getSVG();
    svg.setAttribute('viewBox', getViewBox(target));
    svg.classList.add('v4-animation-svg');

    // Render initial frame
    updateAnimation(0);

    return () => {
      isMountedRef.current = false;
      isPlayingRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [technique, target, variant, seed, compileProgram, updateAnimation]);

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value);
    setScrubPosition(newPosition);
    updateAnimation(newPosition);
  };

  const handleScrubInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value) || 0;
    const clamped = Math.max(0, Math.min(totalDuration, newPosition));
    setScrubPosition(clamped);
    updateAnimation(clamped);
  };

  const stopAnimation = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const startAnimation = (fromPosition: number = 0) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setIsPlaying(true);

    let loopStartTime = performance.now() - fromPosition;

    const animate = (timestamp: number) => {
      if (!isMountedRef.current || !isPlayingRef.current) return;

      let elapsed = timestamp - loopStartTime;

      if (elapsed >= totalDuration) {
        loopStartTime = timestamp;
        elapsed = 0;
      }

      setScrubPosition(elapsed);
      updateAnimation(elapsed);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleTogglePlayback = () => {
    if (isPlayingRef.current) {
      stopAnimation();
    } else {
      startAnimation(scrubPosition);
    }
  };

  const handleReset = () => {
    stopAnimation();
    setScrubPosition(0);
    updateAnimation(0);
  };

  return (
    <div className="v4-viewer">
      <div
        ref={containerRef}
        className="v4-animation-container"
        onClick={handleTogglePlayback}
      />

      <div className="v4-controls">
        <div className="v4-control-buttons">
          <button className="v4-btn" onClick={handleReset} title="Reset">
            ⏮
          </button>
          <button
            className={`v4-btn v4-play ${isPlaying ? 'playing' : ''}`}
            onClick={handleTogglePlayback}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        <input
          type="range"
          min="0"
          max={totalDuration}
          step="1"
          value={scrubPosition}
          onChange={handleScrubChange}
          className="v4-scrub-slider"
          disabled={isPlaying}
        />

        <div className="v4-scrub-info">
          <span>
            <input
              type="number"
              min="0"
              max={totalDuration}
              step="1"
              value={Math.round(scrubPosition)}
              onChange={handleScrubInputChange}
              className="v4-scrub-input"
              disabled={isPlaying}
            />
            ms / {Math.round(totalDuration)}ms
          </span>
          <span className="v4-seed">seed: {seed}</span>
        </div>
      </div>
    </div>
  );
}
