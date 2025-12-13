/**
 * V4 Kinetic Animation - Type Definitions
 *
 * Per ui_example_docs/06-kinetic.md spec:
 * - KineticParts: animate parts via transforms (translate, rotate, scale)
 * - Each part flies in from offscreen, settles, holds, then flies out
 * - Entrance uses easeOutBack (bounce/overshoot feel)
 * - Exit uses easeInCubic, flying radially from scene center
 * - Deterministic, phase-driven, scrubbable
 */

import type { Seed, Time, Context, Vec2, PhaseMachine, PhaseSample } from '../../core/types';
import type { RenderTree, RenderNode, Color } from '../../render/tree';

// =============================================================================
// Scene Definition
// =============================================================================

/**
 * Static geometry for a single part.
 * Uses RenderNode for flexible geometry representation.
 */
export interface KineticPartDef {
  id: string;
  node: RenderNode;          // Static geometry for this part
  groupId?: number;          // Optional grouping (letters/regions)
}

/**
 * KineticScene defines the set of parts to animate.
 * Geometry is static; only transforms/opacity animate.
 */
export interface KineticScene {
  id: string;
  parts: readonly KineticPartDef[];

  /** Used for exit direction; defaults to bounds center */
  exitCenter?: Vec2;

  /** Scene bounds for computing center if not specified */
  bounds?: Bounds;
}

// =============================================================================
// Bounds
// =============================================================================

export interface Bounds {
  center: Vec2;
  width: number;
  height: number;
}

// =============================================================================
// Field Types
// =============================================================================

/**
 * Env provides viewport info at compile time.
 */
export interface Env {
  viewport: {
    w: number;
    h: number;
  };
}

/**
 * Field<T> generates a value at compile time from seed.
 * Called once per element at compile time (determinism boundary).
 */
export type Field<T> = (seed: Seed, index: number, count: number, env: Env) => T;

// =============================================================================
// Transform Types
// =============================================================================

/**
 * 2D transform specification (translate, rotate, scale).
 * Rotation is in degrees.
 */
export interface Transform2D {
  translate: Vec2;
  rotateDeg: number;
  scale: number;
  origin: Vec2;  // Transform origin (usually part center)
}

// =============================================================================
// Phase Types
// =============================================================================

export type KineticPhase = 'entrance' | 'hold' | 'exit';

export interface KineticPhaseSample {
  phase: KineticPhase;
  u: number;       // Eased progress within phase [0,1]
  uRaw: number;    // Raw progress within phase [0,1]
  tLocal: number;  // Time since start of machine
}

// =============================================================================
// Fields (compile-time parameterization)
// =============================================================================

/**
 * KineticFields are evaluated once at compile time.
 * They replace all Math.random() usage with deterministic values.
 */
export interface KineticFields {
  // Timing per part
  delay: Field<number>;       // seconds (HTML: Random.range(0, 800) ms)
  duration: Field<number>;    // seconds (HTML: Random.range(600, 2000) ms)

  // Entrance initial conditions per part
  entryOffset: Field<Vec2>;   // px vector from which the part moves to (0,0)
  entryRotationDeg: Field<number>;  // start rotation (decays to 0)
  entryScale: Field<number>;  // start scale (animates to 1)

  // Entrance feel
  overshoot: Field<number>;   // easeOutBack parameter (HTML: config.bounceOvershoot)

  // Style (optional)
  opacity?: Field<number>;    // default 1
  color?: Field<Color>;       // optional if you hue-shift parts as a mode

  // Exit policy
  exitDistance: Field<number>;    // px distance to fly out
  exitSpinDeg: Field<number>;     // degrees to spin during exit
}

// =============================================================================
// Phases
// =============================================================================

/**
 * KineticPhases defines the phase machine and phase-specific behaviors.
 */
export interface KineticPhases {
  machine: PhaseMachine;

  /** Map phase sample -> transport progress gate (0..1) */
  progress?: (sample: KineticPhaseSample) => number;

  /** Map phase sample -> energy multiplier for behaviors */
  energy?: (sample: KineticPhaseSample) => number;
}

// =============================================================================
// Compiled Part Parameters
// =============================================================================

/**
 * CompiledPartParams holds the evaluated compile-time values for a single part.
 */
export interface CompiledPartParams {
  id: string;
  content: RenderNode;
  center: Vec2;
  dir: Vec2;           // Normalized exit direction (from scene center to part center)
  delay: number;
  duration: number;
  entryOffset: Vec2;
  entryRot: number;
  entryScale: number;
  overshoot: number;
  opacityBase: number;
  colorOverride?: Color;
  exitDist: number;
  exitSpin: number;
}

// =============================================================================
// Renderer Contract
// =============================================================================

/**
 * KineticRenderer draws parts with transforms and opacity.
 */
export interface KineticRenderer {
  /** Create a part node with transform and opacity applied */
  part(args: {
    id: string;
    content: RenderNode;
    transform: Transform2D;
    opacity: number;
    colorOverride?: Color;
  }): RenderNode;

  /** Compose all parts into final render tree */
  compose(
    rootId: string,
    nodes: readonly RenderNode[],
    width: number,
    height: number,
    backgroundColor?: string
  ): RenderTree;
}

// =============================================================================
// Program Type
// =============================================================================

export type Program<Out> = {
  readonly signal: (t: Time, ctx: Context) => Out;
  readonly event: (t: Time, ctx: Context) => readonly never[];
};

// =============================================================================
// Spec Type (combines all components)
// =============================================================================

export interface KineticSpec {
  scene: KineticScene;
  fields: KineticFields;
  phases: KineticPhases;
  renderer: KineticRenderer;
}
