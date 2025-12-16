/**
 * V4 Animation Framework - Scan Module
 *
 * The scan primitive enables pure state evolution over time.
 * Instead of mutable state, we define how state evolves via a stepper
 * function, then scan over time to build a signal of states.
 *
 * This is the key to supporting physics, accumulators, and any
 * animation that depends on "previous state" while remaining pure.
 *
 * Key insight: scan can be implemented in two ways:
 * 1. Incremental (for real-time): step from previous state
 * 2. From-scratch (for scrubbing): replay from t=0
 *
 * Both produce the same result, but have different performance profiles.
 */

import type { Signal, Stepper, Time, Context } from './types';

// =============================================================================
// Core Scan Primitive
// =============================================================================

/**
 * Create a signal by scanning a stepper function over time.
 *
 * The stepper is called repeatedly with small time steps,
 * accumulating state from the initial value.
 *
 * For scrubbing to work correctly, this replays from t=0 each time.
 * Use memoizedScan for performance in production.
 *
 * @param stepper - State transition function
 * @param initial - Initial state at t=0
 * @param dt - Time step for simulation (default 1/60 = 60fps)
 */
export function scan<S>(
  stepper: Stepper<S, void>,
  initial: S,
  dt: number = 1 / 60
): Signal<S> {
  return (t: Time, _ctx: Context) => {
    if (t <= 0) return initial;

    let state = initial;
    let currentTime = 0;

    while (currentTime < t) {
      const step = Math.min(dt, t - currentTime);
      state = stepper(state, step, undefined);
      currentTime += step;
    }

    return state;
  };
}

/**
 * Scan with input signal.
 * The input signal is sampled at each step to drive the stepper.
 */
export function scanWithInput<S, I>(
  stepper: Stepper<S, I>,
  initial: S,
  inputSignal: Signal<I>,
  dt: number = 1 / 60
): Signal<S> {
  return (t: Time, ctx: Context) => {
    if (t <= 0) return initial;

    let state = initial;
    let currentTime = 0;

    while (currentTime < t) {
      const step = Math.min(dt, t - currentTime);
      const stepInput = inputSignal(currentTime, ctx);
      state = stepper(state, step, stepInput);
      currentTime += step;
    }

    return state;
  };
}

// =============================================================================
// Memoized Scan (for performance)
// =============================================================================

/**
 * Create a memoized scan that caches states at regular intervals.
 * This allows efficient scrubbing without replaying from t=0 every time.
 *
 * @param stepper - State transition function
 * @param initial - Initial state at t=0
 * @param dt - Simulation time step
 * @param cacheInterval - How often to cache states (e.g., every 0.5 seconds)
 */
export function memoizedScan<S>(
  stepper: Stepper<S, void>,
  initial: S,
  dt: number = 1 / 60,
  cacheInterval: number = 0.5
): Signal<S> {
  // Cache: time -> state
  const cache = new Map<number, S>();
  cache.set(0, initial);

  // Track the furthest time we've computed
  let maxComputedTime = 0;

  return (t: Time, _ctx: Context) => {
    if (t <= 0) return initial;

    // Find the nearest cached state before t
    const cacheKey = Math.floor(t / cacheInterval) * cacheInterval;

    // If we need to go beyond our cached range, compute and cache
    while (cacheKey > maxComputedTime) {
      const nextCacheTime = maxComputedTime + cacheInterval;
      const startState = cache.get(maxComputedTime)!;

      let state: S = startState;
      let currentTime = maxComputedTime;

      while (currentTime < nextCacheTime) {
        const step = Math.min(dt, nextCacheTime - currentTime);
        state = stepper(state, step, undefined);
        currentTime += step;
      }

      cache.set(nextCacheTime, state);
      maxComputedTime = nextCacheTime;
    }

    // Now simulate from the cached state to t
    const startTime = cacheKey;
    const cachedState = cache.get(startTime);
    let state: S = cachedState !== undefined ? cachedState : initial;
    let currentTime = startTime;

    while (currentTime < t) {
      const step = Math.min(dt, t - currentTime);
      state = stepper(state, step, undefined);
      currentTime += step;
    }

    return state;
  };
}

// =============================================================================
// Common Physics Steppers
// =============================================================================

/**
 * 2D position and velocity state for physics simulations.
 */
export type PhysicsState2D = {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
};

/**
 * Create a gravity stepper (constant downward acceleration).
 */
export function gravityStepper(
  gravity: number = 9.8
): Stepper<PhysicsState2D, void> {
  return (state, dt) => ({
    x: state.x + state.vx * dt,
    y: state.y + state.vy * dt,
    vx: state.vx,
    vy: state.vy + gravity * dt,
  });
}

/**
 * Create a damped motion stepper (velocity decays over time).
 */
export function dampedStepper(
  damping: number = 0.98
): Stepper<PhysicsState2D, void> {
  return (state, dt) => {
    const dampFactor = Math.pow(damping, dt * 60); // Normalize to 60fps
    return {
      x: state.x + state.vx * dt,
      y: state.y + state.vy * dt,
      vx: state.vx * dampFactor,
      vy: state.vy * dampFactor,
    };
  };
}

/**
 * Spring physics state.
 */
export type SpringState = {
  readonly position: number;
  readonly velocity: number;
};

/**
 * Create a spring stepper (damped harmonic oscillator).
 *
 * @param stiffness - Spring constant (higher = snappier)
 * @param damping - Damping ratio (1 = critically damped, <1 = bouncy)
 * @param target - Target position to spring toward
 */
export function springStepper(
  stiffness: number = 100,
  damping: number = 10,
  target: number = 0
): Stepper<SpringState, void> {
  return (state, dt) => {
    const displacement = target - state.position;
    const springForce = stiffness * displacement;
    const dampingForce = -damping * state.velocity;
    const acceleration = springForce + dampingForce;

    return {
      position: state.position + state.velocity * dt,
      velocity: state.velocity + acceleration * dt,
    };
  };
}

/**
 * Create a spring stepper with dynamic target (from input).
 */
export function springStepperDynamic(
  stiffness: number = 100,
  damping: number = 10
): Stepper<SpringState, number> {
  return (state, dt, target) => {
    const displacement = target - state.position;
    const springForce = stiffness * displacement;
    const dampingForce = -damping * state.velocity;
    const acceleration = springForce + dampingForce;

    return {
      position: state.position + state.velocity * dt,
      velocity: state.velocity + acceleration * dt,
    };
  };
}

// =============================================================================
// Integration Utilities
// =============================================================================

/**
 * Simple Euler integration for a derivative signal.
 * Given dx/dt as a signal, produce x(t).
 *
 * integrate(derivative, x0)(t) = x0 + ∫₀ᵗ derivative(τ) dτ
 */
export function integrate(
  derivative: Signal<number>,
  initial: number,
  dt: number = 1 / 60
): Signal<number> {
  return (t: Time, ctx: Context) => {
    if (t <= 0) return initial;

    let value = initial;
    let currentTime = 0;

    while (currentTime < t) {
      const step = Math.min(dt, t - currentTime);
      value += derivative(currentTime, ctx) * step;
      currentTime += step;
    }

    return value;
  };
}

/**
 * 2D integration for velocity → position.
 */
export function integrate2D(
  velocity: Signal<{ x: number; y: number }>,
  initial: { x: number; y: number },
  dt: number = 1 / 60
): Signal<{ x: number; y: number }> {
  return (t: Time, ctx: Context) => {
    if (t <= 0) return initial;

    let x = initial.x;
    let y = initial.y;
    let currentTime = 0;

    while (currentTime < t) {
      const step = Math.min(dt, t - currentTime);
      const v = velocity(currentTime, ctx);
      x += v.x * step;
      y += v.y * step;
      currentTime += step;
    }

    return { x, y };
  };
}

// =============================================================================
// Accumulator Patterns
// =============================================================================

/**
 * Accumulate a value over time.
 * Useful for counters, totals, etc.
 */
export function accumulate(
  rate: Signal<number>,
  initial: number = 0,
  dt: number = 1 / 60
): Signal<number> {
  return integrate(rate, initial, dt);
}

/**
 * Clamp accumulated value to a range.
 */
export function accumulateClamped(
  rate: Signal<number>,
  initial: number,
  min: number,
  max: number,
  dt: number = 1 / 60
): Signal<number> {
  return (t: Time, ctx: Context) => {
    if (t <= 0) return Math.max(min, Math.min(max, initial));

    let value = initial;
    let currentTime = 0;

    while (currentTime < t) {
      const step = Math.min(dt, t - currentTime);
      value += rate(currentTime, ctx) * step;
      value = Math.max(min, Math.min(max, value));
      currentTime += step;
    }

    return value;
  };
}
