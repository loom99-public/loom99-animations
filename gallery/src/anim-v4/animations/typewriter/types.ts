/**
 * V4 Typewriter Animation - Types
 *
 * Type definitions for the typewriter archetype (logo-10).
 * Uses BULK Field form per scalar-vs-bulk-field.md.
 */

import type { Seed, CompileCtx, Vec2, HSL, PhaseMachine } from '../../core/types';

// =============================================================================
// Colors
// =============================================================================

/**
 * Color can be HSL or CSS string.
 */
export type Color = HSL | string;

// =============================================================================
// Scene (Static Constraint)
// =============================================================================

/**
 * Text-first scene representation (preferred over glyph-based).
 * Contains the final text and layout configuration.
 */
export interface TypewriterScene {
  /** Unique identifier for this scene */
  readonly id: string;

  /** The text to animate */
  readonly text: string;

  /** Layout configuration */
  readonly layout: {
    /** Font family (e.g., 'monospace', 'Arial') */
    readonly fontFamily: string;

    /** Font size in pixels */
    readonly fontSizePx: number;

    /** Optional letter spacing in pixels */
    readonly letterSpacingPx?: number;

    /** Optional line height in pixels (for multi-line, future) */
    readonly lineHeightPx?: number;

    /** Optional max width in pixels (for wrapping, future) */
    readonly maxWidthPx?: number;

    /** Text alignment (future enhancement) */
    readonly align?: 'left' | 'center' | 'right';

    /** Baseline start position */
    readonly origin: Vec2;
  };
}

// =============================================================================
// Fields (BULK FORM - Critical!)
// =============================================================================

/**
 * BULK FIELD FORM: (seed: Seed, n: number, ctx: CompileCtx) => readonly A[]
 *
 * Fields are evaluated ONCE at compile time and produce arrays of values.
 * This is the determinism boundary.
 *
 * Some fields produce single values (startDelay, caretEnabled) - these are
 * evaluated with n=1 and we take the first element.
 *
 * Other fields produce per-character arrays (charInterval, color) - these are
 * evaluated with n=N where N is the number of characters.
 */
export type Field<A> = (seed: Seed, n: number, ctx: CompileCtx) => readonly A[];

/**
 * Typewriter fields control timing, visual appearance, and caret behavior.
 */
export interface TypewriterFields {
  // ===== TIMING FIELDS =====

  /** Delay before typing starts (ms) - single value */
  readonly startDelay: Field<number>;

  /** Base interval between characters (ms) - per-char array */
  readonly charInterval: Field<number>;

  /** Jitter added to interval (ms) - per-char array, optional */
  readonly intervalJitter?: Field<number>;

  /** Burst chance at each character [0, 1] - per-char array, optional */
  readonly burstChance?: Field<number>;

  /** Burst size (number of chars in burst) - per-char array, optional */
  readonly burstSize?: Field<number>;

  // ===== VISUAL FIELDS =====

  /** Base opacity [0, 1] - single value, optional */
  readonly opacity?: Field<number>;

  /** Text color - per-char array (for rainbow effects, etc.) */
  readonly color: Field<Color>;

  /** Per-character fade-in duration (ms) - per-char array, optional */
  readonly perCharFadeMs?: Field<number>;

  /** Per-character position jitter (px) - per-char array, optional */
  readonly perCharJitterPx?: Field<number>;

  // ===== CARET FIELDS =====

  /** Enable caret - single value, optional */
  readonly caretEnabled?: Field<boolean>;

  /** Caret blink frequency (Hz) - single value, optional */
  readonly caretBlinkHz?: Field<number>;

  /** Caret width (px) - single value, optional */
  readonly caretWidthPx?: Field<number>;

  /** Caret height (px) - single value, optional */
  readonly caretHeightPx?: Field<number>;
}

// =============================================================================
// Schedule (Deterministic Reveal Times)
// =============================================================================

/**
 * Deterministic schedule of token reveal times.
 * Pre-computed at compile time for scrub-safe animation.
 */
export interface TypeSchedule {
  /** Monotonically increasing reveal times (ms) for each token */
  readonly timesMs: readonly number[];
}

// =============================================================================
// Compiled Parameters
// =============================================================================

/**
 * Pre-computed parameters after field evaluation.
 * These are the results of evaluating all fields at compile time.
 */
export interface TypewriterParams {
  // Scene info
  /** Original text */
  readonly text: string;

  /** Tokenized characters */
  readonly tokens: readonly string[];

  // Timing (from fields)
  /** Delay before typing starts (ms) - single value */
  readonly startDelay: number;

  /** Character intervals (ms) - length N */
  readonly charIntervals: readonly number[];

  /** Interval jitters (ms) - length N */
  readonly intervalJitters: readonly number[];

  /** Burst chances [0, 1] - length N */
  readonly burstChances: readonly number[];

  /** Burst sizes - length N */
  readonly burstSizes: readonly number[];

  // Visual (from fields)
  /** Base opacity [0, 1] - single value */
  readonly baseOpacity: number;

  /** Character colors - length N */
  readonly colors: readonly Color[];

  /** Per-char fade durations (ms) - length N */
  readonly perCharFadeDurations: readonly number[];

  /** Per-char jitters (px) - length N */
  readonly perCharJitters: readonly number[];

  // Caret (from fields)
  /** Caret enabled - single value */
  readonly caretEnabled: boolean;

  /** Caret blink frequency (Hz) - single value */
  readonly caretBlinkHz: number;

  /** Caret width (px) - single value */
  readonly caretWidthPx: number;

  /** Caret height (px) - single value */
  readonly caretHeightPx: number;

  // Computed schedule
  /** Deterministic reveal schedule */
  readonly schedule: TypeSchedule;
}

// =============================================================================
// Runtime State
// =============================================================================

/**
 * Runtime state computed per frame.
 */
export interface TypewriterState {
  /** Number of visible characters [0, N] */
  readonly visibleCount: number;

  /** Optional per-character alpha ramp function */
  readonly perCharAlpha?: (i: number) => number;

  /** Caret state (if enabled) */
  readonly caret?: {
    readonly index: number;      // Insertion point
    readonly visible: boolean;   // Blink on/off
    readonly color: Color;
    readonly widthPx: number;
    readonly heightPx: number;
  };

  /** Overall opacity (for exit fade) */
  readonly opacity: number;
}

// =============================================================================
// Phase Types
// =============================================================================

/**
 * Typewriter phase names.
 * Standard lifecycle: typing → hold → exit
 */
export type TypewriterPhase = 'typing' | 'hold' | 'exit';

/**
 * Phase configuration for typewriter animation.
 */
export interface TypewriterPhases {
  /** Phase machine defining the animation lifecycle */
  readonly machine: PhaseMachine;

  /** Optional exit fade policy */
  readonly exit?: (sample: {
    phase: string;
    progress: number;
    progressRaw: number;
  }) => {
    opacityMul?: number;
  };
}

// =============================================================================
// Renderer Contract
// =============================================================================

/**
 * Renderer input combining scene, params, and runtime state.
 */
export interface TypewriterRenderInput {
  readonly scene: TypewriterScene;
  readonly params: TypewriterParams;
  readonly state: TypewriterState;
  readonly viewport: { width: number; height: number };
}
