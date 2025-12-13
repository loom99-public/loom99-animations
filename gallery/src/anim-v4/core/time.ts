/**
 * V4 Animation Framework - Time Transforms
 *
 * Time transforms modify "when" things happen without changing "what" happens.
 * They operate on signals by transforming the time parameter.
 *
 * Key transforms:
 * - delay: shift start time
 * - stretch: scale duration
 * - warp: arbitrary time remapping (via clock signal)
 * - clamp: restrict to time range
 * - loop: repeat over time
 */

import type { Signal, Time, Unit, Context } from './types';

// =============================================================================
// Utilities
// =============================================================================

/**
 * Clamp a value to [0, 1].
 */
export function clamp01(x: number): Unit {
  return Math.max(0, Math.min(1, x));
}

/**
 * Clamp a value to [min, max].
 */
export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

// =============================================================================
// Basic Time Transforms
// =============================================================================

/**
 * Delay a signal by dt seconds.
 * Before t=dt, the signal sees t=0 (frozen at start).
 *
 * delay(signal, 2)(t) = signal(t - 2) for t >= 2
 *                     = signal(0) for t < 2
 */
export function delay<A>(signal: Signal<A>, dt: Time): Signal<A> {
  return (t: Time, ctx: Context) => signal(Math.max(0, t - dt), ctx);
}

/**
 * Delay a signal, but return undefined before the delay.
 * Useful when you want "nothing" before the animation starts.
 */
export function delayOptional<A>(
  signal: Signal<A>,
  dt: Time
): Signal<A | undefined> {
  return (t: Time, ctx: Context) =>
    t < dt ? undefined : signal(t - dt, ctx);
}

/**
 * Stretch time by a factor.
 * stretch(signal, 2) plays at half speed (takes twice as long).
 * stretch(signal, 0.5) plays at double speed (takes half as long).
 *
 * stretch(signal, factor)(t) = signal(t / factor)
 */
export function stretch<A>(signal: Signal<A>, factor: number): Signal<A> {
  if (factor === 0) throw new Error('Stretch factor cannot be 0');
  return (t: Time, ctx: Context) => signal(t / factor, ctx);
}

/**
 * Compress time by a factor (inverse of stretch).
 * compress(signal, 2) plays at double speed.
 *
 * compress(signal, factor) = stretch(signal, 1/factor)
 */
export function compress<A>(signal: Signal<A>, factor: number): Signal<A> {
  return stretch(signal, 1 / factor);
}

/**
 * Warp time using a clock signal.
 * The clock signal outputs normalized time [0,1], which is then
 * used to sample the original signal.
 *
 * warp(signal, clock, duration)(t) = signal(clock(t) * duration)
 *
 * This is the most general time transform - delay, stretch, and
 * easing are all special cases.
 */
export function warp<A>(
  signal: Signal<A>,
  clock: Signal<Unit>,
  duration: Time
): Signal<A> {
  return (t: Time, ctx: Context) => {
    const u = clock(t, ctx);
    return signal(u * duration, ctx);
  };
}

// =============================================================================
// Clamping and Bounds
// =============================================================================

/**
 * Clamp a signal to a time range.
 * Before startTime, signal sees t=0.
 * After endTime, signal sees t=endTime-startTime.
 */
export function clampTime<A>(
  signal: Signal<A>,
  startTime: Time,
  endTime: Time
): Signal<A> {
  return (t: Time, ctx: Context) => {
    const clampedT = clamp(t, startTime, endTime) - startTime;
    return signal(clampedT, ctx);
  };
}

/**
 * Freeze signal output after a duration.
 * After endTime, returns the value at endTime.
 */
export function freeze<A>(signal: Signal<A>, endTime: Time): Signal<A> {
  return (t: Time, ctx: Context) => signal(Math.min(t, endTime), ctx);
}

/**
 * Create a signal that is "active" only within a time window.
 * Returns undefined outside the window.
 */
export function window<A>(
  signal: Signal<A>,
  startTime: Time,
  endTime: Time
): Signal<A | undefined> {
  return (t: Time, ctx: Context) => {
    if (t < startTime || t >= endTime) return undefined;
    return signal(t - startTime, ctx);
  };
}

// =============================================================================
// Looping
// =============================================================================

/**
 * Loop a signal over a period.
 * After period seconds, time wraps back to 0.
 *
 * loop(signal, period)(t) = signal(t % period)
 */
export function loop<A>(signal: Signal<A>, period: Time): Signal<A> {
  if (period <= 0) throw new Error('Loop period must be positive');
  return (t: Time, ctx: Context) => signal(((t % period) + period) % period, ctx);
}

/**
 * Loop a signal N times, then freeze.
 */
export function loopN<A>(signal: Signal<A>, period: Time, count: number): Signal<A> {
  const totalDuration = period * count;
  return (t: Time, ctx: Context) => {
    if (t >= totalDuration) {
      return signal(period, ctx); // Freeze at end
    }
    return signal(t % period, ctx);
  };
}

/**
 * Ping-pong loop: forward then backward.
 * Creates smooth back-and-forth motion.
 */
export function pingPong<A>(signal: Signal<A>, period: Time): Signal<A> {
  const doublePeriod = period * 2;
  return (t: Time, ctx: Context) => {
    const cycleT = ((t % doublePeriod) + doublePeriod) % doublePeriod;
    const localT = cycleT < period ? cycleT : doublePeriod - cycleT;
    return signal(localT, ctx);
  };
}

// =============================================================================
// Easing Functions
// =============================================================================

export type EasingFn = (t: Unit) => Unit;

// Quad
export const easeInQuad: EasingFn = (t) => t * t;
export const easeOutQuad: EasingFn = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Cubic
export const easeInCubic: EasingFn = (t) => t * t * t;
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Quart
export const easeInQuart: EasingFn = (t) => t * t * t * t;
export const easeOutQuart: EasingFn = (t) => 1 - Math.pow(1 - t, 4);
export const easeInOutQuart: EasingFn = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

// Quint
export const easeInQuint: EasingFn = (t) => t * t * t * t * t;
export const easeOutQuint: EasingFn = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutQuint: EasingFn = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

// Expo
export const easeInExpo: EasingFn = (t) =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10);
export const easeOutExpo: EasingFn = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeInOutExpo: EasingFn = (t) =>
  t === 0 ? 0 : t === 1 ? 1 :
  t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 :
  (2 - Math.pow(2, -20 * t + 10)) / 2;

// Back (overshoots)
export const easeOutBack: EasingFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeInBack: EasingFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

// Elastic
export const easeOutElastic: EasingFn = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 :
    Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// Bounce
export const easeOutBounce: EasingFn = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

// Linear (identity)
export const linear: EasingFn = (t) => t;

// =============================================================================
// Easing Registry
// =============================================================================

export const EASINGS = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInBack,
  easeOutBack,
  easeOutElastic,
  easeOutBounce,
} as const;

export type EasingName = keyof typeof EASINGS;

export function getEasing(name: EasingName): EasingFn {
  return EASINGS[name];
}

// =============================================================================
// Eased Signals
// =============================================================================

/**
 * Apply easing to a signal.
 * The signal is expected to output values in [0, 1] which are then eased.
 */
export function ease(signal: Signal<Unit>, easing: EasingFn): Signal<Unit> {
  return (t: Time, ctx: Context) => easing(signal(t, ctx));
}

/**
 * Create an eased ramp from 0 to 1 over duration.
 */
export function easedRamp(duration: Time, easing: EasingFn = easeOutQuart): Signal<Unit> {
  return (t: Time, _ctx: Context) => {
    const u = clamp01(t / duration);
    return easing(u);
  };
}

/**
 * Create a delayed, eased ramp.
 */
export function delayedEasedRamp(
  delayTime: Time,
  duration: Time,
  easing: EasingFn = easeOutQuart
): Signal<Unit> {
  return delay(easedRamp(duration, easing), delayTime);
}

// =============================================================================
// Sequence and Parallel
// =============================================================================

/**
 * Sequence two signals: first plays, then second.
 */
export function sequence<A>(
  first: Signal<A>,
  firstDuration: Time,
  second: Signal<A>
): Signal<A> {
  return (t: Time, ctx: Context) => {
    if (t < firstDuration) {
      return first(t, ctx);
    }
    return second(t - firstDuration, ctx);
  };
}

/**
 * Sequence multiple signals with durations.
 */
export function sequenceAll<A>(
  segments: readonly { signal: Signal<A>; duration: Time }[]
): Signal<A> {
  if (segments.length === 0) {
    throw new Error('sequenceAll requires at least one segment');
  }

  // Precompute cumulative start times
  const startTimes: Time[] = [0];
  for (let i = 0; i < segments.length - 1; i++) {
    startTimes.push(startTimes[i] + segments[i].duration);
  }

  return (t: Time, ctx: Context) => {
    // Find which segment we're in
    let segmentIndex = segments.length - 1;
    for (let i = 0; i < segments.length - 1; i++) {
      if (t < startTimes[i + 1]) {
        segmentIndex = i;
        break;
      }
    }

    const localT = t - startTimes[segmentIndex];
    return segments[segmentIndex].signal(localT, ctx);
  };
}

/**
 * Create a signal that transitions through phases.
 * Each phase has a duration and produces a progress value [0, 1].
 */
export function phases(
  phaseSpecs: readonly { name: string; duration: Time }[],
  easing: EasingFn = linear
): Signal<{ phase: string; progress: Unit; globalProgress: Unit }> {
  const totalDuration = phaseSpecs.reduce((sum, p) => sum + p.duration, 0);
  const startTimes: Time[] = [0];
  for (let i = 0; i < phaseSpecs.length - 1; i++) {
    startTimes.push(startTimes[i] + phaseSpecs[i].duration);
  }

  return (t: Time, _ctx: Context) => {
    const clampedT = clamp(t, 0, totalDuration);

    // Find current phase
    let phaseIndex = phaseSpecs.length - 1;
    for (let i = 0; i < phaseSpecs.length - 1; i++) {
      if (clampedT < startTimes[i + 1]) {
        phaseIndex = i;
        break;
      }
    }

    const phase = phaseSpecs[phaseIndex];
    const localT = clampedT - startTimes[phaseIndex];
    const rawProgress = phase.duration > 0 ? localT / phase.duration : 1;

    return {
      phase: phase.name,
      progress: easing(clamp01(rawProgress)),
      globalProgress: clamp01(clampedT / totalDuration),
    };
  };
}
