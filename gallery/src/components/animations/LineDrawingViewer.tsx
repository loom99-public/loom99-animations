/**
 * LineDrawingViewer - React component for line drawing animations
 * Uses Track system to replace standalone HTML files
 *
 * Implements proper lifecycle: entrance → hold → exit → waiting (NO auto-restart)
 * Supports 3 variance modes: original, varied, procedural
 */

import { useEffect, useRef, useState } from 'react';
import { Animation } from '../../core/Animation';
import { createLineDrawingAnimation, createLineDrawingExit } from '../../animations/LineDrawingAnimation';
import type { VarianceLevel, LineDefinition } from '../../animations/LineDrawingAnimation';
import { LOGO_PATHS, TEXT_PATHS, pathPointsToSVGPath, type LineData } from '../../data/pathData';
import './LineDrawingViewer.css';

export interface LineDrawingViewerProps {
  target: 'logo' | 'text';
  variant: 'original' | 'varied' | 'procedural';
  holdDuration?: number;
}

/**
 * Convert LineData to LineDefinition for factory
 */
function convertToLineDefinition(lineData: LineData, target: 'logo' | 'text'): LineDefinition {
  const pathString = pathPointsToSVGPath(lineData.points);
  return {
    id: `line-${lineData.color}-${lineData.delay}`,
    path: pathString,
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
}: LineDrawingViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [animationState, setAnimationState] = useState<'waiting' | 'entrance' | 'hold' | 'exit'>('waiting');
  const holdTimeoutRef = useRef<number | null>(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

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
   * Play animation sequence: entrance → hold → exit → waiting
   */
  const playAnimation = async (animation: Animation) => {
    // Clear any existing timeout
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    try {
      // Entrance
      setAnimationState('entrance');
      await animation.entrance();

      // Hold
      setAnimationState('hold');
      await new Promise<void>((resolve) => {
        holdTimeoutRef.current = window.setTimeout(() => {
          holdTimeoutRef.current = null;
          resolve();
        }, holdDuration);
      });

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

      // Waiting (NO auto-restart - this prevents infinite loop)
      setAnimationState('waiting');
    } catch (error) {
      console.error('Animation error:', error);
      setAnimationState('waiting');
    }
  };

  /**
   * Initialize animation on mount
   */
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const animation = createAnimation();
    animationRef.current = animation;

    // Render elements to SVG
    animation.getElements().forEach((element) => {
      element.render(svg);
    });

    // Handle reduced motion
    if (prefersReducedMotion.current) {
      setAnimationState('waiting');
      return;
    }

    // Start animation sequence
    playAnimation(animation);

    // Cleanup
    return () => {
      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      animation.reset();
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
    };
  }, [target, variant, holdDuration]);

  /**
   * Handle click to restart (ONLY from waiting state)
   */
  const handleClick = () => {
    if (animationState !== 'waiting' || !svgRef.current || prefersReducedMotion.current) {
      return;
    }

    const svg = svgRef.current;

    // Clear existing elements
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Create new animation (important for varied/procedural to get new randomization)
    const animation = createAnimation();
    animationRef.current = animation;

    // Render elements
    animation.getElements().forEach((element) => {
      element.render(svg);
    });

    // Play animation sequence
    playAnimation(animation);
  };

  const isDevelopment = import.meta.env.DEV;

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
      {isDevelopment && (
        <div className="animation-state-indicator">{animationState}</div>
      )}
    </div>
  );
}
