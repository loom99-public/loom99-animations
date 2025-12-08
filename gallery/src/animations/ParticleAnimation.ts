/**
 * ParticleAnimation - Factory for particle/explosion animations
 * Technique 02: Points coalesce from scattered positions to form the shape
 */

import { Animation } from '../core/Animation';
import { ParticleElement } from '../elements/ParticleElement';

export interface ParticlePoint {
  x: number;
  y: number;
  color: string;
  size?: number;
}

export type VarianceLevel = 'original' | 'varied' | 'procedural';

export interface ParticleAnimationConfig {
  points: ParticlePoint[];
  canvasWidth: number;
  canvasHeight: number;
  variance: VarianceLevel;
  duration?: number;
  glowRadius?: number;
}

/**
 * Random utilities for variance
 */
const Random = {
  range: (min: number, max: number) => min + Math.random() * (max - min),
  vary: (base: number, variance: number) => base + Random.range(-variance, variance),
  pick: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
};

/**
 * Create particle animation with specified variance level
 */
export function createParticleAnimation(config: ParticleAnimationConfig): Animation {
  const {
    points,
    canvasWidth,
    canvasHeight,
    variance,
    duration: baseDuration = 2000,
    glowRadius = 8,
  } = config;

  const elements: ParticleElement[] = [];
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Variance parameters based on level
  const varianceParams = getVarianceParams(variance);

  points.forEach((point, index) => {
    const params = calculateParticleParams(varianceParams, baseDuration, glowRadius);

    const element = new ParticleElement({
      id: `particle-${index}`,
      x: point.x,
      y: point.y,
      size: point.size ?? params.size,
      color: params.colorShift ? shiftColor(point.color, params.colorShift) : point.color,
      glowRadius: params.glow,
    });

    // Add entrance animation
    element.addEntranceFromExplosion(
      centerX,
      centerY,
      params.duration,
      params.delay,
      params.easing
    );

    elements.push(element);
  });

  return new Animation({
    elements,
  });
}

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
        glowVariance: 0,
        colorVariance: 0,
        randomizeEasing: false,
      };
    case 'varied':
      return {
        durationVariance: 0.2,
        delayVariance: 300,
        sizeVariance: 0.3,
        glowVariance: 0.3,
        colorVariance: 15,
        randomizeEasing: true,
      };
    case 'procedural':
      return {
        durationVariance: 0.5,
        delayVariance: 500,
        sizeVariance: 0.6,
        glowVariance: 0.5,
        colorVariance: 60,
        randomizeEasing: true,
      };
  }
}

/**
 * Calculate parameters for a single particle
 */
function calculateParticleParams(
  params: ReturnType<typeof getVarianceParams>,
  baseDuration: number,
  baseGlow: number
) {
  const easings = ['easeOutCubic', 'easeOutQuart', 'easeOutQuint', 'easeOutBack'];

  let duration = baseDuration;
  let delay = 0;
  let size = 2.5;
  let glow = baseGlow;
  let easing = 'easeOutCubic';
  let colorShift = 0;

  if (params.durationVariance > 0) {
    duration = Random.vary(baseDuration, baseDuration * params.durationVariance);
  }

  if (params.delayVariance > 0) {
    delay = Random.range(0, params.delayVariance);
  }

  if (params.sizeVariance > 0) {
    size = Random.vary(2.5, 2.5 * params.sizeVariance);
  }

  if (params.glowVariance > 0) {
    glow = Random.vary(baseGlow, baseGlow * params.glowVariance);
  }

  if (params.colorVariance > 0) {
    colorShift = Random.range(-params.colorVariance, params.colorVariance);
  }

  if (params.randomizeEasing) {
    easing = Random.pick(easings);
  }

  return {
    duration: Math.max(500, duration),
    delay: Math.max(0, delay),
    size: Math.max(1, size),
    glow: Math.max(0, glow),
    easing,
    colorShift,
  };
}

/**
 * Shift hue of a color
 */
function shiftColor(color: string, hueShift: number): string {
  // Simple hue shift for HSL colors
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (hslMatch) {
    const h = (parseInt(hslMatch[1], 10) + hueShift + 360) % 360;
    return `hsl(${h}, ${hslMatch[2]}%, ${hslMatch[3]}%)`;
  }
  return color;
}

/**
 * Add exit animation to particle elements
 */
export function addParticleExit(elements: ParticleElement[], config: {
  duration?: number;
  stagger?: number;
  easing?: string;
}): void {
  const {
    duration = 250,
    stagger = 0,
    easing = 'easeInCubic',
  } = config;

  elements.forEach((element, index) => {
    element.addExitScatter(duration, stagger * index, easing);
  });
}
