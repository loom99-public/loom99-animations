/**
 * V4 Typewriter Animation - Modes
 *
 * Mode configurations for different typing styles.
 * All modes use BULK Field form.
 */

import { createPRNG } from '../../core/rand';
import type { Seed, CompileCtx } from '../../core/types';
import type { TypewriterFields, Field, Color } from './types';

// =============================================================================
// Field Utilities
// =============================================================================

/**
 * Create a constant field (all values the same).
 * BULK form: returns array of n identical values.
 */
export function constantField<A>(value: A): Field<A> {
  return (_seed: Seed, n: number, _ctx: CompileCtx): readonly A[] => {
    return Array(n).fill(value);
  };
}

// =============================================================================
// Timing Modes
// =============================================================================

/**
 * Steady mode: Fixed 80ms interval, no jitter, no bursts.
 * Predictable, mechanical typing.
 */
export function steadyMode(): Partial<TypewriterFields> {
  return {
    charInterval: constantField(80),
    intervalJitter: constantField(0),
    burstChance: constantField(0),
  };
}

/**
 * Human mode: Variable interval 60-120ms, 15% burst chance.
 * Mimics natural human typing with occasional fast bursts.
 */
export function humanMode(): Partial<TypewriterFields> {
  return {
    charInterval: (seed: Seed, n: number, _ctx: CompileCtx): readonly number[] => {
      const rng = createPRNG(seed);
      return Array(n)
        .fill(null)
        .map(() => rng.range(60, 120));
    },
    intervalJitter: (seed: Seed, n: number, _ctx: CompileCtx): readonly number[] => {
      const rng = createPRNG(seed + 1000);
      return Array(n)
        .fill(null)
        .map(() => rng.range(-20, 20));
    },
    burstChance: constantField(0.15), // 15% chance of burst
    burstSize: constantField(3), // 2-3 chars per burst
  };
}

/**
 * Fast mode: Fixed 40ms interval (2x faster than steady).
 * No jitter, no bursts. Clean and quick.
 */
export function fastMode(): Partial<TypewriterFields> {
  return {
    charInterval: constantField(40),
    intervalJitter: constantField(0),
    burstChance: constantField(0),
  };
}

/**
 * Dramatic mode: Slow 150ms interval with variability.
 * Creates emphasis, good for titles or dramatic reveals.
 */
export function dramaticMode(): Partial<TypewriterFields> {
  return {
    charInterval: constantField(150),
    intervalJitter: (seed: Seed, n: number, _ctx: CompileCtx): readonly number[] => {
      const rng = createPRNG(seed);
      return Array(n)
        .fill(null)
        .map(() => rng.range(-30, 50));
    },
    burstChance: constantField(0),
  };
}

// =============================================================================
// Caret Modes
// =============================================================================

/**
 * Caret on: Standard 2Hz blink.
 */
export function caretOn(): Partial<TypewriterFields> {
  return {
    caretEnabled: constantField(true),
    caretBlinkHz: constantField(2),
  };
}

/**
 * Caret off: No caret displayed.
 */
export function caretOff(): Partial<TypewriterFields> {
  return {
    caretEnabled: constantField(false),
  };
}

/**
 * Fast blink caret: 5Hz blink for attention-grabbing effect.
 */
export function caretFastBlink(): Partial<TypewriterFields> {
  return {
    caretEnabled: constantField(true),
    caretBlinkHz: constantField(5),
  };
}

// =============================================================================
// Ink Modes
// =============================================================================

/**
 * Ink fade: 200ms fade-in per character.
 * Creates smooth appearance effect.
 */
export function inkFade(): Partial<TypewriterFields> {
  return {
    perCharFadeMs: constantField(200),
  };
}

/**
 * Ink jitter: 0-3px random jitter per character.
 * Creates hand-typed, imperfect feel.
 */
export function inkJitter(): Partial<TypewriterFields> {
  return {
    perCharJitterPx: (seed: Seed, n: number, _ctx: CompileCtx): readonly number[] => {
      const rng = createPRNG(seed);
      return Array(n)
        .fill(null)
        .map(() => rng.range(0, 3));
    },
  };
}

// =============================================================================
// Composed Modes
// =============================================================================

/**
 * Default field values for all modes.
 */
function defaultFields(): TypewriterFields {
  return {
    startDelay: constantField(0),
    charInterval: constantField(80),
    color: constantField('#00ffff' as Color),
    opacity: constantField(1),
    caretEnabled: constantField(true),
    caretBlinkHz: constantField(2),
    caretWidthPx: constantField(3),
    caretHeightPx: constantField(18),
  };
}

/**
 * Procedural mode: Steady typing with caret.
 * Clean, predictable, mechanical.
 */
export function proceduralMode(): TypewriterFields {
  return {
    ...defaultFields(),
    ...steadyMode(),
    ...caretOn(),
  };
}

/**
 * Varied mode: Human typing with caret and ink fade.
 * Natural, varied timing with smooth character appearance.
 */
export function variedMode(): TypewriterFields {
  return {
    ...defaultFields(),
    ...humanMode(),
    ...caretOn(),
    ...inkFade(),
  };
}

/**
 * Fast procedural mode: Quick, clean typing.
 */
export function fastProceduralMode(): TypewriterFields {
  return {
    ...defaultFields(),
    ...fastMode(),
    ...caretOn(),
  };
}

/**
 * Dramatic mode: Slow, deliberate typing for emphasis.
 */
export function dramaticProceduralMode(): TypewriterFields {
  return {
    ...defaultFields(),
    ...dramaticMode(),
    ...caretOn(),
  };
}

/**
 * No-caret mode: Clean text appearance without cursor.
 */
export function noCaretMode(): TypewriterFields {
  return {
    ...defaultFields(),
    ...steadyMode(),
    ...caretOff(),
  };
}
