/**
 * V4 Animation Framework - Switch/Until Module
 *
 * Event-driven signal switching enables:
 * - Phase transitions (entrance → hold → exit)
 * - Spawning/despawning elements
 * - Mode changes based on user interaction
 * - Restart/loop behavior
 *
 * Key primitives:
 * - switchOn: switch to new signal at each event
 * - until: run signal until event, then switch
 * - phases: structured phase transitions
 */

import type { Signal, EventStream, EventOccurrence, Time, Unit, Context } from './types';
import { lastBefore } from './event';
import { clamp01 } from './time';

// =============================================================================
// Core Switch Primitives
// =============================================================================

/**
 * Switch to a new signal at each event occurrence.
 *
 * The initial signal runs until the first event, then the signal
 * from that event takes over (with time reset to 0), and so on.
 *
 * @param initial - Signal to use before any events
 * @param events - Stream of events carrying new signals to switch to
 * @returns A signal that switches based on events
 */
export function switchOn<A>(
  initial: Signal<A>,
  events: EventStream<Signal<A>>
): Signal<A> {
  return (t: Time, ctx: Context) => {
    const lastEvent = lastBefore(events, t);
    if (!lastEvent) {
      return initial(t, ctx);
    }
    // Use the switched-to signal with time relative to switch moment
    return lastEvent.value(t - lastEvent.time, ctx);
  };
}

/**
 * Run a signal until an event occurs, then switch to the event's signal.
 * This is switchOn with the semantics of "stop at first event."
 *
 * @param signal - Signal to run initially
 * @param event - Single-event stream that triggers the switch
 * @returns Signal that switches once
 */
export function until<A>(
  signal: Signal<A>,
  events: EventStream<Signal<A>>
): Signal<A> {
  return switchOn(signal, events);
}

/**
 * Switch between two signals at a specific time.
 *
 * @param before - Signal to use before switchTime
 * @param after - Signal to use at and after switchTime
 * @param switchTime - Time to switch
 */
export function switchAt<A>(
  before: Signal<A>,
  after: Signal<A>,
  switchTime: Time
): Signal<A> {
  return (t: Time, ctx: Context) => {
    if (t < switchTime) {
      return before(t, ctx);
    }
    return after(t - switchTime, ctx);
  };
}

// =============================================================================
// Phase-Based Switching
// =============================================================================

/**
 * Phase specification for structured phase transitions.
 */
export type PhaseSpec<A> = {
  readonly name: string;
  readonly duration: number;
  readonly signal: Signal<A>;
};

/**
 * Create a signal that transitions through phases.
 *
 * Each phase runs for its duration, then the next phase starts
 * with time reset to 0. The final phase's signal is held forever.
 *
 * @param specs - Array of phase specifications
 * @returns Signal that goes through all phases
 */
export function phaseSignal<A>(specs: readonly PhaseSpec<A>[]): Signal<A> {
  if (specs.length === 0) {
    throw new Error('phaseSignal requires at least one phase');
  }

  // Precompute phase start times
  const startTimes: Time[] = [0];
  for (let i = 0; i < specs.length - 1; i++) {
    startTimes.push(startTimes[i] + specs[i].duration);
  }
  // totalDuration available for future use (e.g., clamping)
  // const totalDuration = startTimes[startTimes.length - 1] + specs[specs.length - 1].duration;

  return (t: Time, ctx: Context) => {
    // Find current phase (binary search would be better for many phases)
    let phaseIndex = specs.length - 1;
    for (let i = 0; i < specs.length - 1; i++) {
      if (t < startTimes[i + 1]) {
        phaseIndex = i;
        break;
      }
    }

    const localT = t - startTimes[phaseIndex];
    return specs[phaseIndex].signal(localT, ctx);
  };
}

/**
 * Information about the current phase.
 */
export type PhaseInfo = {
  readonly name: string;
  readonly index: number;
  readonly progress: Unit;     // Progress within current phase [0,1]
  readonly localTime: Time;    // Time within current phase
  readonly globalProgress: Unit; // Progress within entire animation [0,1]
};

/**
 * Create a signal that reports phase information.
 * Useful for driving animations based on phase progress.
 */
export function phaseInfo(
  specs: readonly { name: string; duration: number }[]
): Signal<PhaseInfo> {
  if (specs.length === 0) {
    throw new Error('phaseInfo requires at least one phase');
  }

  const startTimes: Time[] = [0];
  for (let i = 0; i < specs.length - 1; i++) {
    startTimes.push(startTimes[i] + specs[i].duration);
  }
  const totalDuration = startTimes[startTimes.length - 1] + specs[specs.length - 1].duration;

  return (t: Time, _ctx: Context) => {
    const clampedT = Math.max(0, Math.min(t, totalDuration));

    // Find current phase
    let phaseIndex = specs.length - 1;
    for (let i = 0; i < specs.length - 1; i++) {
      if (clampedT < startTimes[i + 1]) {
        phaseIndex = i;
        break;
      }
    }

    const phase = specs[phaseIndex];
    const localT = clampedT - startTimes[phaseIndex];
    const progress = phase.duration > 0 ? clamp01(localT / phase.duration) : 1;
    const globalProgress = totalDuration > 0 ? clamp01(clampedT / totalDuration) : 1;

    return {
      name: phase.name,
      index: phaseIndex,
      progress,
      localTime: localT,
      globalProgress,
    };
  };
}

// =============================================================================
// Animation State Machine
// =============================================================================

/**
 * Standard animation phases: entrance, hold, exit.
 */
export type StandardPhase = 'entrance' | 'hold' | 'exit';

/**
 * Create a standard entrance → hold → exit phase info signal.
 */
export function standardPhases(config: {
  entrance: number;
  hold: number;
  exit: number;
}): Signal<PhaseInfo> {
  return phaseInfo([
    { name: 'entrance', duration: config.entrance },
    { name: 'hold', duration: config.hold },
    { name: 'exit', duration: config.exit },
  ]);
}

/**
 * Create a signal that outputs different values based on standard phases.
 */
export function byPhase<A>(
  phaseInfoSignal: Signal<PhaseInfo>,
  values: {
    entrance: (progress: Unit) => A;
    hold: (progress: Unit) => A;
    exit: (progress: Unit) => A;
  }
): Signal<A> {
  return (t: Time, ctx: Context) => {
    const info = phaseInfoSignal(t, ctx);
    switch (info.name) {
      case 'entrance':
        return values.entrance(info.progress);
      case 'hold':
        return values.hold(info.progress);
      case 'exit':
        return values.exit(info.progress);
      default:
        return values.hold(1); // Default to hold end state
    }
  };
}

// =============================================================================
// Restart/Loop via Events
// =============================================================================

/**
 * Create a signal that restarts when reset events occur.
 * Each reset event resets time to 0.
 *
 * @param signal - The signal to restart
 * @param resetEvents - Events that trigger restart
 */
export function restartable<A>(
  signal: Signal<A>,
  resetEvents: EventStream<void>
): Signal<A> {
  return (t: Time, ctx: Context) => {
    const lastReset = lastBefore(resetEvents, t);
    const localT = lastReset ? t - lastReset.time : t;
    return signal(localT, ctx);
  };
}

/**
 * Create an event stream of periodic resets.
 * Useful for looping animations with event-based restart.
 */
export function periodicResets(period: Time, count: number): EventStream<void> {
  const events: EventOccurrence<void>[] = [];
  for (let i = 1; i <= count; i++) {
    events.push({ time: period * i, value: undefined });
  }
  return events;
}

// =============================================================================
// Conditional Switching
// =============================================================================

/**
 * Switch between signals based on a boolean condition signal.
 */
export function switchWhen<A>(
  condition: Signal<boolean>,
  whenTrue: Signal<A>,
  whenFalse: Signal<A>
): Signal<A> {
  return (t: Time, ctx: Context) =>
    condition(t, ctx) ? whenTrue(t, ctx) : whenFalse(t, ctx);
}

/**
 * Switch to a new signal when a threshold is crossed.
 */
export function switchOnThreshold<A>(
  trigger: Signal<number>,
  threshold: number,
  below: Signal<A>,
  atOrAbove: Signal<A>
): Signal<A> {
  return (t: Time, ctx: Context) =>
    trigger(t, ctx) < threshold ? below(t, ctx) : atOrAbove(t, ctx);
}

// =============================================================================
// Multi-Track Switching
// =============================================================================

/**
 * Select from multiple signals based on an index signal.
 */
export function select<A>(
  indexSignal: Signal<number>,
  signals: readonly Signal<A>[]
): Signal<A> {
  if (signals.length === 0) {
    throw new Error('select requires at least one signal');
  }
  return (t: Time, ctx: Context) => {
    const index = Math.max(0, Math.min(signals.length - 1, Math.floor(indexSignal(t, ctx))));
    return signals[index](t, ctx);
  };
}

/**
 * Select from multiple signals based on a key signal.
 */
export function selectBy<K extends string, A>(
  keySignal: Signal<K>,
  signals: Record<K, Signal<A>>,
  fallback: Signal<A>
): Signal<A> {
  return (t: Time, ctx: Context) => {
    const key = keySignal(t, ctx);
    const signal = signals[key];
    return signal ? signal(t, ctx) : fallback(t, ctx);
  };
}
