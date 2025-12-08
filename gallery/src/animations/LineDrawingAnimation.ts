/**
 * LineDrawingAnimation - Factory for line drawing animations
 * Technique 01: Lines shoot in and curve into the final shape
 */

import { Animation } from '../core/Animation';
import { LineElement } from '../elements/LineElement';

export interface LineDefinition {
  id: string;
  path: string;
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
 * Create line drawing animation with specified variance level
 */
export function createLineDrawingAnimation(config: LineDrawingConfig): Animation {
  const {
    lines,
    variance,
    duration: baseDuration = 1000,
    stagger: baseStagger = 100,
    entranceEasing: baseEntranceEasing = 'easeOutCubic',
  } = config;

  const elements: LineElement[] = [];

  // Variance parameters based on level
  const varianceParams = getVarianceParams(variance);

  lines.forEach((lineDef, index) => {
    // Calculate per-line parameters based on variance
    const params = calculateLineParams(varianceParams, baseDuration, baseStagger, baseEntranceEasing, index);

    const element = new LineElement({
      id: lineDef.id,
      path: lineDef.path,
      stroke: lineDef.stroke,
      strokeWidth: lineDef.strokeWidth ?? params.strokeWidth,
    });

    // Add line drawing animation
    element.addLineDrawing(params.duration, params.delay, params.easing);

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
  index: number
) {
  const easings = ['easeOutCubic', 'easeOutQuart', 'easeOutQuint', 'easeOutBack', 'easeOutElastic'];

  let duration = baseDuration;
  let delay = baseStagger * index;
  let strokeWidth = 2;
  let easing = baseEasing;

  if (params.durationVariance > 0) {
    duration = Random.vary(baseDuration, baseDuration * params.durationVariance);
  }

  if (params.staggerVariance > 0) {
    delay = Random.vary(baseStagger * index, baseStagger * params.staggerVariance);
  }

  if (params.strokeVariance > 0) {
    strokeWidth = Random.vary(2, 2 * params.strokeVariance);
  }

  if (params.randomizeEasing) {
    easing = Random.pick(easings);
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
 */
export function createLineDrawingExit(elements: LineElement[], config: {
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
    element.addFadeOut(duration, stagger * index, easing);
  });
}
