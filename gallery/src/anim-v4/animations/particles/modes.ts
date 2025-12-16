/**
 * V4 Particles Animation - Mode System
 *
 * Modes are named bundles of Fields.
 * Based on ui_example_docs/particle.md
 */

import type { Vec2 } from '../../core/types';
import type {
  Field,
  ParticlesFields,
  ParticleBehavior,
  Color,
  Env,
  VarianceEnvelope,
} from './types';
import {
  VARIANCE_ORIGINAL,
  VARIANCE_PROCEDURAL,
  VARIANCE_VARIED,
} from './types';
import { createPRNG } from '../../core/rand';

// =============================================================================
// Mode Types
// =============================================================================

export type ModeKey = string;

export interface Mode {
  readonly key: ModeKey;
  readonly label: string;
  readonly fields: ParticlesFields;
}

// =============================================================================
// Field Helpers
// =============================================================================

/**
 * Create a start position field that samples from a radial distribution.
 */
function radialStartField(
  centerX: number,
  centerY: number,
  minRadius: number,
  maxRadius: number,
  spread: number
): Field<Vec2> {
  return (seed, index, _count, _env) => {
    const rng = createPRNG(seed + index * 10007);
    const angle = rng.next() * Math.PI * 2;
    const baseDistance = minRadius + rng.next() * (maxRadius - minRadius);
    const distance = baseDistance * spread;

    return {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
    };
  };
}

/**
 * Create a delay field with linear stagger and jitter.
 */
function staggerDelayField(
  baseStagger: number,
  jitter: number
): Field<number> {
  return (seed, index, count, _env) => {
    const baseDelay = (index / count) * baseStagger;
    if (jitter === 0) return baseDelay;

    const rng = createPRNG(seed + index * 92821);
    return baseDelay + rng.next() * jitter;
  };
}

/**
 * Create a duration field with variance.
 */
function durationField(
  baseDuration: number,
  variance: number
): Field<number> {
  return (seed, index, _count, _env) => {
    if (variance === 0) return baseDuration;

    const rng = createPRNG(seed + index * 73919);
    const factor = 1 + (rng.next() * 2 - 1) * variance;
    return Math.max(0.5, baseDuration * factor);
  };
}

/**
 * Create a radius field with variance.
 */
function radiusField(
  baseRadius: number,
  variance: number
): Field<number> {
  return (seed, index, _count, _env) => {
    if (variance === 0) return baseRadius;

    const rng = createPRNG(seed + index * 31337);
    const factor = 1 + (rng.next() * 2 - 1) * variance;
    return Math.max(1, baseRadius * factor);
  };
}

/**
 * Create a color field with hue shift.
 */
function colorField(
  baseHue: number,
  saturation: number,
  lightness: number,
  hueShift: number
): Field<Color> {
  return (seed, index, _count, _env) => {
    let h = baseHue;
    if (hueShift > 0) {
      const rng = createPRNG(seed + index * 55555);
      h = baseHue + (rng.next() * 2 - 1) * hueShift;
    }
    return {
      kind: 'hsl',
      h: ((h % 360) + 360) % 360,
      s: saturation,
      l: lightness,
    };
  };
}

/**
 * Create a behavior field.
 */
function behaviorField(
  behaviors: readonly ParticleBehavior[],
  behaviorVariance: number
): Field<ParticleBehavior> {
  return (seed, index, _count, _env) => {
    if (behaviorVariance === 0 || behaviors.length <= 1) {
      return behaviors[0] ?? { kind: 'none' };
    }

    const rng = createPRNG(seed + index * 77777);
    const idx = Math.floor(rng.next() * behaviors.length);
    return behaviors[idx];
  };
}

/**
 * Constant field helper.
 */
function constantField<A>(value: A): Field<A> {
  return () => value;
}

// =============================================================================
// Mode Definitions
// =============================================================================

/**
 * Create modes from a variance envelope.
 */
export function createParticlesModes(variance: VarianceEnvelope): {
  origin: Mode;
  timing: Mode;
  style: Mode;
} {
  // Default behaviors based on variance
  const behaviors: ParticleBehavior[] =
    variance.behaviorVariance > 0
      ? [
          { kind: 'none' },
          { kind: 'spiral', turns: 0.5, radius: 30 },
          { kind: 'wave', amplitude: 20, frequency: 2 },
        ]
      : [{ kind: 'spiral', turns: 0.3, radius: 20 }];

  return {
    origin: {
      key: 'radial-origin',
      label: 'Radial Origin',
      fields: {
        startPosition: radialStartField(
          300, // centerX (will be overridden by env)
          100, // centerY
          200, // minRadius
          400, // maxRadius
          variance.positionSpread
        ),
      },
    },

    timing: {
      key: 'staggered',
      label: 'Staggered',
      fields: {
        delay: staggerDelayField(0.5, variance.delayJitter),
        duration: durationField(2.0, variance.durationVariance),
      },
    },

    style: {
      key: 'glow-particle',
      label: 'Glow Particle',
      fields: {
        radius: radiusField(2.5, variance.radiusVariance),
        color: colorField(190, 100, 50, variance.colorShift),
        opacity: constantField(1),
        behavior: behaviorField(behaviors, variance.behaviorVariance),
      },
    },
  };
}

// =============================================================================
// Mode Composition
// =============================================================================

export type ComposedMode = Mode & {
  readonly lineage: readonly ModeKey[];
};

/**
 * Compose multiple modes into one.
 */
export function composeModes(modes: readonly Mode[]): ComposedMode {
  if (modes.length === 0) {
    throw new Error('composeModes: no modes provided');
  }

  const lineage = modes.map(m => m.key);

  // Merge all mode fields using spread to avoid readonly assignment issues
  const mergedFields = modes.reduce<ParticlesFields>(
    (acc, mode) => ({
      ...acc,
      ...(mode.fields.startPosition && { startPosition: mode.fields.startPosition }),
      ...(mode.fields.delay && { delay: mode.fields.delay }),
      ...(mode.fields.duration && { duration: mode.fields.duration }),
      ...(mode.fields.radius && { radius: mode.fields.radius }),
      ...(mode.fields.color && { color: mode.fields.color }),
      ...(mode.fields.opacity && { opacity: mode.fields.opacity }),
      ...(mode.fields.behavior && { behavior: mode.fields.behavior }),
    }),
    {}
  );

  return {
    key: lineage.join('+'),
    label: lineage.join(' + '),
    fields: mergedFields,
    lineage,
  };
}

// =============================================================================
// Mode System Interface
// =============================================================================

export interface ModeSystem {
  readonly resolve: () => ComposedMode;
}

/**
 * Create a mode system from variance envelope.
 */
export function createModeSystem(variance: VarianceEnvelope): ModeSystem {
  const modes = createParticlesModes(variance);

  return {
    resolve: () => composeModes([modes.origin, modes.timing, modes.style]),
  };
}

// =============================================================================
// Pre-built Mode Systems
// =============================================================================

export const ORIGINAL_MODE_SYSTEM = createModeSystem(VARIANCE_ORIGINAL);
export const PROCEDURAL_MODE_SYSTEM = createModeSystem(VARIANCE_PROCEDURAL);
export const VARIED_MODE_SYSTEM = createModeSystem(VARIANCE_VARIED);
