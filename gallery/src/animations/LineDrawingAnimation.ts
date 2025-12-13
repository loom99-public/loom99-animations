/**
 * LineDrawingAnimation - Factory for line drawing animations
 * Technique 01: Lines shoot in and curve into the final shape
 */

import { Animation } from '../core/Animation';
import { MorphingLineElement } from '../elements/MorphingLineElement';

export interface LineDefinition {
  id: string;
  startX: number;
  startY: number;
  points: Array<{
    x: number;
    y: number;
    type?: 'L' | 'Q' | 'A';
    controlX?: number;
    controlY?: number;
    radiusX?: number;
    radiusY?: number;
    rotation?: number;
    largeArc?: boolean;
    sweep?: boolean;
  }>;
  stroke: string;
  strokeWidth?: number;
}

export type VarianceLevel = 'original' | 'varied' | 'procedural';

export interface LineDrawingConfig {
  lines: LineDefinition[];
  variance: VarianceLevel;
  duration?: number;
  stagger?: number;
  entranceEasing?: string;
  exitEasing?: string;
  seed?: number; // Optional seed for deterministic randomness
}

/**
 * Seeded random number generator (mulberry32)
 */
function createSeededRandom(seed: number) {
  let state = seed;
  return {
    next: (): number => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range: function(min: number, max: number): number {
      return min + this.next() * (max - min);
    },
    vary: function(base: number, variance: number): number {
      return base + this.range(-variance, variance);
    },
    pick: function<T>(arr: T[]): T {
      return arr[Math.floor(this.next() * arr.length)];
    },
  };
}

type SeededRandom = ReturnType<typeof createSeededRandom>;

/**
 * Random utilities for variance (default unseeded)
 */
const defaultRandom: SeededRandom = {
  next: () => Math.random(),
  range: (min: number, max: number) => min + Math.random() * (max - min),
  vary: function(base: number, variance: number) { return base + this.range(-variance, variance); },
  pick: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
};

/**
 * Create line drawing animation with specified variance level
 */
export function createLineDrawingAnimation(config: LineDrawingConfig): Animation {
  const {
    lines,
    variance,
    duration: baseDuration = 1000,
    stagger: baseStagger = 100,
    entranceEasing: baseEntranceEasing = 'easeOutQuart',
    seed,
  } = config;

  // Use seeded random if seed provided, otherwise default
  const random = seed !== undefined ? createSeededRandom(seed) : defaultRandom;

  const elements: MorphingLineElement[] = [];

  // Variance parameters based on level
  const varianceParams = getVarianceParams(variance);

  lines.forEach((lineDef, index) => {
    // Calculate per-line parameters based on variance
    const params = calculateLineParams(varianceParams, baseDuration, baseStagger, baseEntranceEasing, index, random);

    const element = new MorphingLineElement({
      id: lineDef.id,
      startPos: { x: lineDef.startX, y: lineDef.startY },
      points: lineDef.points,
      stroke: lineDef.stroke,
      strokeWidth: lineDef.strokeWidth ?? params.strokeWidth,
      easing: params.easing,
    });

    // Add morphing animation (shoot-in-and-curve effect)
    element.addMorphAnimation(params.duration, params.delay, params.easing);

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
        staggerVariance: 0,
        strokeVariance: 0,
        randomizeEasing: false,
        randomizeOrder: false,
      };
    case 'varied':
      return {
        durationVariance: 0.2,
        staggerVariance: 0.3,
        strokeVariance: 0.3,
        randomizeEasing: true,
        randomizeOrder: false,
      };
    case 'procedural':
      return {
        durationVariance: 0.5,
        staggerVariance: 0.5,
        strokeVariance: 0.5,
        randomizeEasing: true,
        randomizeOrder: true,
      };
  }
}

/**
 * Calculate parameters for a single line
 */
function calculateLineParams(
  params: ReturnType<typeof getVarianceParams>,
  baseDuration: number,
  baseStagger: number,
  baseEasing: string,
  index: number,
  random: SeededRandom
) {
  const easings = ['easeOutCubic', 'easeOutQuart', 'easeOutQuint', 'easeOutBack', 'easeOutElastic'];

  let duration = baseDuration;
  let delay = baseStagger * index;
  let strokeWidth = 12; // Match HTML original
  let easing = baseEasing;

  if (params.durationVariance > 0) {
    duration = random.vary(baseDuration, baseDuration * params.durationVariance);
  }

  if (params.staggerVariance > 0) {
    delay = random.vary(baseStagger * index, baseStagger * params.staggerVariance);
  }

  if (params.strokeVariance > 0) {
    strokeWidth = random.vary(12, 12 * params.strokeVariance);
  }

  if (params.randomizeEasing) {
    easing = random.pick(easings);
  }

  return {
    duration: Math.max(100, duration),
    delay: Math.max(0, delay),
    strokeWidth: Math.max(0.5, strokeWidth),
    easing,
  };
}

/**
 * Create exit animation for line drawing
 * Uses shoot-out effect (line extends toward exit) with fade
 */
export function createLineDrawingExit(elements: MorphingLineElement[], config: {
  duration?: number;
  stagger?: number;
  easing?: string;
}): void {
  const {
    duration = 250,
    stagger = 20,
    easing = 'easeInCubic',
  } = config;

  elements.forEach((element, index) => {
    element.addShootOutExit(duration, stagger * index, easing);
  });
}
