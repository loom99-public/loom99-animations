/**
 * ParticleViewer - React component for particle convergence animations
 * Uses Canvas for rendering particles with glow effects
 *
 * Implements proper lifecycle: entrance → hold → exit → waiting (NO auto-restart)
 * Supports 3 variance modes: original, varied, procedural
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { LOGO_PATHS, TEXT_PATHS, pathPointsToSVGPath } from '../../data/pathData';
import type { LineData } from '../../data/pathData';
import './ParticleViewer.css';

export type VarianceLevel = 'original' | 'varied' | 'procedural';

export interface ParticleViewerProps {
  target: 'logo' | 'text';
  variant: VarianceLevel;
  holdDuration?: number;
}

interface Particle {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  exitX: number;
  exitY: number;
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  // Variance parameters
  entranceDuration: number;
  exitDuration: number;
  delay: number;
}

/**
 * Easing functions
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

// Note: easeOutQuart and easeOutBack are available for variance modes
// but currently not used - kept for future expansion

/**
 * Random utilities for variance
 */
const Random = {
  range: (min: number, max: number) => min + Math.random() * (max - min),
  vary: (base: number, variance: number) => base + Random.range(-variance, variance),
  pick: <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
};

/**
 * Get variance parameters based on level
 */
function getVarianceParams(variance: VarianceLevel) {
  switch (variance) {
    case 'original':
      return {
        durationVariance: 0,
        delayVariance: 0,
        sizeVariance: 0,
        colorVariance: 0,
        scatterVariance: 0,
      };
    case 'varied':
      return {
        durationVariance: 0.2,
        delayVariance: 300,
        sizeVariance: 0.5,
        colorVariance: 20,
        scatterVariance: 0.3,
      };
    case 'procedural':
      return {
        durationVariance: 0.5,
        delayVariance: 600,
        sizeVariance: 1.0,
        colorVariance: 60,
        scatterVariance: 0.6,
      };
  }
}

/**
 * Shift hue of an HSL color string
 */
function shiftHue(color: string, shift: number): string {
  // Convert hex to HSL for shifting
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    h = ((h * 360 + shift) % 360 + 360) % 360;
    return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }
  return color;
}

/**
 * Sample points along SVG paths
 */
function samplePathPoints(
  paths: LineData[],
  canvasWidth: number,
  canvasHeight: number,
  spacing: number = 4
): { x: number; y: number; color: string }[] {
  const points: { x: number; y: number; color: string }[] = [];

  // Create temporary SVG to sample paths
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(canvasWidth));
  svg.setAttribute('height', String(canvasHeight));
  svg.style.position = 'absolute';
  svg.style.visibility = 'hidden';
  document.body.appendChild(svg);

  try {
    paths.forEach((lineData) => {
      const pathD = pathPointsToSVGPath(lineData.points);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      svg.appendChild(path);

      const totalLength = path.getTotalLength();
      for (let i = 0; i < totalLength; i += spacing) {
        const point = path.getPointAtLength(i);
        points.push({
          x: point.x,
          y: point.y,
          color: lineData.color,
        });
      }
    });
  } finally {
    document.body.removeChild(svg);
  }

  return points;
}

/**
 * Create particles from sampled points
 */
function createParticles(
  target: 'logo' | 'text',
  variance: VarianceLevel,
  canvasWidth: number,
  canvasHeight: number
): Particle[] {
  const paths = target === 'logo' ? LOGO_PATHS : TEXT_PATHS;
  const points = samplePathPoints(paths, canvasWidth, canvasHeight, 4);
  const varianceParams = getVarianceParams(variance);

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const baseDuration = 2000;
  const baseExitDuration = 250;

  return points.map((point) => {
    // Calculate entrance position (random explosion from center)
    const angle = Math.random() * Math.PI * 2;
    const baseDistance = Math.random() * 400 + 200;
    const distance = varianceParams.scatterVariance > 0
      ? Random.vary(baseDistance, baseDistance * varianceParams.scatterVariance)
      : baseDistance;

    const startX = centerX + Math.cos(angle) * distance;
    const startY = centerY + Math.sin(angle) * distance;

    // Calculate exit position (scatter outward from target)
    const exitAngle = Math.random() * Math.PI * 2;
    const exitDistance = Math.random() * 300 + 200;
    const exitX = point.x + Math.cos(exitAngle) * exitDistance;
    const exitY = point.y + Math.sin(exitAngle) * exitDistance;

    // Calculate size with variance
    const baseSize = 2.5;
    const size = varianceParams.sizeVariance > 0
      ? Math.max(1, Random.vary(baseSize, baseSize * varianceParams.sizeVariance))
      : baseSize;

    // Calculate color with variance
    const color = varianceParams.colorVariance > 0
      ? shiftHue(point.color, Random.range(-varianceParams.colorVariance, varianceParams.colorVariance))
      : point.color;

    // Calculate timing with variance
    const entranceDuration = varianceParams.durationVariance > 0
      ? Math.max(500, Random.vary(baseDuration, baseDuration * varianceParams.durationVariance))
      : baseDuration;

    const exitDuration = varianceParams.durationVariance > 0
      ? Math.max(100, Random.vary(baseExitDuration, baseExitDuration * varianceParams.durationVariance))
      : baseExitDuration;

    const delay = varianceParams.delayVariance > 0
      ? Random.range(0, varianceParams.delayVariance)
      : 0;

    return {
      startX,
      startY,
      targetX: point.x,
      targetY: point.y,
      exitX,
      exitY,
      x: startX,
      y: startY,
      color,
      size,
      opacity: 0,
      entranceDuration,
      exitDuration,
      delay,
    };
  });
}

/**
 * ParticleViewer component
 */
export function ParticleViewer({
  target,
  variant,
  holdDuration = 2000,
}: ParticleViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const exitStartTimeRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const [animationState, setAnimationState] = useState<'waiting' | 'entrance' | 'hold' | 'exit'>('waiting');
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Canvas dimensions based on target
  const canvasWidth = target === 'logo' ? 600 : 700;
  const canvasHeight = target === 'logo' ? 200 : 280;

  /**
   * Draw all particles to canvas
   */
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas with background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw each particle
    particlesRef.current.forEach((particle) => {
      if (particle.opacity <= 0) return;

      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Reset context
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }, [canvasWidth, canvasHeight]);

  /**
   * Update particles for entrance animation
   */
  const updateEntrance = useCallback((elapsed: number) => {
    let allComplete = true;

    particlesRef.current.forEach((particle) => {
      const adjustedElapsed = Math.max(0, elapsed - particle.delay);
      const progress = Math.min(1, adjustedElapsed / particle.entranceDuration);

      if (progress < 1) {
        allComplete = false;
      }

      const eased = easeOutCubic(progress);
      particle.x = particle.startX + (particle.targetX - particle.startX) * eased;
      particle.y = particle.startY + (particle.targetY - particle.startY) * eased;
      particle.opacity = Math.min(1, progress * 2);
    });

    return allComplete;
  }, []);

  /**
   * Update particles for exit animation
   */
  const updateExit = useCallback((elapsed: number) => {
    let allComplete = true;

    particlesRef.current.forEach((particle) => {
      const progress = Math.min(1, elapsed / particle.exitDuration);

      if (progress < 1) {
        allComplete = false;
      }

      const eased = easeInCubic(progress);
      particle.x = particle.targetX + (particle.exitX - particle.targetX) * eased;
      particle.y = particle.targetY + (particle.exitY - particle.targetY) * eased;
      particle.opacity = 1 - eased;
    });

    return allComplete;
  }, []);

  /**
   * Animation loop
   */
  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;

    if (animationState === 'entrance') {
      const complete = updateEntrance(elapsed);
      draw(ctx);

      if (complete) {
        setAnimationState('hold');
        holdTimeoutRef.current = window.setTimeout(() => {
          holdTimeoutRef.current = null;
          exitStartTimeRef.current = null;
          setAnimationState('exit');
        }, holdDuration);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationState === 'hold') {
      draw(ctx);
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationState === 'exit') {
      if (exitStartTimeRef.current === null) {
        exitStartTimeRef.current = timestamp;
      }

      const exitElapsed = timestamp - exitStartTimeRef.current;
      const complete = updateExit(exitElapsed);
      draw(ctx);

      if (complete) {
        setAnimationState('waiting');
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    }
  }, [animationState, updateEntrance, updateExit, draw, holdDuration]);

  /**
   * Start animation
   */
  const startAnimation = useCallback(() => {
    if (prefersReducedMotion.current) return;

    // Reset state
    startTimeRef.current = null;
    exitStartTimeRef.current = null;

    // Create new particles (important for varied/procedural to get new randomization)
    particlesRef.current = createParticles(target, variant, canvasWidth, canvasHeight);

    // Start entrance
    setAnimationState('entrance');
  }, [target, variant, canvasWidth, canvasHeight]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set up canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle reduced motion
    if (prefersReducedMotion.current) {
      // Draw static final state
      particlesRef.current = createParticles(target, variant, canvasWidth, canvasHeight);
      particlesRef.current.forEach((particle) => {
        particle.x = particle.targetX;
        particle.y = particle.targetY;
        particle.opacity = 1;
      });
      draw(ctx);
      return;
    }

    // Start animation
    startAnimation();

    // Cleanup
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (holdTimeoutRef.current !== null) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
    };
  }, [target, variant, canvasWidth, canvasHeight, draw, startAnimation]);

  /**
   * Run animation loop when state changes
   */
  useEffect(() => {
    if (animationState === 'entrance' || animationState === 'hold' || animationState === 'exit') {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [animationState, animate]);

  /**
   * Handle click to restart (ONLY from waiting state)
   */
  const handleClick = () => {
    if (animationState !== 'waiting' || prefersReducedMotion.current) {
      return;
    }

    startAnimation();
  };

  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="particle-viewer" onClick={handleClick}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="particle-canvas"
      />
      {prefersReducedMotion.current && (
        <div className="reduced-motion-text">
          {target === 'logo' ? 'loom99' : 'DO MORE NOW'}
        </div>
      )}
      {isDevelopment && (
        <div className="animation-state-indicator">{animationState}</div>
      )}
    </div>
  );
}
