/**
 * V4 Typewriter Animation - Schedule Builder
 *
 * Deterministic schedule computation for character reveal times.
 * Key to scrub-safe animation with bursts and jitter.
 */

import { createPRNG } from '../../core/rand';
import type { Seed } from '../../core/types';
import type { TypeSchedule } from './types';

// =============================================================================
// Schedule Builder
// =============================================================================

/**
 * Build deterministic typing schedule from per-char parameters.
 *
 * Algorithm:
 * 1. Start at t = startDelay
 * 2. For each char i:
 *    - Check if burst (using burstChance[i])
 *    - If burst: schedule next burstSize chars with shortened interval
 *    - If not: schedule char with (charInterval[i] + jitter[i])
 * 3. Output: monotonically increasing array of reveal times
 *
 * This is the key to scrub-safe animation: the schedule is pre-computed at
 * compile time, so same seed always produces same reveal sequence.
 */
export function buildTypeSchedule(args: {
  seed: Seed;
  N: number;
  startDelay: number;
  charIntervals: readonly number[];
  intervalJitters: readonly number[];
  burstChances: readonly number[];
  burstSizes: readonly number[];
}): TypeSchedule {
  const times: number[] = new Array(args.N);
  const rng = createPRNG(args.seed);

  let t = args.startDelay;
  let i = 0;

  while (i < args.N) {
    const burstChance = args.burstChances[i] ?? 0;
    const doBurst = rng.next() < burstChance;

    if (doBurst && i < args.N - 1) {
      // Schedule burst: multiple chars with shortened interval
      const burstSizeMax = args.burstSizes[i] ?? 1;
      const burstLen = Math.min(
        Math.floor(1 + rng.next() * burstSizeMax),
        args.N - i
      );
      const baseInterval = args.charIntervals[i] ?? 80;
      const burstInterval = baseInterval * 0.2; // 5x faster during burst

      for (let b = 0; b < burstLen; b++) {
        times[i + b] = t + burstInterval * b;
      }

      t = times[i + burstLen - 1]! + burstInterval;
      i += burstLen;
    } else {
      // Normal: schedule single char
      times[i] = t;
      const interval = args.charIntervals[i] ?? 80;
      const jitter = args.intervalJitters[i] ?? 0;
      t += interval + jitter;
      i++;
    }
  }

  return { timesMs: times };
}

// =============================================================================
// Schedule Sampling
// =============================================================================

/**
 * Count how many tokens are revealed at time t.
 * Binary search for efficiency (O(log N) instead of O(N)).
 *
 * @param timesMs - Monotonically increasing reveal times
 * @param tMs - Current time in milliseconds
 * @returns Number of characters visible [0, N]
 */
export function countRevealed(
  timesMs: readonly number[],
  tMs: number
): number {
  let lo = 0;
  let hi = timesMs.length;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((timesMs[mid] ?? 0) <= tMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Clamp value to [0, 1] range.
 */
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
