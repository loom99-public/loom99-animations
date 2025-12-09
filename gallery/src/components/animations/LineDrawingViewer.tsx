/**
 * LineDrawingViewer - React component for line drawing animations
 * Uses Track system to replace standalone HTML files
 */

import { useEffect, useRef, useState } from 'react';
import { Animation } from '../../core/Animation';
import { LineElement } from '../../elements/LineElement';
import { LOGO_PATHS, TEXT_PATHS, pathPointsToSVGPath, type LineData } from '../../data/pathData';
import './LineDrawingViewer.css';

export interface LineDrawingViewerProps {
  target: 'logo' | 'text';
  variant: 'original' | 'varied' | 'procedural';
  holdDuration?: number;
}

/**
 * Get the paths for the target (logo or text)
 */
function getPathsForTarget(target: 'logo' | 'text'): LineData[] {
  return target === 'logo' ? LOGO_PATHS : TEXT_PATHS;
}

/**
 * Get viewport dimensions based on target
 */
function getViewBox(target: 'logo' | 'text'): string {
  return target === 'logo' ? '0 0 600 200' : '0 0 400 300';
}

/**
 * LineDrawingViewer component
 */
export function LineDrawingViewer({
  target,
  variant,
  holdDuration = 2000,
}: LineDrawingViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [animationState, setAnimationState] = useState<'waiting' | 'entrance' | 'hold' | 'exit'>('waiting');

  // Create animation on mount
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const paths = getPathsForTarget(target);

    // Apply variance if needed
    const modifiedPaths = variant === 'varied' ? applyVariance(paths) : paths;

    // Create LineElements from path data
    const elements: LineElement[] = modifiedPaths.map((lineData, index) => {
      const pathString = pathPointsToSVGPath(lineData.points);

      const element = new LineElement({
        id: `line-${index}`,
        path: pathString,
        stroke: lineData.color,
        strokeWidth: 12,
        fill: 'none',
      });

      // Add line drawing animation with delay
      element.addLineDrawing(lineData.duration, lineData.delay, 'easeOutQuart');

      // Add fade in
      element.addFadeIn(100, lineData.delay, 'linear');

      return element;
    });

    // Create animation
    const animation = new Animation({
      elements,
      onEntranceComplete: () => {
        setAnimationState('hold');
      },
      onExitComplete: () => {
        setAnimationState('waiting');
      },
    });

    animationRef.current = animation;

    // Render elements to SVG
    elements.forEach((element) => {
      element.render(svg);
    });

    // Start entrance animation
    setAnimationState('entrance');
    animation.entrance().then(() => {
      // Hold, then exit
      setTimeout(() => {
        setAnimationState('exit');
        animation.exit();
      }, holdDuration);
    });

    // Cleanup
    return () => {
      animation.reset();
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
    };
  }, [target, variant, holdDuration]);

  // Handle click to restart
  const handleClick = () => {
    if (!svgRef.current || !animationRef.current) return;

    const svg = svgRef.current;
    const animation = animationRef.current;

    // Clear existing elements
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Reset and recreate
    animation.reset();

    const paths = getPathsForTarget(target);
    const modifiedPaths = variant === 'varied' ? applyVariance(paths) : paths;

    const elements: LineElement[] = modifiedPaths.map((lineData, index) => {
      const pathString = pathPointsToSVGPath(lineData.points);

      const element = new LineElement({
        id: `line-${index}`,
        path: pathString,
        stroke: lineData.color,
        strokeWidth: 12,
        fill: 'none',
      });

      element.addLineDrawing(lineData.duration, lineData.delay, 'easeOutQuart');
      element.addFadeIn(100, lineData.delay, 'linear');

      return element;
    });

    // Re-create animation
    const newAnimation = new Animation({
      elements,
      onEntranceComplete: () => {
        setAnimationState('hold');
      },
      onExitComplete: () => {
        setAnimationState('waiting');
      },
    });

    animationRef.current = newAnimation;

    elements.forEach((element) => {
      element.render(svg);
    });

    setAnimationState('entrance');
    newAnimation.entrance().then(() => {
      setTimeout(() => {
        setAnimationState('exit');
        newAnimation.exit();
      }, holdDuration);
    });
  };

  return (
    <div className="line-drawing-viewer" onClick={handleClick}>
      <svg
        ref={svgRef}
        viewBox={getViewBox(target)}
        xmlns="http://www.w3.org/2000/svg"
        className="line-drawing-svg"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#00d4ff', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#7b2ff7', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#ff2d75', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>
      <div className="animation-state-indicator">{animationState}</div>
    </div>
  );
}

/**
 * Apply variance to paths (for 'varied' variant)
 * Randomizes delays and durations
 */
function applyVariance(paths: LineData[]): LineData[] {
  return paths.map((path) => ({
    ...path,
    delay: path.delay + Math.random() * 100 - 50,
    duration: path.duration + Math.random() * 200 - 100,
  }));
}
