/**
 * SideBySideViewer - Side-by-side comparison of HTML and React animations
 *
 * Displays the original HTML animation logic alongside the React implementation,
 * controlled by a single set of scrubbing controls.
 */

import { useEffect, useRef, useState } from 'react';
import { Animation } from '../../core/Animation';
import { createLineDrawingAnimation } from '../../animations/LineDrawingAnimation';
import { HtmlAnimatedLine, createHtmlAnimationLines, type HtmlLineConfig } from '../../animations/HtmlAnimatedLine';
import type { VarianceLevel, LineDefinition } from '../../animations/LineDrawingAnimation';
import { LOGO_PATHS, pathPointsToCompositorPoints, type LineData } from '../../data/pathData';
import './SideBySideViewer.css';

export interface SideBySideViewerProps {
  target: 'logo' | 'text';
  variant: 'original' | 'varied' | 'procedural';
}

/**
 * Convert LineData to LineDefinition for React factory
 */
function convertToLineDefinition(lineData: LineData, target: 'logo' | 'text'): LineDefinition {
  const points = pathPointsToCompositorPoints(lineData.points);
  return {
    id: `line-${lineData.color}-${lineData.delay}`,
    startX: lineData.startX,
    startY: lineData.startY,
    points,
    stroke: lineData.color,
    strokeWidth: target === 'logo' ? 12 : 4,
  };
}

/**
 * Convert LineData to HtmlLineConfig
 */
function convertToHtmlConfig(lineData: LineData): HtmlLineConfig {
  return {
    startX: lineData.startX,
    startY: lineData.startY,
    points: lineData.points.map(p => ({
      x: p.x,
      y: p.y,
      type: p.type,
      cx: p.cx,
      cy: p.cy,
      rx: p.rx,
      ry: p.ry,
      rotation: p.rotation,
      largeArc: p.largeArc,
      sweep: p.sweep,
    })),
    color: lineData.color,
    delay: lineData.delay,
    duration: lineData.duration,
    foldDuration: lineData.foldDuration,
  };
}

/**
 * Get viewport dimensions based on target
 */
function getViewBox(target: 'logo' | 'text'): string {
  return target === 'logo' ? '0 0 600 200' : '0 0 700 280';
}

/**
 * SideBySideViewer component
 */
export function SideBySideViewer({ target, variant }: SideBySideViewerProps) {
  const htmlSvgRef = useRef<SVGSVGElement>(null);
  const reactSvgRef = useRef<SVGSVGElement>(null);
  const htmlLinesRef = useRef<HtmlAnimatedLine[]>([]);
  const reactAnimationRef = useRef<Animation | null>(null);
  const isMountedRef = useRef(true);

  const [scrubPosition, setScrubPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(1000);
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * Create SVG defs (gradient)
   */
  const createDefs = (svg: SVGSVGElement) => {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'logoGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('style', 'stop-color:#00d4ff;stop-opacity:1');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '50%');
    stop2.setAttribute('style', 'stop-color:#7b2ff7;stop-opacity:1');
    const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('style', 'stop-color:#ff2d75;stop-opacity:1');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    gradient.appendChild(stop3);
    defs.appendChild(gradient);
    svg.appendChild(defs);
  };

  /**
   * Initialize both animations
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (!htmlSvgRef.current || !reactSvgRef.current) return;

    const htmlSvg = htmlSvgRef.current;
    const reactSvg = reactSvgRef.current;

    // Clear existing elements
    while (htmlSvg.firstChild) htmlSvg.removeChild(htmlSvg.firstChild);
    while (reactSvg.firstChild) reactSvg.removeChild(reactSvg.firstChild);

    // Add defs to both SVGs
    createDefs(htmlSvg);
    createDefs(reactSvg);

    // Get path data
    const paths = LOGO_PATHS;

    // Create HTML animation lines
    const htmlConfigs = paths.map(convertToHtmlConfig);
    const htmlLines = createHtmlAnimationLines(htmlConfigs);
    htmlLinesRef.current = htmlLines;

    // Render HTML lines
    htmlLines.forEach(line => line.render(htmlSvg));

    // Create React animation
    const lines: LineDefinition[] = paths.map(p => convertToLineDefinition(p, target));
    const reactAnimation = createLineDrawingAnimation({
      lines,
      variance: variant as VarianceLevel,
      duration: 400,
      stagger: 80,
      entranceEasing: 'easeOutQuart',
    });
    reactAnimationRef.current = reactAnimation;

    // Render React elements
    reactAnimation.getElements().forEach(element => {
      element.render(reactSvg);
    });

    // Calculate total duration (HTML includes fold phase)
    const maxHtmlDuration = Math.max(...htmlLines.map(l => l.getTotalDuration()));
    const reactDuration = reactAnimation.getEntranceDuration();
    setTotalDuration(Math.max(maxHtmlDuration, reactDuration));

    // Initialize at position 0
    htmlLines.forEach(line => line.updateEntrance(0));
    reactAnimation.seek(0);

    return () => {
      isMountedRef.current = false;
    };
  }, [target, variant]);

  /**
   * Update both animations when scrub position changes
   */
  const updateAnimations = (elapsed: number) => {
    // Update HTML animation
    htmlLinesRef.current.forEach(line => line.updateEntrance(elapsed));

    // Update React animation
    if (reactAnimationRef.current) {
      reactAnimationRef.current.seek(elapsed);
    }
  };

  /**
   * Handle scrub slider change
   */
  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value);
    setScrubPosition(newPosition);
    updateAnimations(newPosition);
  };

  /**
   * Handle scrub text input change
   */
  const handleScrubInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value) || 0;
    const clamped = Math.max(0, Math.min(totalDuration, newPosition));
    setScrubPosition(clamped);
    updateAnimations(clamped);
  };

  /**
   * Handle play button
   */
  const handlePlay = () => {
    if (isPlaying) return;

    setIsPlaying(true);

    const startTime = performance.now() - scrubPosition;

    const animate = (timestamp: number) => {
      if (!isMountedRef.current) return;

      const elapsed = timestamp - startTime;

      setScrubPosition(elapsed);
      updateAnimations(elapsed);

      if (elapsed >= totalDuration) {
        setIsPlaying(false);
        setScrubPosition(totalDuration);
        return;
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  /**
   * Handle reset button
   */
  const handleReset = () => {
    setIsPlaying(false);
    setScrubPosition(0);

    // Reset HTML lines
    htmlLinesRef.current.forEach(line => line.reset());
    htmlLinesRef.current.forEach(line => line.updateEntrance(0));

    // Reset React animation
    if (reactAnimationRef.current) {
      reactAnimationRef.current.seek(0);
    }
  };

  const viewBox = getViewBox(target);

  return (
    <div className="side-by-side-viewer">
      <div className="animations-container">
        <div className="animation-panel">
          <div className="panel-label">HTML Original</div>
          <svg
            ref={htmlSvgRef}
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            className="animation-svg"
          />
        </div>
        <div className="animation-panel">
          <div className="panel-label">React Port</div>
          <svg
            ref={reactSvgRef}
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            className="animation-svg"
          />
        </div>
      </div>

      <div className="shared-controls">
        <div className="control-buttons">
          <button className="control-btn" onClick={handleReset} title="Reset">
            ⏮
          </button>
          <button
            className={`control-btn control-play ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlay}
            title="Play"
            disabled={isPlaying}
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
          <span className="scrub-percent">
            ({Math.round((scrubPosition / totalDuration) * 100)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
