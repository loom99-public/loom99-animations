/**
 * V4 Animation Framework - Event Module
 *
 * Event<A> represents discrete occurrences at specific times.
 * Unlike Signals (continuous), Events model:
 * - Phase transitions (entrance → hold → exit)
 * - Spawns/despawns
 * - User interactions (clicks, keystrokes)
 * - Typewriter character insertions
 *
 * Events are immutable, sorted by time, and fully scrubbable.
 */

import type { EventOccurrence, EventStream, EventScript, Time, Seed, Signal, Context } from './types';
import { createPRNG } from './rand';

// =============================================================================
// Constructors
// =============================================================================

/**
 * Create an empty event stream.
 */
export function empty<A>(): EventStream<A> {
  return [];
}

/**
 * Create a single-occurrence event stream.
 */
export function at<A>(time: Time, value: A): EventStream<A> {
  return [{ time, value }];
}

/**
 * Create an event stream from an array of (time, value) pairs.
 * Automatically sorts by time.
 */
export function fromPairs<A>(pairs: readonly [Time, A][]): EventStream<A> {
  return pairs
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time - b.time);
}

/**
 * Create an event stream from an array of occurrences.
 * Automatically sorts by time.
 */
export function fromOccurrences<A>(
  occurrences: readonly EventOccurrence<A>[]
): EventStream<A> {
  return [...occurrences].sort((a, b) => a.time - b.time);
}

/**
 * Create a periodic event stream (e.g., tick every second).
 */
export function periodic<A>(
  interval: number,
  count: number,
  value: A,
  startTime: Time = 0
): EventStream<A> {
  const events: EventOccurrence<A>[] = [];
  for (let i = 0; i < count; i++) {
    events.push({ time: startTime + i * interval, value });
  }
  return events;
}

/**
 * Create events from a generator function.
 */
export function generate<A>(
  count: number,
  generator: (index: number) => EventOccurrence<A>
): EventStream<A> {
  const events: EventOccurrence<A>[] = [];
  for (let i = 0; i < count; i++) {
    events.push(generator(i));
  }
  return events.sort((a, b) => a.time - b.time);
}

// =============================================================================
// Event Scripts (Seedable Event Generators)
// =============================================================================

/**
 * Run an event script with a seed to produce a deterministic event stream.
 */
export function runScript<A>(script: EventScript<A>, seed: Seed): EventStream<A> {
  return script(seed);
}

/**
 * Create a periodic event script with random jitter.
 */
export function jitteredPeriodic<A>(
  baseInterval: number,
  jitterPercent: number,
  count: number,
  value: A
): EventScript<A> {
  return (seed: Seed) => {
    const rng = createPRNG(seed);
    const events: EventOccurrence<A>[] = [];
    let currentTime = 0;

    for (let i = 0; i < count; i++) {
      const interval = rng.varyPercent(baseInterval, jitterPercent);
      currentTime += interval;
      events.push({ time: currentTime, value });
    }

    return events;
  };
}

/**
 * Create a typewriter-style event script.
 * Generates character insertion events with natural timing.
 */
export function typewriterScript(
  text: string,
  charDelay: number,
  charJitter: number
): EventScript<string> {
  return (seed: Seed) => {
    const rng = createPRNG(seed);
    const events: EventOccurrence<string>[] = [];
    let currentTime = 0;

    for (const char of text) {
      const delay = rng.vary(charDelay, charJitter);
      currentTime += Math.max(0.01, delay); // Minimum 10ms
      events.push({ time: currentTime, value: char });
    }

    return events;
  };
}

// =============================================================================
// Functor/Applicative
// =============================================================================

/**
 * Map a function over all event values.
 */
export function map<A, B>(
  events: EventStream<A>,
  f: (a: A) => B
): EventStream<B> {
  return events.map(({ time, value }) => ({ time, value: f(value) }));
}

/**
 * Map with access to time.
 */
export function mapWithTime<A, B>(
  events: EventStream<A>,
  f: (a: A, time: Time) => B
): EventStream<B> {
  return events.map(({ time, value }) => ({ time, value: f(value, time) }));
}

// =============================================================================
// Filtering
// =============================================================================

/**
 * Filter events by a predicate.
 */
export function filter<A>(
  events: EventStream<A>,
  pred: (a: A) => boolean
): EventStream<A> {
  return events.filter(({ value }) => pred(value));
}

/**
 * Filter events by time range.
 */
export function filterTime<A>(
  events: EventStream<A>,
  startTime: Time,
  endTime: Time
): EventStream<A> {
  return events.filter(({ time }) => time >= startTime && time < endTime);
}

/**
 * Take only the first N events.
 */
export function take<A>(events: EventStream<A>, n: number): EventStream<A> {
  return events.slice(0, n);
}

/**
 * Drop the first N events.
 */
export function drop<A>(events: EventStream<A>, n: number): EventStream<A> {
  return events.slice(n);
}

// =============================================================================
// Combination
// =============================================================================

/**
 * Merge two event streams, maintaining time order.
 */
export function merge<A>(
  eventsA: EventStream<A>,
  eventsB: EventStream<A>
): EventStream<A> {
  return [...eventsA, ...eventsB].sort((a, b) => a.time - b.time);
}

/**
 * Merge multiple event streams.
 */
export function mergeAll<A>(...streams: EventStream<A>[]): EventStream<A> {
  return streams.flat().sort((a, b) => a.time - b.time);
}

/**
 * Concatenate event streams (second stream starts after first ends).
 */
export function concat<A>(
  eventsA: EventStream<A>,
  eventsB: EventStream<A>
): EventStream<A> {
  if (eventsA.length === 0) return eventsB;
  const lastTimeA = eventsA[eventsA.length - 1].time;
  const shiftedB = eventsB.map(({ time, value }) => ({
    time: time + lastTimeA,
    value,
  }));
  return [...eventsA, ...shiftedB];
}

// =============================================================================
// Time Transforms
// =============================================================================

/**
 * Delay all events by a fixed amount.
 */
export function delay<A>(events: EventStream<A>, dt: Time): EventStream<A> {
  return events.map(({ time, value }) => ({ time: time + dt, value }));
}

/**
 * Scale all event times by a factor.
 */
export function stretch<A>(events: EventStream<A>, factor: number): EventStream<A> {
  return events.map(({ time, value }) => ({ time: time * factor, value }));
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Find the first event at or after a given time.
 */
export function firstAfter<A>(
  events: EventStream<A>,
  t: Time
): EventOccurrence<A> | undefined {
  return events.find(({ time }) => time >= t);
}

/**
 * Find the last event at or before a given time.
 */
export function lastBefore<A>(
  events: EventStream<A>,
  t: Time
): EventOccurrence<A> | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].time <= t) {
      return events[i];
    }
  }
  return undefined;
}

/**
 * Get all events that have occurred up to time t.
 */
export function occurred<A>(events: EventStream<A>, t: Time): EventStream<A> {
  return events.filter(({ time }) => time <= t);
}

/**
 * Count events that have occurred up to time t.
 */
export function countOccurred<A>(events: EventStream<A>, t: Time): number {
  return occurred(events, t).length;
}

/**
 * Get the time of the last event, or 0 if empty.
 */
export function duration<A>(events: EventStream<A>): Time {
  if (events.length === 0) return 0;
  return events[events.length - 1].time;
}

// =============================================================================
// Conversion to Signals
// =============================================================================

/**
 * Create a signal that holds the value of the last occurred event.
 * Before any event occurs, returns the initial value.
 */
export function hold<A>(events: EventStream<A>, initial: A): Signal<A> {
  return (t: Time, _ctx: Context) => {
    const last = lastBefore(events, t);
    return last ? last.value : initial;
  };
}

/**
 * Create a signal that counts how many events have occurred.
 */
export function count<A>(events: EventStream<A>): Signal<number> {
  return (t: Time, _ctx: Context) => countOccurred(events, t);
}

/**
 * Create a signal that is true iff any event has occurred up to time t.
 */
export function hasOccurred<A>(events: EventStream<A>): Signal<boolean> {
  return (t: Time, _ctx: Context) => events.some(({ time }) => time <= t);
}

/**
 * Fold events into a signal using a reducer.
 * This is the key primitive for building state from events.
 *
 * @param events - The event stream
 * @param initial - Initial state
 * @param reducer - Function to fold each event into state
 * @returns Signal of accumulated state
 */
export function fold<S, A>(
  events: EventStream<A>,
  initial: S,
  reducer: (state: S, event: A, time: Time) => S
): Signal<S> {
  return (t: Time, _ctx: Context) => {
    let state = initial;
    for (const { time, value } of events) {
      if (time > t) break;
      state = reducer(state, value, time);
    }
    return state;
  };
}
