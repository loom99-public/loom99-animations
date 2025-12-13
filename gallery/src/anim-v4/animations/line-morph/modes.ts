/**
 * V4 LineMorph Animation - Mode System
 *
 * Modes are named bundles of Fields with perceptual equivalence.
 * Based on ui_example_docs/mode-system.ts + ui_example_docs/line-morph/spec.md
 */

import type { Vec2 } from '../../core/types';
import type { Field, LineMorphModeFields, Color, Env, VarianceEnvelope } from './types';
import { VARIANCE_PROCEDURAL, VARIANCE_VARIED, VARIANCE_ORIGINAL } from './types';
import { createPRNG } from '../../core/rand';

// =============================================================================
// Mode Key
// =============================================================================

export type ModeKey = string;

// =============================================================================
// Mode Definition
// =============================================================================

export interface Mode<F extends Record<string, Field<unknown>> = LineMorphModeFields> {
  readonly key: ModeKey;
  readonly label: string;
  readonly fields: F;
  readonly meta?: ModeMeta;
}

export interface ModeMeta {
  readonly group?: string;
  readonly quotientGroup?: string;
  readonly perceptualAxes?: Partial<Record<'direction' | 'cohesion' | 'energy', number>>;
  readonly tags?: readonly string[];
}

// =============================================================================
// Field Helpers
// =============================================================================

/**
 * Create a constant field that returns the same value for all elements.
 */
function constantField<A>(value: A): Field<A> {
  return () => value;
}

/**
 * Create a region-based origin field.
 * Elements start from random positions within a box.
 */
function regionOrigin(
  center: Vec2,
  halfExtent: Vec2
): Field<Vec2> {
  return (seed, index, _count, _env) => {
    const rng = createPRNG(seed + index * 10007);
    return {
      x: center.x + (rng.next() * 2 - 1) * halfExtent.x,
      y: center.y + (rng.next() * 2 - 1) * halfExtent.y,
    };
  };
}

/**
 * Create a linear stagger field with optional jitter.
 */
function staggerField(
  baseMs: number,
  jitterPercent: number = 0
): Field<number> {
  return (seed, index, _count, _env) => {
    const baseDelay = (baseMs / 1000) * index; // Convert to seconds
    if (jitterPercent === 0) return baseDelay;

    const rng = createPRNG(seed + index * 92821);
    const jitter = (rng.next() * 2 - 1) * jitterPercent;
    return baseDelay * (1 + jitter);
  };
}

/**
 * Create a duration field with optional variance.
 */
function durationField(
  baseMs: number,
  variancePercent: number = 0
): Field<number> {
  return (seed, index, _count, _env) => {
    const baseDuration = baseMs / 1000; // Convert to seconds
    if (variancePercent === 0) return baseDuration;

    const rng = createPRNG(seed + index * 73919);
    const variance = (rng.next() * 2 - 1) * variancePercent;
    return baseDuration * (1 + variance);
  };
}

/**
 * Create a color field from HSL base with optional hue shift.
 */
function colorField(
  baseHue: number,
  saturation: number,
  lightness: number,
  hueShiftRange: number = 0
): Field<Color> {
  return (seed, index, _count, _env) => {
    let h = baseHue;
    if (hueShiftRange > 0) {
      const rng = createPRNG(seed + index * 31337);
      h = baseHue + (rng.next() * 2 - 1) * hueShiftRange;
    }
    return {
      kind: 'hsl',
      h: ((h % 360) + 360) % 360,
      s: saturation,
      l: lightness,
    };
  };
}

// =============================================================================
// Origin Modes (converge, cascade, diagonal)
// =============================================================================

/**
 * Converge: All elements shoot in from the left side.
 * Creates a "gathering" or "assembling" feel.
 */
export const convergeMode: Mode<LineMorphModeFields> = {
  key: 'converge',
  label: 'Converge',
  fields: {
    origin: regionOrigin(
      { x: -125, y: 100 },
      { x: 25, y: 50 }
    ),
  },
  meta: {
    group: 'Origin',
    quotientGroup: 'shoot-in',
    perceptualAxes: { direction: -1, cohesion: 1 },
  },
};

/**
 * Cascade: Elements rain down from above.
 * Creates a "falling" or "revealing from top" feel.
 */
export const cascadeMode: Mode<LineMorphModeFields> = {
  key: 'cascade',
  label: 'Cascade',
  fields: {
    origin: regionOrigin(
      { x: 300, y: -100 },
      { x: 50, y: 25 }
    ),
  },
  meta: {
    group: 'Origin',
    quotientGroup: 'shoot-in',
    perceptualAxes: { direction: 0, cohesion: 1 },
  },
};

/**
 * Diagonal: Elements sweep in from upper-right.
 * Creates a "swooping" or "elegant reveal" feel.
 */
export const diagonalMode: Mode<LineMorphModeFields> = {
  key: 'diagonal',
  label: 'Diagonal',
  fields: {
    origin: regionOrigin(
      { x: 700, y: 0 },
      { x: 50, y: 50 }
    ),
  },
  meta: {
    group: 'Origin',
    quotientGroup: 'shoot-in',
    perceptualAxes: { direction: 1, cohesion: 1 },
  },
};

// =============================================================================
// Timing Mode
// =============================================================================

/**
 * Staggered timing mode.
 * Elements animate in sequence with configurable overlap.
 */
export function createStaggeredMode(variance: VarianceEnvelope): Mode<LineMorphModeFields> {
  return {
    key: 'staggered',
    label: 'Staggered',
    fields: {
      delay: staggerField(50, variance.delayJitter),
      duration: durationField(800, variance.durationVariance),
    },
    meta: {
      group: 'Timing',
    },
  };
}

// =============================================================================
// Style Mode
// =============================================================================

/**
 * Neon line style mode.
 * Glowing strokes with warm color palette.
 */
export function createNeonLineMode(variance: VarianceEnvelope): Mode<LineMorphModeFields> {
  return {
    key: 'neon-line',
    label: 'Neon Line',
    fields: {
      strokeWidth: constantField(4),
      glowRadius: constantField(6),
      color: colorField(190, 100, 50, variance.colorShift), // Cyan base
      opacity: constantField(1),
    },
    meta: {
      group: 'Style',
    },
  };
}

// =============================================================================
// Mode Composition
// =============================================================================

export type ComposedMode<F extends Record<string, Field<unknown>> = LineMorphModeFields> = Mode<F> & {
  readonly lineage: readonly ModeKey[];
};

/**
 * Compose multiple modes into a single mode.
 * Later modes override earlier modes for the same field.
 */
export function composeModes(
  modes: readonly Mode<LineMorphModeFields>[]
): ComposedMode<LineMorphModeFields> {
  if (modes.length === 0) {
    throw new Error('composeModes: no modes provided');
  }

  const lineage = modes.map(m => m.key);
  const mergedFields: LineMorphModeFields = {};

  for (const mode of modes) {
    if (mode.fields.origin) mergedFields.origin = mode.fields.origin;
    if (mode.fields.delay) mergedFields.delay = mode.fields.delay;
    if (mode.fields.duration) mergedFields.duration = mode.fields.duration;
    if (mode.fields.strokeWidth) mergedFields.strokeWidth = mode.fields.strokeWidth;
    if (mode.fields.glowRadius) mergedFields.glowRadius = mode.fields.glowRadius;
    if (mode.fields.color) mergedFields.color = mode.fields.color;
    if (mode.fields.opacity) mergedFields.opacity = mode.fields.opacity;
  }

  return {
    key: lineage.join('+'),
    label: lineage.join(' + '),
    fields: mergedFields,
    lineage,
  };
}

// =============================================================================
// Mode System
// =============================================================================

export interface ModeSystem {
  readonly resolve: (keys: readonly ModeKey[]) => ComposedMode<LineMorphModeFields>;
  readonly get: (key: ModeKey) => Mode<LineMorphModeFields> | undefined;
}

/**
 * Create a mode system from a variance envelope.
 */
export function createModeSystem(variance: VarianceEnvelope): ModeSystem {
  const staggeredMode = createStaggeredMode(variance);
  const neonLineMode = createNeonLineMode(variance);

  const registry = new Map<ModeKey, Mode<LineMorphModeFields>>([
    ['converge', convergeMode],
    ['cascade', cascadeMode],
    ['diagonal', diagonalMode],
    ['staggered', staggeredMode],
    ['neon-line', neonLineMode],
  ]);

  return {
    get: (key) => registry.get(key),
    resolve: (keys) => {
      const modes = keys
        .map(k => registry.get(k))
        .filter((m): m is Mode<LineMorphModeFields> => m !== undefined);

      if (modes.length === 0) {
        throw new Error(`ModeSystem.resolve: no valid modes found for keys: ${keys.join(', ')}`);
      }

      return composeModes(modes);
    },
  };
}

// =============================================================================
// Pre-built Mode Systems
// =============================================================================

export const PROCEDURAL_MODE_SYSTEM = createModeSystem(VARIANCE_PROCEDURAL);
export const VARIED_MODE_SYSTEM = createModeSystem(VARIANCE_VARIED);
export const ORIGINAL_MODE_SYSTEM = createModeSystem(VARIANCE_ORIGINAL);

// =============================================================================
// Mode Selection
// =============================================================================

/**
 * Pick a random origin mode based on seed.
 */
export function pickOriginMode(seed: number): ModeKey {
  const modes: ModeKey[] = ['converge', 'cascade', 'diagonal'];
  const index = Math.abs(seed) % modes.length;
  return modes[index];
}
