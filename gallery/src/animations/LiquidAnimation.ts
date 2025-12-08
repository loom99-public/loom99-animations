/**
 * LiquidAnimation - Factory for liquid/metaball animations
 * Technique 05: Flowing, organic movement with goo filter effects
 */

import { Animation } from '../core/Animation';
import { BlobElement } from '../elements/BlobElement';

export interface BlobPoint {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export type VarianceLevel = 'original' | 'varied' | 'procedural';

export interface LiquidAnimationConfig {
  blobs: BlobPoint[];
  variance: VarianceLevel;
  duration?: number;
  startY?: number;
}

/**
 * Random utilities for variance
 */
const Random = {
  range: (min: number, max: number) => min + Math.random() * (max - min),
  vary: (base: number, variance: number) => base + Random.range(-variance, variance),
  pick: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
  int: (min: number, max: number) => Math.floor(Random.range(min, max + 1)),
};

/**
 * Color manipulation for liquid animations
 */
const ColorUtils = {
  baseColors: {
    red: { h: 0, s: 100, l: 59 },
    orange: { h: 25, s: 100, l: 50 },
    yellow: { h: 50, s: 100, l: 50 },
  },

  shiftColor(hsl: { h: number; s: number; l: number }, hueShift: number, satShift = 0, lightShift = 0) {
    return {
      h: (hsl.h + hueShift + 360) % 360,
      s: Math.max(0, Math.min(100, hsl.s + satShift)),
      l: Math.max(0, Math.min(100, hsl.l + lightShift)),
    };
  },

  toHSL(hsl: { h: number; s: number; l: number }) {
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  },
};

/**
 * Create liquid animation with specified variance level
 */
export function createLiquidAnimation(config: LiquidAnimationConfig): Animation {
  const {
    blobs,
    variance,
    duration: baseDuration = 1500,
    startY = -100,
  } = config;

  const elements: BlobElement[] = [];
  const varianceParams = getVarianceParams(variance);

  // Apply color palette shift for varied/procedural modes
  const palette = generatePalette(varianceParams);

  blobs.forEach((blob, index) => {
    const params = calculateBlobParams(varianceParams, baseDuration, blob.radius);
    const color = applyPaletteColor(blob.color, palette, varianceParams);

    const element = new BlobElement({
      id: `blob-${index}`,
      x: blob.x,
      y: blob.y,
      radius: params.radius,
      color,
    });

    // Add drop entrance animation
    element.addDropEntrance(
      startY,
      params.duration,
      params.delay,
      params.dropEasing,
      params.spreadEasing
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
        delayVariance: 300,
        radiusVariance: 0,
        hueShift: 0,
        satShift: 0,
        lightShift: 0,
        randomizeEasing: false,
        wildTiming: false,
      };
    case 'varied':
      return {
        durationVariance: 0.2,
        delayVariance: 300,
        radiusVariance: 0.3,
        hueShift: Random.range(-15, 15),
        satShift: 0,
        lightShift: 0,
        randomizeEasing: true,
        wildTiming: false,
      };
    case 'procedural':
      return {
        durationVariance: 0.5,
        delayVariance: 600,
        radiusVariance: 0.8,
        hueShift: Random.range(-60, 60),
        satShift: Random.range(-30, 30),
        lightShift: Random.range(-15, 15),
        randomizeEasing: true,
        wildTiming: true,
      };
  }
}

/**
 * Generate color palette with shifts
 */
function generatePalette(params: ReturnType<typeof getVarianceParams>) {
  return {
    red: ColorUtils.toHSL(
      ColorUtils.shiftColor(ColorUtils.baseColors.red, params.hueShift, params.satShift, params.lightShift)
    ),
    orange: ColorUtils.toHSL(
      ColorUtils.shiftColor(ColorUtils.baseColors.orange, params.hueShift, params.satShift, params.lightShift)
    ),
    yellow: ColorUtils.toHSL(
      ColorUtils.shiftColor(ColorUtils.baseColors.yellow, params.hueShift, params.satShift, params.lightShift)
    ),
  };
}

/**
 * Apply palette color based on original color
 */
function applyPaletteColor(
  originalColor: string,
  palette: ReturnType<typeof generatePalette>,
  params: ReturnType<typeof getVarianceParams>
): string {
  // If no shift, return original
  if (params.hueShift === 0 && params.satShift === 0 && params.lightShift === 0) {
    return originalColor;
  }

  // Map original color names to palette
  if (originalColor.includes('0,') || originalColor.includes('red')) {
    return palette.red;
  } else if (originalColor.includes('25,') || originalColor.includes('orange')) {
    return palette.orange;
  } else if (originalColor.includes('50,') || originalColor.includes('yellow')) {
    return palette.yellow;
  }

  return originalColor;
}

/**
 * Calculate parameters for a single blob
 */
function calculateBlobParams(
  params: ReturnType<typeof getVarianceParams>,
  baseDuration: number,
  baseRadius: number
) {
  const dropEasings = ['linear', 'easeInCubic', 'easeInQuad', 'easeInSine'];
  const spreadEasings = ['easeOutCubic', 'easeOutQuart', 'easeOutQuint', 'easeOutBack'];

  let duration = baseDuration;
  let delay = Math.random() * params.delayVariance;
  let radius = baseRadius;
  let dropEasing = 'easeInCubic';
  let spreadEasing = 'easeOutCubic';

  if (params.durationVariance > 0) {
    duration = Random.vary(baseDuration, baseDuration * params.durationVariance);
  }

  if (params.wildTiming) {
    delay = Random.range(0, 600);
    duration = Random.range(800, 2500);
  }

  if (params.radiusVariance > 0) {
    radius = Random.vary(baseRadius, baseRadius * params.radiusVariance);
  }

  if (params.randomizeEasing) {
    dropEasing = Random.pick(dropEasings);
    spreadEasing = Random.pick(spreadEasings);
  }

  return {
    duration: Math.max(500, duration),
    delay: Math.max(0, delay),
    radius: Math.max(2, radius),
    dropEasing,
    spreadEasing,
  };
}

/**
 * Add exit animation to blob elements
 */
export function addLiquidExit(elements: BlobElement[], config: {
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
    element.addDripExit(duration, stagger * index, easing);
  });
}
