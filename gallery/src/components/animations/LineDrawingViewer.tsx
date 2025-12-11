/**
 * LineDrawingViewer - React component for line drawing animations
 * Uses Track system with PathMorphCompositor for shoot-in-and-curve effect
 *
 * Implements proper lifecycle: entrance → hold → exit → auto-restart
 * Supports 3 variance modes: original, varied, procedural
 */

import { useEffect, useRef, useState } from 'react';
import { Animation } from '../../core/Animation';
import { createLineDrawingAnimation, createLineDrawingExit } from '../../animations/LineDrawingAnimation';
import type { VarianceLevel, LineDefinition } from '../../animations/LineDrawingAnimation';
import { LOGO_PATHS, TEXT_PATHS, pathPointsToCompositorPoints, type LineData } from '../../data/pathData';
import './LineDrawingViewer.css';

export interface LineDrawingViewerProps {
  target: 'logo' | 'text';
  variant: 'original' | 'varied' | 'procedural';
  holdDuration?: number;
  autoLoop?: boolean;
  enableScrubbing?: boolean;
}

/**
 * Convert LineData to LineDefinition for factory
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
 * Get the paths for the target (logo or text)
 */
function getPathsForTarget(target: 'logo' | 'text'): LineData[] {
  return target === 'logo' ? LOGO_PATHS : TEXT_PATHS;
}

/**
 * Get viewport dimensions based on target
 */
function getViewBox(target: 'logo' | 'text'): string {
  return target === 'logo' ? '0 0 600 200' : '0 0 700 280';
}

/**
 * LineDrawingViewer component
 */
export function LineDrawingViewer({
  target,
  variant,
  holdDuration = 2000,
  autoLoop = true,
  enableScrubbing = false,
}: LineDrawingViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [animationState, setAnimationState] = useState<'waiting' | 'entrance' | 'hold' | 'exit' | 'scrubbing'>('waiting');
  const holdTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [scrubPosition, setScrubPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(1000);

  /**
   * Create animation using factory
   */
  const createAnimation = (): Animation => {
    const paths = getPathsForTarget(target);
    const lines: LineDefinition[] = paths.map(p => convertToLineDefinition(p, target));

    // Use factory to create animation with proper variance
    const animation = createLineDrawingAnimation({
      lines,
      variance: variant as VarianceLevel,
      duration: 400, // Match HTML original
      stagger: 80,   // Match HTML original
      entranceEasing: 'easeOutQuart',
    });

    return animation;
  };

  /**
   * Play animation sequence: entrance → hold → exit → (auto-restart or waiting)
   */
  const playAnimation = async (svg: SVGSVGElement, shouldLoop: boolean = autoLoop) => {
    // Clear any existing timeout
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    // Clear existing elements
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Re-add the defs
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

    // Create new animation
    const animation = createAnimation();
    animationRef.current = animation;

    // Render elements
    animation.getElements().forEach((element) => {
      element.render(svg);
    });

    try {
      // Entrance
      setAnimationState('entrance');
      await animation.entrance();

      if (!isMountedRef.current) return;

      // Hold
      setAnimationState('hold');
      await new Promise<void>((resolve) => {
        holdTimeoutRef.current = window.setTimeout(() => {
          holdTimeoutRef.current = null;
          resolve();
        }, holdDuration);
      });

      if (!isMountedRef.current) return;

      // Add exit animations to elements
      const elements = animation.getElements();
      createLineDrawingExit(elements as any[], {
        duration: 250,
        stagger: 20,
        easing: 'easeInCubic',
      });

      // Exit
      setAnimationState('exit');
      await animation.exit();

      if (!isMountedRef.current) return;

      // Auto-restart or waiting
      if (shouldLoop) {
        // Small delay before restart
        await new Promise(resolve => setTimeout(resolve, 100));
        if (isMountedRef.current) {
          playAnimation(svg, shouldLoop);
        }
      } else {
        setAnimationState('waiting');
      }
    } catch (error) {
      console.error('Animation error:', error);
      if (isMountedRef.current) {
        setAnimationState('waiting');
      }
    }
  };

  /**
   * Initialize scrubbing mode
   */
  const initializeScrubbing = (svg: SVGSVGElement) => {
    // Clear existing elements
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Re-add the defs
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

    // Create animation
    const animation = createAnimation();
    animationRef.current = animation;

    // Render elements
    animation.getElements().forEach((element) => {
      element.render(svg);
    });

    // Set total duration
    const duration = animation.getEntranceDuration();
    setTotalDuration(duration);

    // Start at position 0
    animation.seek(0);
    setAnimationState('scrubbing');
  };

  /**
   * Handle scrub position change from slider
   */
  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value);
    updateScrubPosition(newPosition);
  };

  /**
   * Handle scrub position change from text input
   */
  const handleScrubInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value) || 0;
    updateScrubPosition(Math.max(0, Math.min(totalDuration, newPosition)));
  };

  /**
   * Update scrub position and seek animation
   */
  const updateScrubPosition = (newPosition: number) => {
    setScrubPosition(newPosition);
    if (animationRef.current) {
      animationRef.current.seek(newPosition);
    }
  };

  /**
   * Play animation from scrubbing mode
   */
  const handlePlayFromScrub = () => {
    if (!svgRef.current || !animationRef.current) return;

    // Exit scrubbing mode and play the animation
    setAnimationState('entrance');

    const startTime = performance.now() - scrubPosition; // Resume from current position
    const isPlayingRef = { current: true }; // Local ref to track if still playing

    const animate = (timestamp: number) => {
      if (!isMountedRef.current || !isPlayingRef.current) return;

      const elapsed = timestamp - startTime;

      if (animationRef.current) {
        animationRef.current.seek(elapsed);
        setScrubPosition(elapsed);
      }

      // Check if complete
      if (elapsed >= totalDuration) {
        isPlayingRef.current = false;
        setAnimationState('scrubbing');
        setScrubPosition(totalDuration);
        return;
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  /**
   * Reset animation to start
   */
  const handleResetAnimation = () => {
    setScrubPosition(0);
    if (animationRef.current) {
      animationRef.current.seek(0);
    }
  };

  /**
   * Initialize animation on mount
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (!svgRef.current) return;

    const svg = svgRef.current;

    // Handle reduced motion
    if (prefersReducedMotion.current) {
      setAnimationState('waiting');
      return;
    }

    // Scrubbing mode - don't auto-play
    if (enableScrubbing) {
      initializeScrubbing(svg);
      return;
    }

    // Start animation sequence
    playAnimation(svg);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      if (animationRef.current) {
        animationRef.current.reset();
      }
    };
  }, [target, variant, holdDuration, autoLoop, enableScrubbing]);

  /**
   * Handle click to restart (ONLY from waiting state)
   */
  const handleClick = () => {
    if (animationState !== 'waiting' || !svgRef.current || prefersReducedMotion.current) {
      return;
    }

    // Start new animation sequence
    playAnimation(svgRef.current, autoLoop);
  };

  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="line-drawing-viewer" onClick={enableScrubbing ? undefined : handleClick}>
      <svg
        ref={svgRef}
        viewBox={getViewBox(target)}
        xmlns="http://www.w3.org/2000/svg"
        className="line-drawing-svg"
      />
      {enableScrubbing && (
        <div className="scrubbing-controls">
          <div className="scrub-buttons">
            <button className="scrub-btn" onClick={handleResetAnimation} title="Reset">
              ⏮
            </button>
            <button className="scrub-btn scrub-play" onClick={handlePlayFromScrub} title="Play">
              ▶
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
              />
              ms / {Math.round(totalDuration)}ms
            </span>
            <span className="scrub-percent">({Math.round((scrubPosition / totalDuration) * 100)}%)</span>
          </div>
        </div>
      )}
      {isDevelopment && (
        <div className="animation-state-indicator">{animationState}</div>
      )}
    </div>
  );
}
