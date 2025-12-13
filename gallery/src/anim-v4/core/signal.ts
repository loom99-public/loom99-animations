/**
 * V4 Animation Framework - Signal Module
 *
 * Signal<A> is a continuous function from time to a value.
 * This module provides constructors and combinators for signals.
 *
 * Signals are:
 * - Pure: same (t, input) always produces same result
 * - Scrubbable: can sample at any t, in any order
 * - Composable: signals combine via map, zip, etc.
 */

import type { Signal, Time, Unit, Context, Point } from './types';

// =============================================================================
// Constructors
// =============================================================================

/**
 * Create a constant signal that always returns the same value.
 */
export function constant<A>(value: A): Signal<A> {
  return (_t: Time, _ctx: Context) => value;
}

/**
 * Alias for constant (FRP terminology).
 */
export const always = constant;

/**
 * Create a signal that returns the current time.
 */
export const time: Signal<Time> = (t: Time, _ctx: Context) => t;

/**
 * Create a signal that returns the current context.
 */
export const context: Signal<Context> = (_t: Time, ctx: Context) => ctx;

/**
 * Create a linear ramp from 0 to 1 over a duration.
 * Clamps to [0, 1].
 */
export function ramp(duration: number): Signal<Unit> {
  return (t: Time, _ctx: Context) => Math.max(0, Math.min(1, t / duration));
}

/**
 * Linear interpolation signal.
 * Returns `from` at t=0, `to` at t=duration, interpolated between.
 */
export function lerp(from: number, to: number, duration: number): Signal<number> {
  return (t: Time, _ctx: Context) => {
    const u = Math.max(0, Math.min(1, t / duration));
    return from + (to - from) * u;
  };
}

/**
 * Point interpolation signal.
 */
export function lerpPoint(from: Point, to: Point, duration: number): Signal<Point> {
  return (t: Time, _ctx: Context) => {
    const u = Math.max(0, Math.min(1, t / duration));
    return {
      x: from.x + (to.x - from.x) * u,
      y: from.y + (to.y - from.y) * u,
    };
  };
}

// =============================================================================
// Functor: map
// =============================================================================

/**
 * Transform a signal's output with a function.
 *
 * map(f)(signal)(t) = f(signal(t))
 */
export function map<A, B>(f: (a: A) => B): (signal: Signal<A>) => Signal<B> {
  return (signal) => (t, ctx) => f(signal(t, ctx));
}

/**
 * Uncurried version for convenience.
 */
export function mapSignal<A, B>(signal: Signal<A>, f: (a: A) => B): Signal<B> {
  return (t, ctx) => f(signal(t, ctx));
}

// =============================================================================
// Applicative: map2, map3, mapN, zip
// =============================================================================

/**
 * Combine two signals with a function.
 */
export function map2<A, B, C>(
  f: (a: A, b: B) => C
): (sa: Signal<A>, sb: Signal<B>) => Signal<C> {
  return (sa, sb) => (t, ctx) => f(sa(t, ctx), sb(t, ctx));
}

/**
 * Combine three signals with a function.
 */
export function map3<A, B, C, D>(
  f: (a: A, b: B, c: C) => D
): (sa: Signal<A>, sb: Signal<B>, sc: Signal<C>) => Signal<D> {
  return (sa, sb, sc) => (t, ctx) => f(sa(t, ctx), sb(t, ctx), sc(t, ctx));
}

/**
 * Combine N signals with a function.
 */
export function mapN<A, R>(
  f: (...args: A[]) => R
): (...signals: Signal<A>[]) => Signal<R> {
  return (...signals) => (t, ctx) => f(...signals.map(s => s(t, ctx)));
}

/**
 * Zip two signals into a tuple.
 */
export function zip<A, B>(sa: Signal<A>, sb: Signal<B>): Signal<[A, B]> {
  return (t, ctx) => [sa(t, ctx), sb(t, ctx)];
}

/**
 * Zip three signals into a tuple.
 */
export function zip3<A, B, C>(
  sa: Signal<A>,
  sb: Signal<B>,
  sc: Signal<C>
): Signal<[A, B, C]> {
  return (t, ctx) => [sa(t, ctx), sb(t, ctx), sc(t, ctx)];
}

// =============================================================================
// Record/Object combinators
// =============================================================================

/**
 * Combine an object of signals into a signal of objects.
 *
 * record({ x: signalA, y: signalB }) => Signal<{ x: A, y: B }>
 */
export function record<T extends Record<string, Signal<unknown>>>(
  signals: T
): Signal<{ [K in keyof T]: T[K] extends Signal<infer U> ? U : never }> {
  const keys = Object.keys(signals);
  return (t, ctx) => {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      result[key] = signals[key](t, ctx);
    }
    return result as { [K in keyof T]: T[K] extends Signal<infer U> ? U : never };
  };
}

// =============================================================================
// Sampling
// =============================================================================

/**
 * Sample a signal at a specific time with a context.
 */
export function sample<A>(signal: Signal<A>, t: Time, ctx: Context): A {
  return signal(t, ctx);
}

/**
 * Create a function that samples a signal at different times.
 */
export function sampler<A>(signal: Signal<A>, ctx: Context): (t: Time) => A {
  return (t) => signal(t, ctx);
}

/**
 * Sample a signal at multiple times.
 */
export function sampleMany<A>(
  signal: Signal<A>,
  times: readonly Time[],
  ctx: Context
): readonly A[] {
  return times.map(t => signal(t, ctx));
}

// =============================================================================
// Conditional
// =============================================================================

/**
 * Create a signal that switches based on a condition signal.
 */
export function when<A>(
  condition: Signal<boolean>,
  thenSignal: Signal<A>,
  elseSignal: Signal<A>
): Signal<A> {
  return (t, ctx) =>
    condition(t, ctx) ? thenSignal(t, ctx) : elseSignal(t, ctx);
}

/**
 * Create a signal that returns a value only when condition is true.
 */
export function guard<A>(
  condition: Signal<boolean>,
  signal: Signal<A>,
  defaultValue: A
): Signal<A> {
  return when(condition, signal, constant(defaultValue));
}

// =============================================================================
// Piecewise
// =============================================================================

/**
 * Create a piecewise signal from segments.
 * Each segment has a start time and a signal.
 * Returns the signal for the segment containing t.
 */
export function piecewise<A>(
  segments: readonly { readonly startTime: Time; readonly signal: Signal<A> }[],
  defaultValue: A
): Signal<A> {
  if (segments.length === 0) return constant(defaultValue);

  return (t, ctx) => {
    // Find the segment that contains t (last one where startTime <= t)
    let activeSegment = segments[0];
    for (const segment of segments) {
      if (segment.startTime <= t) {
        activeSegment = segment;
      } else {
        break;
      }
    }
    if (activeSegment.startTime > t) {
      return defaultValue;
    }
    return activeSegment.signal(t - activeSegment.startTime, ctx);
  };
}

// =============================================================================
// Debugging
// =============================================================================

/**
 * Tap into a signal for debugging without changing its value.
 */
export function tap<A>(
  signal: Signal<A>,
  fn: (value: A, t: Time) => void
): Signal<A> {
  return (t, ctx) => {
    const value = signal(t, ctx);
    fn(value, t);
    return value;
  };
}

/**
 * Log signal values to console.
 */
export function log<A>(signal: Signal<A>, label: string): Signal<A> {
  return tap(signal, (value, t) => console.log(`[${label}] t=${t.toFixed(3)}:`, value));
}
