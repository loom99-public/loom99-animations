/**
 * V4 Glitch Animation - Mode System
 *
 * Per ui_example_docs/04-glitch.md spec section 11.
 *
 * Modes control:
 * - GlitchIntensity: scales rgbOffset/jitterMax/skewAmount
 * - Timing: sets phase durations
 * - Procedural vs Varied: widens variance envelopes
 */

import type { Seed, PRNG } from '../../core/types';
import { createPRNG } from '../../core/rand';
import type { GlitchFields, Field, Env } from './types';

// =============================================================================
// Mode Types
// =============================================================================

export type IntensityMode = 'subtle' | 'normal' | 'intense' | 'extreme';
export type TimingMode = 'fast' | 'normal' | 'slow' | 'dramatic';
export type VarianceMode = 'procedural' | 'varied';

export interface GlitchModeConfig {
  intensity: IntensityMode;
  timing: TimingMode;
  variance: VarianceMode;
}

// =============================================================================
// Intensity Presets
// =============================================================================

interface IntensityPreset {
  rgbOffsetBase: number;
  rgbOffsetRange: number;
  jitterMaxBase: number;
  jitterMaxRange: number;
  skewAmountBase: number;
  skewAmountRange: number;
  rotateMaxBase: number;
  rotateMaxRange: number;
}

const INTENSITY_PRESETS: Record<IntensityMode, IntensityPreset> = {
  subtle: {
    rgbOffsetBase: 3,
    rgbOffsetRange: 5,
    jitterMaxBase: 5,
    jitterMaxRange: 10,
    skewAmountBase: 2,
    skewAmountRange: 5,
    rotateMaxBase: 0.5,
    rotateMaxRange: 1.5,
  },
  normal: {
    rgbOffsetBase: 8,
    rgbOffsetRange: 15,
    jitterMaxBase: 15,
    jitterMaxRange: 25,
    skewAmountBase: 8,
    skewAmountRange: 15,
    rotateMaxBase: 1,
    rotateMaxRange: 3,
  },
  intense: {
    rgbOffsetBase: 15,
    rgbOffsetRange: 25,
    jitterMaxBase: 30,
    jitterMaxRange: 40,
    skewAmountBase: 15,
    skewAmountRange: 25,
    rotateMaxBase: 2,
    rotateMaxRange: 5,
  },
  extreme: {
    rgbOffsetBase: 25,
    rgbOffsetRange: 40,
    jitterMaxBase: 45,
    jitterMaxRange: 60,
    skewAmountBase: 25,
    skewAmountRange: 40,
    rotateMaxBase: 4,
    rotateMaxRange: 8,
  },
};

// =============================================================================
// Timing Presets
// =============================================================================

interface TimingPreset {
  glitchDurationBase: number;
  glitchDurationRange: number;
  stabilizeDurationBase: number;
  stabilizeDurationRange: number;
  holdDuration: number;
  exitDuration: number;
}

const TIMING_PRESETS: Record<TimingMode, TimingPreset> = {
  fast: {
    glitchDurationBase: 0.4,
    glitchDurationRange: 0.3,
    stabilizeDurationBase: 0.6,
    stabilizeDurationRange: 0.3,
    holdDuration: 1.0,
    exitDuration: 0.15,
  },
  normal: {
    glitchDurationBase: 0.8,
    glitchDurationRange: 0.6,
    stabilizeDurationBase: 1.0,
    stabilizeDurationRange: 0.5,
    holdDuration: 2.0,
    exitDuration: 0.25,
  },
  slow: {
    glitchDurationBase: 1.2,
    glitchDurationRange: 0.8,
    stabilizeDurationBase: 1.5,
    stabilizeDurationRange: 0.8,
    holdDuration: 3.0,
    exitDuration: 0.4,
  },
  dramatic: {
    glitchDurationBase: 1.5,
    glitchDurationRange: 1.0,
    stabilizeDurationBase: 2.0,
    stabilizeDurationRange: 1.0,
    holdDuration: 2.5,
    exitDuration: 0.5,
  },
};

// =============================================================================
// Variance Multipliers
// =============================================================================

const VARIANCE_MULTIPLIERS: Record<VarianceMode, number> = {
  procedural: 0.3,  // Less variance - more predictable
  varied: 1.0,      // Full variance - more random feel
};

// =============================================================================
// Field Factories
// =============================================================================

/**
 * Create a field that produces a value with optional variance.
 */
function createRangeField(
  base: number,
  range: number,
  varianceMultiplier: number
): Field<number> {
  return (seed: Seed, _index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed);
    const variance = range * varianceMultiplier;
    return base + rng.range(-variance / 2, variance / 2);
  };
}

/**
 * Create a constant field.
 */
function createConstantField<T>(value: T): Field<T> {
  return (_seed: Seed, _index: number, _count: number, _env: Env) => value;
}

// =============================================================================
// Mode System
// =============================================================================

export interface GlitchModeFields extends GlitchFields {}

export interface ModeSystem {
  resolve(): { fields: GlitchModeFields };
  getConfig(): GlitchModeConfig;
}

/**
 * Create a mode system with the given configuration.
 */
export function createModeSystem(config: Partial<GlitchModeConfig> = {}): ModeSystem {
  const fullConfig: GlitchModeConfig = {
    intensity: config.intensity ?? 'normal',
    timing: config.timing ?? 'normal',
    variance: config.variance ?? 'procedural',
  };

  const intensity = INTENSITY_PRESETS[fullConfig.intensity];
  const timing = TIMING_PRESETS[fullConfig.timing];
  const varianceMul = VARIANCE_MULTIPLIERS[fullConfig.variance];

  return {
    resolve() {
      const fields: GlitchModeFields = {
        // Intensity fields
        rgbOffset: createRangeField(intensity.rgbOffsetBase, intensity.rgbOffsetRange, varianceMul),
        jitterMax: createRangeField(intensity.jitterMaxBase, intensity.jitterMaxRange, varianceMul),
        skewAmount: createRangeField(intensity.skewAmountBase, intensity.skewAmountRange, varianceMul),
        rotateMax: createRangeField(intensity.rotateMaxBase, intensity.rotateMaxRange, varianceMul),

        // Timing fields
        glitchDuration: createRangeField(timing.glitchDurationBase, timing.glitchDurationRange, varianceMul),
        stabilizeDuration: createRangeField(timing.stabilizeDurationBase, timing.stabilizeDurationRange, varianceMul),
        holdDuration: createConstantField(timing.holdDuration),
        exitDuration: createConstantField(timing.exitDuration),

        // Style fields
        mainOpacity: createConstantField(1),
        layerOpacityMax: createConstantField(0.9),
      };

      return { fields };
    },

    getConfig() {
      return fullConfig;
    },
  };
}

// =============================================================================
// Preset Mode Systems
// =============================================================================

/**
 * Original HTML animation equivalent - normal intensity, normal timing.
 */
export function createOriginalModeSystem(): ModeSystem {
  return createModeSystem({
    intensity: 'normal',
    timing: 'normal',
    variance: 'procedural',
  });
}

/**
 * Varied mode - more randomness in parameters.
 */
export function createVariedModeSystem(): ModeSystem {
  return createModeSystem({
    intensity: 'normal',
    timing: 'normal',
    variance: 'varied',
  });
}

/**
 * Procedural mode - consistent parameters.
 */
export function createProceduralModeSystem(): ModeSystem {
  return createModeSystem({
    intensity: 'normal',
    timing: 'normal',
    variance: 'procedural',
  });
}

/**
 * Intense mode - aggressive glitch effect.
 */
export function createIntenseModeSystem(): ModeSystem {
  return createModeSystem({
    intensity: 'intense',
    timing: 'fast',
    variance: 'varied',
  });
}

/**
 * Subtle mode - gentle glitch effect.
 */
export function createSubtleModeSystem(): ModeSystem {
  return createModeSystem({
    intensity: 'subtle',
    timing: 'slow',
    variance: 'procedural',
  });
}
