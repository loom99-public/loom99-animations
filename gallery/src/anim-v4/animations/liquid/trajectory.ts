/**
 * V4 Liquid Animation - Trajectory Helpers
 *
 * Per ui_example_docs/05-liquid.md spec sections 7 and 10.
 *
 * Provides:
 * - Deterministic noise functions (scrub-safe)
 * - Liquid offset calculations (behavior-dependent)
 * - Radius offset calculations
 *
 * All offsets guarantee decay to 0 as u -> 1.
 */

import type { Vec2 } from '../../core/types';
import type { LiquidBehavior } from './types';

// =============================================================================
// Hash Functions
// =============================================================================

/**
 * FNV-1a 32-bit hash function.
 * Produces consistent hash from any string input.
 */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

// =============================================================================
// Noise Functions
// =============================================================================

/**
 * Deterministic noise in [0, 1].
 *
 * Samples at a rate (Hz), producing step-wise random values.
 * Same inputs always produce same output.
 *
 * @param seed - Global random seed
 * @param id - Element identifier
 * @param tag - Property identifier (e.g., "jx", "jy", "phase")
 * @param tSec - Time in seconds
 * @param rateHz - Sample rate in Hz (steps per second)
 */
export function noise01(
  seed: number,
  id: string,
  tag: string,
  tSec: number,
  rateHz: number
): number {
  const step = rateHz <= 0 ? 0 : Math.floor(tSec * rateHz);
  const h = hash32(`${seed}|${id}|${tag}|${step}`);
  return (h >>> 0) / 0xffffffff;
}

/**
 * Deterministic noise in [-1, 1].
 */
export function noiseSigned(
  seed: number,
  id: string,
  tag: string,
  tSec: number,
  rateHz: number
): number {
  return noise01(seed, id, tag, tSec, rateHz) * 2 - 1;
}

// =============================================================================
// Math Helpers
// =============================================================================

/**
 * Clamp a value to [0, 1].
 */
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Linear interpolation between two vectors.
 */
export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Linear interpolation between two numbers.
 */
export function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// =============================================================================
// Liquid Offsets (Behavior-Dependent)
// =============================================================================

/**
 * Calculate position offset for a blob based on its behavior.
 *
 * Key guarantees:
 * - Deterministic (same inputs = same output)
 * - Bounded
 * - Decays to 0 as u -> 1
 *
 * @param seed - Global random seed
 * @param index - Blob index
 * @param behavior - Motion behavior type
 * @param tSec - Time in seconds
 * @param u - Transport progress [0, 1]
 * @param energy - Energy multiplier (from phase)
 */
export function liquidOffset(
  seed: number,
  index: number,
  behavior: LiquidBehavior,
  tSec: number,
  u: number,
  energy: number
): Vec2 {
  // Decay envelope: offset -> 0 as u -> 1
  const decay = (1 - u) * energy;

  if (decay <= 0 || behavior.kind === 'none') {
    return { x: 0, y: 0 };
  }

  const id = `b${index}`;

  if (behavior.kind === 'wobble') {
    // Smooth circular wobble
    const phase = noise01(seed, id, 'phase', 0, 1) * Math.PI * 2;
    const w = 2 * Math.PI * behavior.frequency;
    const s = Math.sin(tSec * w + phase);
    const c = Math.cos(tSec * w + phase);
    return {
      x: c * behavior.amplitude * decay,
      y: s * behavior.amplitude * decay,
    };
  }

  if (behavior.kind === 'swirl') {
    // Spiral path that unwinds as blob approaches target
    const phase = noise01(seed, id, 'phase', 0, 1) * Math.PI * 2;
    const turns = behavior.turns;
    const ang = phase + (1 - u) * turns * Math.PI * 2;
    const r = behavior.radius * decay;
    return {
      x: Math.cos(ang) * r,
      y: Math.sin(ang) * r,
    };
  }

  // Jitter: random noise offset
  const dx = noiseSigned(seed, id, 'jx', tSec, 35);
  const dy = noiseSigned(seed, id, 'jy', tSec, 35);
  return {
    x: dx * behavior.strength * decay,
    y: dy * behavior.strength * decay,
  };
}

/**
 * Calculate radius offset for a blob based on its behavior.
 *
 * Creates subtle "breathing" or size variation.
 * Decays to 0 as u -> 1.
 *
 * @param seed - Global random seed
 * @param index - Blob index
 * @param behavior - Motion behavior type
 * @param tSec - Time in seconds
 * @param u - Transport progress [0, 1]
 * @param energy - Energy multiplier (from phase)
 */
export function liquidRadiusOffset(
  seed: number,
  index: number,
  behavior: LiquidBehavior,
  tSec: number,
  u: number,
  energy: number
): number {
  // Decay envelope: offset -> 0 as u -> 1
  const decay = (1 - u) * energy;

  if (decay <= 0) {
    return 0;
  }

  const id = `b${index}`;

  // Gentle "breathing" for wobble
  if (behavior.kind === 'wobble') {
    const phase = noise01(seed, id, 'rphase', 0, 1) * Math.PI * 2;
    const w = 2 * Math.PI * behavior.frequency;
    const s = Math.sin(tSec * w + phase);
    return 0.15 * behavior.amplitude * s * decay;
  }

  // Subtle noise for others
  const n = noiseSigned(seed, id, 'rj', tSec, 20);
  return 0.2 * n * decay;
}
