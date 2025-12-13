/**
 * V4 LineMorph Animation - Types
 *
 * Type definitions for the LineMorph animation archetype.
 * Based on ui_example_docs/line-morph/spec.md
 */

import type { Vec2, HSL, Seed, Id } from '../../core/types';

// =============================================================================
// Path Point Types (from scene data)
// =============================================================================

/**
 * A point in a path with optional curve/arc data.
 */
export type PathPoint = {
  readonly x: number;
  readonly y: number;
  readonly type?: 'L' | 'Q' | 'A';
  // For quadratic curves (Q)
  readonly cx?: number;
  readonly cy?: number;
  // For arcs (A)
  readonly rx?: number;
  readonly ry?: number;
  readonly rotation?: number;
  readonly largeArc?: boolean;
  readonly sweep?: boolean;
};

// =============================================================================
// Stroke Definition
// =============================================================================

/**
 * A single stroke in the scene.
 * This is the constraint - what must exist at rest.
 */
export type StrokeDef = {
  /** Stable identity for this stroke */
  readonly id: Id;
  /** Final geometry as path points */
  readonly finalPoints: readonly PathPoint[];
  /** First point of the final path (tail target) */
  readonly p0: Vec2;
  /** Base color for this stroke */
  readonly baseColor: HSL;
  /** Default stroke width */
  readonly strokeWidth: number;
};

// =============================================================================
// Scene Definition
// =============================================================================

/**
 * A LineScene is a collection of strokes with scene identity.
 * No animation logic here - this is the constraint.
 */
export type LineScene = {
  readonly id: Id;
  readonly strokes: readonly StrokeDef[];
};

// =============================================================================
// Color Type (for mode fields)
// =============================================================================

/**
 * Color representation for mode fields.
 * Matches kernel's Color type structure.
 */
export type Color =
  | { readonly kind: 'rgb'; readonly r: number; readonly g: number; readonly b: number; readonly a?: number }
  | { readonly kind: 'hsl'; readonly h: number; readonly s: number; readonly l: number; readonly a?: number };

// =============================================================================
// Mode Field Types
// =============================================================================

/**
 * Env type for field evaluation (matches kernel).
 */
export type Env = {
  readonly viewport: { readonly w: number; readonly h: number };
};

/**
 * Field type - generates per-element values at compile time.
 * Field<A> = (seed, index, count, env) => A
 */
export type Field<A> = (seed: Seed, index: number, count: number, env: Env) => A;

/**
 * LineMorph-specific mode fields.
 * These are the fields that modes can provide.
 */
export type LineMorphModeFields = {
  readonly origin?: Field<Vec2>;
  readonly delay?: Field<number>;
  readonly duration?: Field<number>;
  readonly strokeWidth?: Field<number>;
  readonly glowRadius?: Field<number>;
  readonly color?: Field<Color>;
  readonly opacity?: Field<number>;
};

// =============================================================================
// Compile-Time Stroke Parameters
// =============================================================================

/**
 * Pre-computed parameters for a single stroke.
 * Evaluated once at compile time from mode fields.
 */
export type StrokeParams = {
  readonly origin: Vec2;
  readonly delay: number;
  readonly duration: number;
  readonly strokeWidth: number;
  readonly glowRadius: number;
  readonly color: Color;
  readonly opacity: number;
};

// =============================================================================
// Runtime Morph State
// =============================================================================

/**
 * Runtime state for a single stroke at a given time.
 * This is what the renderer receives.
 */
export type MorphState = {
  /** Current tail position (animated start point) */
  readonly tail: Vec2;
  /** Morph progress: 0 = straight from origin, 1 = final curved shape */
  readonly morph: number;
  /** Style for this stroke */
  readonly style: {
    readonly stroke: Color;
    readonly strokeWidth: number;
    readonly opacity: number;
    readonly glowRadius: number;
  };
};

// =============================================================================
// Phase Types
// =============================================================================

/**
 * Phase names for LineMorph animation.
 */
export type LineMorphPhase = 'entrance' | 'hold' | 'fold';

// =============================================================================
// Variance Configuration
// =============================================================================

/**
 * Variance envelope for procedural vs varied animations.
 * Controls how much randomness affects different parameters.
 */
export type VarianceEnvelope = {
  /** Origin noise multiplier (e.g., 0.1 for procedural, 0.25 for varied) */
  readonly originNoise: number;
  /** Delay jitter multiplier (e.g., 0.1 for procedural, 0.4 for varied) */
  readonly delayJitter: number;
  /** Duration variance multiplier */
  readonly durationVariance: number;
  /** Color shift amount */
  readonly colorShift: number;
};

/**
 * Pre-defined variance envelopes.
 */
export const VARIANCE_PROCEDURAL: VarianceEnvelope = {
  originNoise: 0.1,
  delayJitter: 0.1,
  durationVariance: 0.05,
  colorShift: 0,
};

export const VARIANCE_VARIED: VarianceEnvelope = {
  originNoise: 0.25,
  delayJitter: 0.4,
  durationVariance: 0.2,
  colorShift: 15,
};

export const VARIANCE_ORIGINAL: VarianceEnvelope = {
  originNoise: 0,
  delayJitter: 0,
  durationVariance: 0,
  colorShift: 0,
};
