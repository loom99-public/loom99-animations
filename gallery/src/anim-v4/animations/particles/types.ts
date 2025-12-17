/**
 * V4 Particles Animation - Types
 *
 * Type definitions for the Particles animation archetype.
 * Based on ui_example_docs/particle.md
 *
 * Semantic intent: Deterministic transport of many simple elements toward
 * fixed geometric targets, with optional bounded perturbations and
 * phase-dependent behavior.
 */

import type { Vec2, Seed, Id } from '../../core/types';

// =============================================================================
// Scene (hard constraints, no behavior)
// =============================================================================

/**
 * Immutable description of what must exist at rest.
 * This is the constraint: at full progress, particles must land at targets.
 */
export type ParticlesScene = {
  /** Stable identity for the scene */
  readonly id: Id;
  /** Target positions that define the assembled logo/text */
  readonly targets: readonly Vec2[];
  /** Color for each target position */
  readonly colors: readonly string[];
  /** Optional grouping (letters, strokes, regions) */
  readonly groups?: readonly number[];
};

// =============================================================================
// Color Type
// =============================================================================

export type Color =
  | { readonly kind: 'rgb'; readonly r: number; readonly g: number; readonly b: number; readonly a?: number }
  | { readonly kind: 'hsl'; readonly h: number; readonly s: number; readonly l: number; readonly a?: number };

// =============================================================================
// Env Type
// =============================================================================

export type Env = {
  readonly viewport: { readonly w: number; readonly h: number };
};

// =============================================================================
// Field Type
// =============================================================================

/**
 * Field type - generates per-element values at compile time.
 * Field<A> = (seed, index, count, env) => A
 */
export type Field<A> = (seed: Seed, index: number, count: number, env: Env) => A;

// =============================================================================
// Particle Behavior (closed set)
// =============================================================================

/**
 * Behaviors must be:
 * - bounded
 * - deterministic
 * - converge to zero at rest
 */
export type ParticleBehavior =
  | { readonly kind: 'none' }
  | { readonly kind: 'spiral'; readonly turns: number; readonly radius: number }
  | { readonly kind: 'wave'; readonly amplitude: number; readonly frequency: number }
  | { readonly kind: 'jitter'; readonly strength: number };

// =============================================================================
// Per-particle Fields (compile-time parameterization)
// =============================================================================

/**
 * All randomness lives inside these fields.
 * Procedural vs Varied = different field implementations.
 */
export type ParticlesFields = {
  /** Where particles originate */
  readonly startPosition?: Field<Vec2>;
  /** Temporal coordination */
  readonly delay?: Field<number>;
  readonly duration?: Field<number>;
  /** Visual attributes */
  readonly radius?: Field<number>;
  readonly color?: Field<Color>;
  readonly opacity?: Field<number>;
  /** Motion modulation */
  readonly behavior?: Field<ParticleBehavior>;
};

// =============================================================================
// Compile-Time Particle Parameters
// =============================================================================

/**
 * Pre-computed parameters for a single particle.
 * Evaluated once at compile time from fields.
 */
export type ParticleParams = {
  readonly startPosition: Vec2;
  readonly target: Vec2;
  readonly delay: number;
  readonly duration: number;
  readonly radius: number;
  readonly color: Color;
  readonly opacity: number;
  readonly behavior: ParticleBehavior;
};

// =============================================================================
// Runtime Particle State
// =============================================================================

/**
 * Runtime state for a single particle at a given time.
 */
export type ParticleState = {
  /** Current position */
  readonly position: Vec2;
  /** Current radius */
  readonly radius: number;
  /** Current color */
  readonly color: Color;
  /** Current opacity */
  readonly opacity: number;
};

// =============================================================================
// Phase Types
// =============================================================================

export type ParticlesPhase = 'entrance' | 'hold' | 'exit';

// =============================================================================
// Variance Configuration
// =============================================================================

/**
 * Variance envelope for procedural vs varied animations.
 */
export type VarianceEnvelope = {
  /** Start position spread multiplier */
  readonly positionSpread: number;
  /** Delay jitter (seconds) */
  readonly delayJitter: number;
  /** Duration variance percent */
  readonly durationVariance: number;
  /** Radius variance percent */
  readonly radiusVariance: number;
  /** Color hue shift range */
  readonly colorShift: number;
  /** Behavior variance (0 = uniform, 1 = mixed) */
  readonly behaviorVariance: number;
};

/**
 * Pre-defined variance envelopes.
 */
export const VARIANCE_ORIGINAL: VarianceEnvelope = {
  positionSpread: 1.0,
  delayJitter: 0,
  durationVariance: 0,
  radiusVariance: 0,
  colorShift: 0,
  behaviorVariance: 0,
};

export const VARIANCE_PROCEDURAL: VarianceEnvelope = {
  positionSpread: 1.0,
  delayJitter: 0.1,
  durationVariance: 0.1,
  radiusVariance: 0.2,
  colorShift: 0,
  behaviorVariance: 0,
};

export const VARIANCE_VARIED: VarianceEnvelope = {
  positionSpread: 1.2,
  delayJitter: 0.3,
  durationVariance: 0.3,
  radiusVariance: 0.4,
  colorShift: 20,
  behaviorVariance: 0.5,
};
