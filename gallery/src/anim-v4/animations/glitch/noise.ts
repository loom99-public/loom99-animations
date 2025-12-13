/**
 * V4 Glitch Animation - Deterministic Noise Functions
 *
 * Provides time-based noise that is:
 * - Deterministic: same (seed, channel, tag, t, rate) => same result
 * - Scrub-safe: can sample at any time in any order
 * - No RNG calls: uses hash-based sampling
 *
 * Per ui_example_docs/04-glitch.md spec section 9.2.
 */

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

/**
 * Hash multiple values together.
 */
export function hashMany(...values: (string | number)[]): number {
  return hash32(values.join('|'));
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
 * @param channel - Layer identifier (e.g., "r", "g", "b", "main")
 * @param tag - Property identifier (e.g., "dx", "dy", "tx", "skew")
 * @param tMs - Time in milliseconds
 * @param rateHz - Sample rate in Hz (steps per second)
 */
export function noise01(
  seed: number,
  channel: string,
  tag: string,
  tMs: number,
  rateHz: number
): number {
  if (rateHz <= 0) return 0.5;
  const step = Math.floor((tMs / 1000) * rateHz);
  const h = hash32(`${seed}|${channel}|${tag}|${step}`);
  return (h >>> 0) / 0xffffffff;
}

/**
 * Deterministic noise in [-1, 1].
 */
export function noiseSigned(
  seed: number,
  channel: string,
  tag: string,
  tMs: number,
  rateHz: number
): number {
  return noise01(seed, channel, tag, tMs, rateHz) * 2 - 1;
}

/**
 * Deterministic noise in [min, max].
 */
export function noiseRange(
  seed: number,
  channel: string,
  tag: string,
  tMs: number,
  rateHz: number,
  min: number,
  max: number
): number {
  const n = noise01(seed, channel, tag, tMs, rateHz);
  return min + n * (max - min);
}

// =============================================================================
// Smoothed Noise (optional, for less harsh transitions)
// =============================================================================

/**
 * Smooth noise using linear interpolation between steps.
 * Produces smoother transitions than step-wise noise.
 */
export function noiseSmooth01(
  seed: number,
  channel: string,
  tag: string,
  tMs: number,
  rateHz: number
): number {
  if (rateHz <= 0) return 0.5;

  const tSec = tMs / 1000;
  const phase = tSec * rateHz;
  const step0 = Math.floor(phase);
  const step1 = step0 + 1;
  const frac = phase - step0;

  const h0 = hash32(`${seed}|${channel}|${tag}|${step0}`);
  const h1 = hash32(`${seed}|${channel}|${tag}|${step1}`);
  const v0 = (h0 >>> 0) / 0xffffffff;
  const v1 = (h1 >>> 0) / 0xffffffff;

  // Smooth interpolation (ease in-out)
  const smoothFrac = frac * frac * (3 - 2 * frac);
  return v0 + (v1 - v0) * smoothFrac;
}

/**
 * Smooth noise in [-1, 1].
 */
export function noiseSmoothedSigned(
  seed: number,
  channel: string,
  tag: string,
  tMs: number,
  rateHz: number
): number {
  return noiseSmooth01(seed, channel, tag, tMs, rateHz) * 2 - 1;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Clamp a value to [0, 1].
 */
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Clamp a value to [min, max].
 */
export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

/**
 * Linear interpolation.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
