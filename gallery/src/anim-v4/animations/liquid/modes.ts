/**
 * V4 Liquid Animation - Mode System
 *
 * Per ui_example_docs/05-liquid.md spec section 11.
 *
 * Modes control:
 * - Origin: where blobs start (left band, ring, scatter, etc.)
 * - Timing: delay/duration patterns (staggered, burst, grouped)
 * - Size: blob radii (uniform, varied, pulse)
 * - Goo: metaball filter params (tight, soft)
 * - Variance: procedural (tight) vs varied (wide)
 */

import type { Seed, Vec2 } from '../../core/types';
import { createPRNG } from '../../core/rand';
import type { LiquidFields, LiquidBehavior, GooParams, Field, Env, LiquidTarget } from './types';
import type { Color } from '../../render/tree';

// =============================================================================
// Mode Types
// =============================================================================

export type OriginMode = 'leftBand' | 'topBand' | 'rightBand' | 'bottomBand' | 'ring' | 'scatter' | 'center';
export type TimingMode = 'staggered' | 'groupStaggered' | 'burst' | 'cascade';
export type SizeMode = 'uniform' | 'varied' | 'pulse';
export type GooMode = 'tight' | 'soft' | 'extreme';
export type BehaviorMode = 'none' | 'wobble' | 'swirl' | 'jitter' | 'mixed';
export type VarianceMode = 'procedural' | 'varied';

export interface LiquidModeConfig {
  origin: OriginMode;
  timing: TimingMode;
  size: SizeMode;
  goo: GooMode;
  behavior: BehaviorMode;
  variance: VarianceMode;
  color?: Color;
}

// =============================================================================
// Origin Presets
// =============================================================================

interface OriginPreset {
  getStartPosition: (
    target: Vec2,
    index: number,
    count: number,
    env: Env,
    rng: ReturnType<typeof createPRNG>
  ) => Vec2;
}

function createOriginPresets(): Record<OriginMode, OriginPreset> {
  return {
    leftBand: {
      getStartPosition: (_target, _i, _n, env, rng) => ({
        x: rng.range(-50, 0),
        y: rng.range(0, env.viewport.h),
      }),
    },
    topBand: {
      getStartPosition: (_target, _i, _n, env, rng) => ({
        x: rng.range(0, env.viewport.w),
        y: rng.range(-50, 0),
      }),
    },
    rightBand: {
      getStartPosition: (_target, _i, _n, env, rng) => ({
        x: rng.range(env.viewport.w, env.viewport.w + 50),
        y: rng.range(0, env.viewport.h),
      }),
    },
    bottomBand: {
      getStartPosition: (_target, _i, _n, env, rng) => ({
        x: rng.range(0, env.viewport.w),
        y: rng.range(env.viewport.h, env.viewport.h + 50),
      }),
    },
    ring: {
      getStartPosition: (target, i, n, env, _rng) => {
        const cx = env.viewport.w / 2;
        const cy = env.viewport.h / 2;
        const radius = Math.max(env.viewport.w, env.viewport.h) * 0.8;
        const angle = (i / n) * Math.PI * 2;
        // Blend toward target's angular position
        const targetAngle = Math.atan2(target.y - cy, target.x - cx);
        const blendedAngle = angle * 0.3 + targetAngle * 0.7;
        return {
          x: cx + Math.cos(blendedAngle) * radius,
          y: cy + Math.sin(blendedAngle) * radius,
        };
      },
    },
    scatter: {
      getStartPosition: (_target, _i, _n, env, rng) => ({
        x: rng.range(-100, env.viewport.w + 100),
        y: rng.range(-100, env.viewport.h + 100),
      }),
    },
    center: {
      getStartPosition: (_target, _i, _n, env, rng) => ({
        x: env.viewport.w / 2 + rng.range(-30, 30),
        y: env.viewport.h / 2 + rng.range(-30, 30),
      }),
    },
  };
}

// =============================================================================
// Timing Presets
// =============================================================================

interface TimingPreset {
  delayBase: number;
  delayStagger: number;
  delayVariance: number;
  durationBase: number;
  durationVariance: number;
}

const TIMING_PRESETS: Record<TimingMode, TimingPreset> = {
  staggered: {
    delayBase: 0,
    delayStagger: 0.02,
    delayVariance: 0.01,
    durationBase: 1.2,
    durationVariance: 0.3,
  },
  groupStaggered: {
    delayBase: 0,
    delayStagger: 0.05,
    delayVariance: 0.02,
    durationBase: 1.0,
    durationVariance: 0.2,
  },
  burst: {
    delayBase: 0,
    delayStagger: 0,
    delayVariance: 0.1,
    durationBase: 0.8,
    durationVariance: 0.2,
  },
  cascade: {
    delayBase: 0,
    delayStagger: 0.03,
    delayVariance: 0.005,
    durationBase: 1.5,
    durationVariance: 0.4,
  },
};

// =============================================================================
// Size Presets
// =============================================================================

interface SizePreset {
  startRadiusBase: number;
  startRadiusVariance: number;
  targetRadiusBase: number;
  targetRadiusVariance: number;
}

const SIZE_PRESETS: Record<SizeMode, SizePreset> = {
  uniform: {
    startRadiusBase: 3,
    startRadiusVariance: 1,
    targetRadiusBase: 8,
    targetRadiusVariance: 2,
  },
  varied: {
    startRadiusBase: 2,
    startRadiusVariance: 3,
    targetRadiusBase: 6,
    targetRadiusVariance: 6,
  },
  pulse: {
    startRadiusBase: 1,
    startRadiusVariance: 0.5,
    targetRadiusBase: 10,
    targetRadiusVariance: 4,
  },
};

// =============================================================================
// Goo Presets
// =============================================================================

const GOO_PRESETS: Record<GooMode, GooParams> = {
  tight: {
    blurPx: 8,
    threshold: 0.6,
    alpha: 1,
  },
  soft: {
    blurPx: 15,
    threshold: 0.45,
    glowPx: 3,
    alpha: 0.95,
  },
  extreme: {
    blurPx: 25,
    threshold: 0.35,
    glowPx: 5,
    alpha: 0.9,
  },
};

// =============================================================================
// Behavior Presets
// =============================================================================

interface BehaviorPreset {
  getBehavior: (rng: ReturnType<typeof createPRNG>) => LiquidBehavior;
}

const BEHAVIOR_PRESETS: Record<BehaviorMode, BehaviorPreset> = {
  none: {
    getBehavior: () => ({ kind: 'none' }),
  },
  wobble: {
    getBehavior: (rng) => ({
      kind: 'wobble',
      amplitude: rng.range(5, 15),
      frequency: rng.range(0.8, 1.5),
    }),
  },
  swirl: {
    getBehavior: (rng) => ({
      kind: 'swirl',
      turns: rng.range(0.5, 2),
      radius: rng.range(10, 30),
    }),
  },
  jitter: {
    getBehavior: (rng) => ({
      kind: 'jitter',
      strength: rng.range(5, 15),
    }),
  },
  mixed: {
    getBehavior: (rng) => {
      const choice = rng.int(0, 2);
      if (choice === 0) return { kind: 'wobble', amplitude: rng.range(5, 12), frequency: rng.range(0.8, 1.2) };
      if (choice === 1) return { kind: 'swirl', turns: rng.range(0.3, 1), radius: rng.range(8, 20) };
      return { kind: 'jitter', strength: rng.range(3, 10) };
    },
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

function createStartPositionField(
  origin: OriginPreset,
  targets: readonly LiquidTarget[],
  varianceMul: number
): Field<Vec2> {
  return (seed: Seed, index: number, count: number, env: Env) => {
    const rng = createPRNG(seed + index * 1337);
    const target = targets[index]?.p ?? { x: env.viewport.w / 2, y: env.viewport.h / 2 };
    const pos = origin.getStartPosition(target, index, count, env, rng);
    // Apply variance
    const variance = 20 * varianceMul;
    return {
      x: pos.x + rng.range(-variance, variance),
      y: pos.y + rng.range(-variance, variance),
    };
  };
}

function createDelayField(timing: TimingPreset, varianceMul: number): Field<number> {
  return (seed: Seed, index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed + index * 2017);
    const base = timing.delayBase + timing.delayStagger * index;
    const variance = timing.delayVariance * varianceMul;
    return Math.max(0, base + rng.range(-variance, variance));
  };
}

function createDurationField(timing: TimingPreset, varianceMul: number): Field<number> {
  return (seed: Seed, index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed + index * 3019);
    const variance = timing.durationVariance * varianceMul;
    return Math.max(0.2, timing.durationBase + rng.range(-variance, variance));
  };
}

function createRadiusField(base: number, variance: number, varianceMul: number): Field<number> {
  return (seed: Seed, index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed + index * 4021);
    const v = variance * varianceMul;
    return Math.max(1, base + rng.range(-v, v));
  };
}

function createColorField(baseColor: Color): Field<Color> {
  return (_seed: Seed, _index: number, _count: number, _env: Env) => {
    return baseColor;
  };
}

function createOpacityField(): Field<number> {
  return (_seed: Seed, _index: number, _count: number, _env: Env) => 1;
}

function createBehaviorField(behaviorPreset: BehaviorPreset, varianceMul: number): Field<LiquidBehavior> {
  return (seed: Seed, index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed + index * 5023);
    // With low variance, more likely to return 'none'
    if (varianceMul < 0.5 && rng.next() > 0.5) {
      return { kind: 'none' };
    }
    return behaviorPreset.getBehavior(rng);
  };
}

function createGooField(gooPreset: GooParams, varianceMul: number): Field<GooParams> {
  return (seed: Seed, _index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed);
    const blurVariance = 3 * varianceMul;
    const thresholdVariance = 0.1 * varianceMul;
    return {
      blurPx: Math.max(4, gooPreset.blurPx + rng.range(-blurVariance, blurVariance)),
      threshold: Math.max(0.2, Math.min(0.8, gooPreset.threshold + rng.range(-thresholdVariance, thresholdVariance))),
      glowPx: gooPreset.glowPx,
      alpha: gooPreset.alpha,
    };
  };
}

// =============================================================================
// Mode System
// =============================================================================

export interface LiquidModeFields extends LiquidFields {}

export interface ModeSystem {
  resolve(targets: readonly LiquidTarget[]): { fields: LiquidModeFields };
  getConfig(): LiquidModeConfig;
}

/**
 * Create a mode system with the given configuration.
 */
export function createModeSystem(config: Partial<LiquidModeConfig> = {}): ModeSystem {
  const fullConfig: LiquidModeConfig = {
    origin: config.origin ?? 'leftBand',
    timing: config.timing ?? 'staggered',
    size: config.size ?? 'uniform',
    goo: config.goo ?? 'soft',
    behavior: config.behavior ?? 'wobble',
    variance: config.variance ?? 'procedural',
    color: config.color ?? '#00ffff',
  };

  const originPresets = createOriginPresets();
  const origin = originPresets[fullConfig.origin];
  const timing = TIMING_PRESETS[fullConfig.timing];
  const size = SIZE_PRESETS[fullConfig.size];
  const gooPreset = GOO_PRESETS[fullConfig.goo];
  const behaviorPreset = BEHAVIOR_PRESETS[fullConfig.behavior];
  const varianceMul = VARIANCE_MULTIPLIERS[fullConfig.variance];

  return {
    resolve(targets: readonly LiquidTarget[]) {
      const fields: LiquidModeFields = {
        startPosition: createStartPositionField(origin, targets, varianceMul),
        delay: createDelayField(timing, varianceMul),
        duration: createDurationField(timing, varianceMul),
        startRadius: createRadiusField(size.startRadiusBase, size.startRadiusVariance, varianceMul),
        targetRadius: createRadiusField(size.targetRadiusBase, size.targetRadiusVariance, varianceMul),
        color: createColorField(fullConfig.color!),
        opacity: createOpacityField(),
        behavior: createBehaviorField(behaviorPreset, varianceMul),
        goo: createGooField(gooPreset, varianceMul),
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
 * Procedural mode - tight envelopes, uniform behavior, stable goo.
 */
export function createProceduralModeSystem(): ModeSystem {
  return createModeSystem({
    origin: 'leftBand',
    timing: 'staggered',
    size: 'uniform',
    goo: 'tight',
    behavior: 'wobble',
    variance: 'procedural',
  });
}

/**
 * Varied mode - wider envelopes, per-blob behavior mix, more aggressive goo.
 */
export function createVariedModeSystem(): ModeSystem {
  return createModeSystem({
    origin: 'scatter',
    timing: 'cascade',
    size: 'varied',
    goo: 'soft',
    behavior: 'mixed',
    variance: 'varied',
  });
}

/**
 * Ring mode - blobs come from a ring around the scene.
 */
export function createRingModeSystem(): ModeSystem {
  return createModeSystem({
    origin: 'ring',
    timing: 'staggered',
    size: 'uniform',
    goo: 'soft',
    behavior: 'swirl',
    variance: 'procedural',
  });
}

/**
 * Burst mode - all blobs start together in a burst.
 */
export function createBurstModeSystem(): ModeSystem {
  return createModeSystem({
    origin: 'center',
    timing: 'burst',
    size: 'pulse',
    goo: 'extreme',
    behavior: 'jitter',
    variance: 'varied',
  });
}

/**
 * Soft mode - gentle, flowing animation.
 */
export function createSoftModeSystem(): ModeSystem {
  return createModeSystem({
    origin: 'topBand',
    timing: 'cascade',
    size: 'uniform',
    goo: 'soft',
    behavior: 'wobble',
    variance: 'procedural',
  });
}
