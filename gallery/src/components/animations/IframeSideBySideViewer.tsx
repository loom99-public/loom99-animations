/**
 * IframeSideBySideViewer - Side-by-side comparison using iframe for HTML animations
 *
 * This is a simpler alternative to SideBySideViewer that:
 * - Loads the actual HTML animation files in an iframe
 * - Uses postMessage to control them via controls.js
 * - Keeps V4 rendering inline
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { IframeHtmlViewer, type IframeHtmlViewerRef } from './IframeHtmlViewer';
import { createSVGInterpreter, type SVGInterpreter } from '../../anim-v4/render/svg';
import {
  compileOriginalLineDrawing,
  compileVariedLineDrawing,
  compileProceduralLineDrawing,
  createLineMorphPhaseMachine,
  getProgramDuration,
  compileOriginalParticles,
  compileVariedParticles,
  compileProceduralParticles,
  createParticlesPhaseMachine,
  getParticlesProgramDuration,
} from '../../anim-v4';
import type { RenderTree } from '../../anim-v4';
import './SideBySideViewer.css';

export interface IframeSideBySideViewerProps {
  technique: string;
  target: 'logo' | 'text';
  variant: 'original' | 'varied' | 'procedural';
}

function getViewBox(target: 'logo' | 'text'): string {
  return target === 'logo' ? '0 0 600 200' : '0 0 700 280';
}

const DEFAULT_CONTEXT = {
  env: { viewport: { width: 600, height: 200 } },
  input: {
    pointer: { x: 0, y: 0, down: false },
    scrollY: 0,
    keysDown: new Set<string>(),
  },
};

// Default total duration for animations without V4 implementation
const DEFAULT_DURATION = 4250;

export function IframeSideBySideViewer({ technique, target, variant }: IframeSideBySideViewerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(DEFAULT_DURATION);

  const iframeRef = useRef<IframeHtmlViewerRef>(null);
  const v4ContainerRef = useRef<HTMLDivElement>(null);
  const v4InterpreterRef = useRef<SVGInterpreter | null>(null);
  const seedRef = useRef(Math.floor(Math.random() * 1000000));
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(true);

  // V4 animation state
  const v4ProgramRef = useRef<{ signal: (t: number, ctx: any) => RenderTree } | null>(null);

  const viewBox = getViewBox(target);

  // Check if we have V4 implementation for this technique
  const hasV4Implementation = ['01', '02'].includes(technique);

  // Compile V4 animation
  useEffect(() => {
    if (!hasV4Implementation) return;

    const seed = seedRef.current;

    if (technique === '01') {
      // Line Drawing
      const compiler = variant === 'original'
        ? compileOriginalLineDrawing
        : variant === 'varied'
          ? compileVariedLineDrawing
          : compileProceduralLineDrawing;

      const program = compiler(seed, target);
      v4ProgramRef.current = program;
      const phaseMachine = createLineMorphPhaseMachine();
      setTotalDuration(getProgramDuration(phaseMachine) * 1000);
    } else if (technique === '02') {
      // Particles
      const compiler = variant === 'original'
        ? compileOriginalParticles
        : variant === 'varied'
          ? compileVariedParticles
          : compileProceduralParticles;

      const program = compiler(seed, target);
      v4ProgramRef.current = program;
      const phaseMachine = createParticlesPhaseMachine();
      setTotalDuration(getParticlesProgramDuration(phaseMachine) * 1000);
    }
  }, [technique, target, variant, hasV4Implementation]);

  // Initialize V4 renderer
  useEffect(() => {
    const v4Container = v4ContainerRef.current;
    if (!v4Container) return;

    // Clear existing content
    v4Container.innerHTML = '';

    if (hasV4Implementation) {
      const interpreter = createSVGInterpreter(v4Container);
      v4InterpreterRef.current = interpreter;
      const v4Svg = interpreter.getSVG();
      v4Svg.setAttribute('viewBox', viewBox);
      v4Svg.classList.add('animation-svg');
    } else {
      // Create stub for V4
      const stubDiv = document.createElement('div');
      stubDiv.className = 'v4-stub';
      stubDiv.innerHTML = `
        <div class="v4-stub-content">
          <div class="v4-stub-icon">🚧</div>
          <div class="v4-stub-text">V4 Not Implemented</div>
          <div class="v4-stub-technique">Technique ${technique}</div>
        </div>
      `;
      v4Container.appendChild(stubDiv);
    }

    return () => {
      v4Container.innerHTML = '';
    };
  }, [technique, viewBox, hasV4Implementation]);

  // Render V4 at a given time
  const renderV4 = useCallback((timeMs: number) => {
    if (!hasV4Implementation || !v4ProgramRef.current || !v4InterpreterRef.current) return;

    const timeSec = timeMs / 1000;
    const tree = v4ProgramRef.current.signal(timeSec, DEFAULT_CONTEXT);
    v4InterpreterRef.current.render(tree);
  }, [hasV4Implementation]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    startTimeRef.current = performance.now() - scrubPosition;

    const animate = () => {
      if (!isPlayingRef.current) return;

      const elapsed = performance.now() - startTimeRef.current;
      const loopedTime = elapsed % totalDuration;

      setScrubPosition(loopedTime);
      renderV4(loopedTime);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, totalDuration, renderV4]);

  // Sync iframe with play state
  useEffect(() => {
    if (isPlaying) {
      iframeRef.current?.resume();
    } else {
      iframeRef.current?.pause();
    }
  }, [isPlaying]);

  // Toggle playback
  const handleTogglePlayback = useCallback(() => {
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    isPlayingRef.current = newIsPlaying;
  }, [isPlaying]);

  // Scrub handler
  const handleScrubChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value, 10);
    setScrubPosition(time);
    renderV4(time);
    iframeRef.current?.jumpToTime(time);
  }, [renderV4]);

  // Scrub input handler
  const handleScrubInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value, 10) || 0;
    const clampedTime = Math.max(0, Math.min(time, totalDuration));
    setScrubPosition(clampedTime);
    renderV4(clampedTime);
    iframeRef.current?.jumpToTime(clampedTime);
  }, [totalDuration, renderV4]);

  return (
    <div className="side-by-side-viewer">
      <div className="animations-container" onClick={handleTogglePlayback}>
        <div className="animation-panel">
          <div className="panel-label">HTML Original {isPlaying ? '⏸' : '▶'}</div>
          <IframeHtmlViewer
            ref={iframeRef}
            technique={technique}
            target={target}
            variant={variant}
            seed={seedRef.current}
            className="animation-iframe"
          />
        </div>
        <div className="animation-panel">
          <div className="panel-label">V4 Pure {isPlaying ? '⏸' : '▶'}</div>
          <div ref={v4ContainerRef} className="v4-svg-container" />
        </div>
      </div>

      <div className="shared-controls">
        <input
          type="range"
          min="0"
          max={totalDuration}
          step="1"
          value={scrubPosition}
          onChange={handleScrubChange}
          className="scrub-slider"
          disabled={isPlaying}
        />
        <div className="scrub-info">
          <span>
            <input
              type="number"
              min="0"
              max={totalDuration}
              step="1"
              value={Math.round(scrubPosition)}
              onChange={handleScrubInputChange}
              className="scrub-input"
              disabled={isPlaying}
            />
            ms / {Math.round(totalDuration)}ms
          </span>
          <span className="scrub-seed">seed: {seedRef.current}</span>
          <span className="scrub-percent">
            ({Math.round((scrubPosition / totalDuration) * 100)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
