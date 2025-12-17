/**
 * V4 Kinetic Animation - Mode System
 *
 * Per ui_example_docs/06-kinetic.md spec section 10.
 *
 * Modes control:
 * - Entry origin: where parts fly in from (radial, left sweep, spiral, etc.)
 * - Timing: delay/duration patterns (scattered, tight, staggered)
 * - Feel: overshoot amount (bouncy, snappy, floaty)
 * - Exit: distance and spin (explode, drift)
 * - Variance: procedural (tight) vs varied (wide)
 */

import type { Seed, Vec2 } from '../../core/types';
import { createPRNG } from '../../core/rand';
import type { KineticFields, KineticPartDef, Field, Env } from './types';
import type { Color } from '../../render/tree';

// =============================================================================
// Mode Types
// =============================================================================

export type EntryOriginMode = 'radialRandom' | 'leftSweep' | 'topSweep' | 'spiral' | 'scatter';
export type TimingMode = 'scattered' | 'tight' | 'staggered' | 'grouped';
export type FeelMode = 'bouncy' | 'snappy' | 'floaty';
export type ExitMode = 'explode' | 'drift' | 'spiral';
export type VarianceMode = 'procedural' | 'varied';

export interface KineticModeConfig {
  entryOrigin: EntryOriginMode;
  timing: TimingMode;
  feel: FeelMode;
  exit: ExitMode;
  variance: VarianceMode;
  color?: Color;
}

// =============================================================================
// Entry Origin Presets
// =============================================================================

interface EntryOriginPreset {
  getEntryOffset: (
    partCenter: Vec2,
    index: number,
    count: number,
    env: Env,
    rng: ReturnType<typeof createPRNG>
  ) => Vec2;
  getEntryRotation: (rng: ReturnType<typeof createPRNG>) => number;
  getEntryScale: (rng: ReturnType<typeof createPRNG>) => number;
}

function createEntryOriginPresets(): Record<EntryOriginMode, EntryOriginPreset> {
  return {
    radialRandom: {
      getEntryOffset: (_center, _i, _n, _env, rng) => {
        // Random direction and distance
        const angle = rng.range(0, Math.PI * 2);
        const distance = rng.range(200, 600);
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
        };
      },
      getEntryRotation: (rng) => rng.range(-180, 180),
      getEntryScale: (rng) => rng.range(0.1, 0.5),
    },
    leftSweep: {
      getEntryOffset: (_center, _i, _n, env, rng) => ({
        x: -env.viewport.w - rng.range(50, 200),
        y: rng.range(-100, 100),
      }),
      getEntryRotation: (rng) => rng.range(-45, 45),
      getEntryScale: (rng) => rng.range(0.3, 0.7),
    },
    topSweep: {
      getEntryOffset: (_center, _i, _n, env, rng) => ({
        x: rng.range(-100, 100),
        y: -env.viewport.h - rng.range(50, 200),
      }),
      getEntryRotation: (rng) => rng.range(-45, 45),
      getEntryScale: (rng) => rng.range(0.3, 0.7),
    },
    spiral: {
      getEntryOffset: (_center, i, n, _env, _rng) => {
        // Spiral in from outside
        const angle = (i / Math.max(1, n - 1)) * Math.PI * 4; // 2 full rotations
        const distance = 400 + i * 20;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
        };
      },
      getEntryRotation: (rng) => rng.range(-360, 360),
      getEntryScale: (rng) => rng.range(0.2, 0.6),
    },
    scatter: {
      getEntryOffset: (_center, _i, _n, env, rng) => ({
        x: rng.range(-env.viewport.w, env.viewport.w),
        y: rng.range(-env.viewport.h, env.viewport.h),
      }),
      getEntryRotation: (rng) => rng.range(-180, 180),
      getEntryScale: (rng) => rng.range(0.1, 0.8),
    },
  };
}

// =============================================================================
// Timing Presets
// =============================================================================

interface TimingPreset {
  delayBase: number;       // seconds
  delayStagger: number;    // seconds per index
  delayVariance: number;   // seconds
  durationBase: number;    // seconds
  durationVariance: number;// seconds
}

const TIMING_PRESETS: Record<TimingMode, TimingPreset> = {
  scattered: {
    delayBase: 0,
    delayStagger: 0,
    delayVariance: 0.8,    // Random 0-800ms
    durationBase: 1.3,
    durationVariance: 0.7, // 600-2000ms range
  },
  tight: {
    delayBase: 0,
    delayStagger: 0.05,    // Small stagger
    delayVariance: 0.02,
    durationBase: 0.8,
    durationVariance: 0.2,
  },
  staggered: {
    delayBase: 0,
    delayStagger: 0.1,     // 100ms between parts
    delayVariance: 0.05,
    durationBase: 1.0,
    durationVariance: 0.3,
  },
  grouped: {
    delayBase: 0,
    delayStagger: 0.02,    // Quick stagger within groups
    delayVariance: 0.1,
    durationBase: 1.2,
    durationVariance: 0.4,
  },
};

// =============================================================================
// Feel Presets
// =============================================================================

interface FeelPreset {
  overshootBase: number;
  overshootVariance: number;
}

const FEEL_PRESETS: Record<FeelMode, FeelPreset> = {
  bouncy: {
    overshootBase: 2.2,    // ~1.8-2.6
    overshootVariance: 0.4,
  },
  snappy: {
    overshootBase: 1.0,    // ~0.8-1.2
    overshootVariance: 0.2,
  },
  floaty: {
    overshootBase: 0.5,    // Lower overshoot
    overshootVariance: 0.2,
  },
};

// =============================================================================
// Exit Presets
// =============================================================================

interface ExitPreset {
  distanceBase: number;    // pixels
  distanceVariance: number;
  spinBase: number;        // degrees
  spinVariance: number;
}

const EXIT_PRESETS: Record<ExitMode, ExitPreset> = {
  explode: {
    distanceBase: 1000,
    distanceVariance: 300,
    spinBase: 360,
    spinVariance: 180,
  },
  drift: {
    distanceBase: 400,
    distanceVariance: 100,
    spinBase: 90,
    spinVariance: 45,
  },
  spiral: {
    distanceBase: 600,
    distanceVariance: 200,
    spinBase: 720,    // 2 full rotations
    spinVariance: 180,
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

function getPartCenter(node: import('../../render/tree').RenderNode): Vec2 {
  switch (node.type) {
    case 'circle':
      return { x: node.cx, y: node.cy };
    case 'rect':
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    case 'text':
      return { x: node.x, y: node.y };
    case 'path': {
      const match = node.d.match(/M\s*(-?[\d.]+)\s*[,\s]\s*(-?[\d.]+)/i);
      if (match) {
        return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
      }
      return { x: 0, y: 0 };
    }
    case 'group':
    case 'filter':
      if (node.children.length > 0) {
        return getPartCenter(node.children[0]);
      }
      return { x: 0, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
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

function createEntryOffsetField(
  origin: EntryOriginPreset,
  parts: readonly KineticPartDef[],
  varianceMul: number
): Field<Vec2> {
  return (seed: Seed, index: number, count: number, env: Env) => {
    const rng = createPRNG(seed + index * 1337);
    const partCenter = parts[index] ? getPartCenter(parts[index].node) : { x: 0, y: 0 };
    const offset = origin.getEntryOffset(partCenter, index, count, env, rng);
    // Apply variance
    const variance = 50 * varianceMul;
    return {
      x: offset.x + rng.range(-variance, variance),
      y: offset.y + rng.range(-variance, variance),
    };
  };
}

function createEntryRotationField(
  origin: EntryOriginPreset,
  varianceMul: number
): Field<number> {
  return (seed: Seed, index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed + index * 4021);
    const baseRot = origin.getEntryRotation(rng);
    return baseRot * varianceMul;
  };
}

function createEntryScaleField(
  origin: EntryOriginPreset,
  varianceMul: number
): Field<number> {
  return (seed: Seed, index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed + index * 5023);
    const baseScale = origin.getEntryScale(rng);
    // Interpolate toward 1 for lower variance
    return baseScale + (1 - baseScale) * (1 - varianceMul);
  };
}

function createOvershootField(feel: FeelPreset, varianceMul: number): Field<number> {
  return (seed: Seed, index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed + index * 6025);
    const variance = feel.overshootVariance * varianceMul;
    return Math.max(0.1, feel.overshootBase + rng.range(-variance, variance));
  };
}

function createOpacityField(): Field<number> {
  return (_seed: Seed, _index: number, _count: number, _env: Env) => 1;
}

function createColorField(baseColor?: Color): Field<Color> | undefined {
  if (!baseColor) return undefined;
  return (_seed: Seed, _index: number, _count: number, _env: Env) => baseColor;
}

function createExitDistanceField(exit: ExitPreset, varianceMul: number): Field<number> {
  return (seed: Seed, index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed + index * 7027);
    const variance = exit.distanceVariance * varianceMul;
    return Math.max(100, exit.distanceBase + rng.range(-variance, variance));
  };
}

function createExitSpinField(exit: ExitPreset, varianceMul: number): Field<number> {
  return (seed: Seed, index: number, _count: number, _env: Env) => {
    const rng = createPRNG(seed + index * 8029);
    const variance = exit.spinVariance * varianceMul;
    // Random direction (positive or negative spin)
    const direction = rng.next() > 0.5 ? 1 : -1;
    return direction * (exit.spinBase + rng.range(-variance, variance));
  };
}

// =============================================================================
// Mode System
// =============================================================================

export interface KineticModeFields extends KineticFields {}

export interface ModeSystem {
  resolve(parts: readonly KineticPartDef[]): { fields: KineticModeFields };
  getConfig(): KineticModeConfig;
}

/**
 * Create a mode system with the given configuration.
 */
export function createModeSystem(config: Partial<KineticModeConfig> = {}): ModeSystem {
  const fullConfig: KineticModeConfig = {
    entryOrigin: config.entryOrigin ?? 'radialRandom',
    timing: config.timing ?? 'scattered',
    feel: config.feel ?? 'bouncy',
    exit: config.exit ?? 'explode',
    variance: config.variance ?? 'procedural',
    color: config.color,
  };

  const originPresets = createEntryOriginPresets();
  const origin = originPresets[fullConfig.entryOrigin];
  const timing = TIMING_PRESETS[fullConfig.timing];
  const feel = FEEL_PRESETS[fullConfig.feel];
  const exit = EXIT_PRESETS[fullConfig.exit];
  const varianceMul = VARIANCE_MULTIPLIERS[fullConfig.variance];

  return {
    resolve(parts: readonly KineticPartDef[]) {
      const fields: KineticModeFields = {
        delay: createDelayField(timing, varianceMul),
        duration: createDurationField(timing, varianceMul),
        entryOffset: createEntryOffsetField(origin, parts, varianceMul),
        entryRotationDeg: createEntryRotationField(origin, varianceMul),
        entryScale: createEntryScaleField(origin, varianceMul),
        overshoot: createOvershootField(feel, varianceMul),
        opacity: createOpacityField(),
        color: createColorField(fullConfig.color),
        exitDistance: createExitDistanceField(exit, varianceMul),
        exitSpinDeg: createExitSpinField(exit, varianceMul),
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
 * Procedural mode - tight envelopes, uniform behavior, stable feel.
 * Matches HTML logo-06-kinetic-procedural.
 */
export function createProceduralModeSystem(): ModeSystem {
  return createModeSystem({
    entryOrigin: 'radialRandom',
    timing: 'scattered',
    feel: 'bouncy',
    exit: 'explode',
    variance: 'procedural',
  });
}

/**
 * Varied mode - wider envelopes, more randomness.
 * Matches HTML logo-06-kinetic-varied.
 */
export function createVariedModeSystem(): ModeSystem {
  return createModeSystem({
    entryOrigin: 'scatter',
    timing: 'scattered',
    feel: 'bouncy',
    exit: 'explode',
    variance: 'varied',
  });
}

/**
 * Left sweep mode - parts fly in from the left.
 */
export function createLeftSweepModeSystem(): ModeSystem {
  return createModeSystem({
    entryOrigin: 'leftSweep',
    timing: 'staggered',
    feel: 'snappy',
    exit: 'drift',
    variance: 'procedural',
  });
}

/**
 * Spiral mode - parts spiral in from outside.
 */
export function createSpiralModeSystem(): ModeSystem {
  return createModeSystem({
    entryOrigin: 'spiral',
    timing: 'tight',
    feel: 'floaty',
    exit: 'spiral',
    variance: 'procedural',
  });
}

/**
 * Bouncy mode - high overshoot, explosive exit.
 */
export function createBouncyModeSystem(): ModeSystem {
  return createModeSystem({
    entryOrigin: 'radialRandom',
    timing: 'scattered',
    feel: 'bouncy',
    exit: 'explode',
    variance: 'varied',
  });
}
