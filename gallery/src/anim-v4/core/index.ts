/**
 * V4 Animation Framework - Core Module
 *
 * Exports the 8 kernel primitives as namespaces to avoid naming conflicts:
 *
 * 1. SignalFns - Signal constructors and combinators
 * 2. EventFns  - Event constructors and operations
 * 3. TimeFns   - Time transforms (delay, stretch, warp, easing)
 * 4. SwitchFns - Event-driven signal switching
 * 5. ScanFns   - Pure state evolution
 * 6. RandFns   - Seedable randomness
 *
 * Types (Signal, Time, etc.) are exported directly.
 *
 * Usage:
 * ```typescript
 * import { Signal, SignalFns, EventFns, TimeFns, RandFns } from './anim-v4/core';
 *
 * const mySignal: Signal<number> = SignalFns.constant(42);
 * const delayed = TimeFns.delay(mySignal, 1.0);
 * const events = EventFns.at(2.0, 'hello');
 * const random = RandFns.runRand(RandFns.uniform, 42);
 * ```
 */

// All types exported directly
export type {
  Time,
  Unit,
  Seed,
  Point,
  HSL,
  RGBA,
  Input,
  CompileCtx,
  Signal,
  EventOccurrence,
  EventStream,
  EventScript,
  PRNG,
  Rand,
  Field,
  Stepper,
  PhaseName,
  PhaseSpec,
  PhaseInfo,
  Scene,
  Program,
} from './types';

export { DEFAULT_INPUT, DEFAULT_CONTEXT } from './types';

// Namespaced exports for function modules
// Using *Fns suffix to distinguish from types
import * as SignalFns from './signal';
import * as EventFns from './event';
import * as TimeFns from './time';
import * as SwitchFns from './switch';
import * as ScanFns from './scan';
import * as RandFns from './rand';

export { SignalFns, EventFns, TimeFns, SwitchFns, ScanFns, RandFns };

// Re-export commonly used functions directly for convenience
export { createPRNG, DEFAULT_SEED, runRand, runField } from './rand';

// Re-export easing functions directly (commonly used)
export {
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
  easeOutBack,
  easeOutElastic,
  easeOutBounce,
  type EasingFn,
  type EasingName,
  EASINGS,
  getEasing,
} from './time';
