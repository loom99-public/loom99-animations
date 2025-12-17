/**
 * V4 Liquid Animation - Type Definitions
 *
 * Per ui_example_docs/05-liquid.md spec:
 * - LiquidBlobs: circular blobs transport toward targets
 * - Goo/metaball rendering for visual cohesion
 * - Deterministic, phase-driven, scrubbable
 */

import type { Seed, Time, Context, Vec2, PhaseMachine } from '../../core/types';
import type { RenderTree, RenderNode, Color } from '../../render/tree';

// =============================================================================
// Scene Definition
// =============================================================================

/**
 * LiquidTarget defines where a blob should end up.
 */
export interface LiquidTarget {
  p: Vec2;
  r?: number;       // Optional per-target radius hint
  groupId?: number; // Optional grouping (letters/regions)
}

/**
 * LiquidScene defines the final formation.
 * targets.length === blobCount
 */
export interface LiquidScene {
  id: string;
  targets: readonly LiquidTarget[];
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
 */
export type Field<T> = (seed: Seed, index: number, count: number, env: Env) => T;

// =============================================================================
// Behavior Types
// =============================================================================

/**
 * LiquidBehavior defines motion character.
 * Must be deterministic, bounded, and decay to 0 at u=1.
 */
export type LiquidBehavior =
  | { kind: 'none' }
  | { kind: 'wobble'; amplitude: number; frequency: number }
  | { kind: 'swirl'; turns: number; radius: number }
  | { kind: 'jitter'; strength: number };

// =============================================================================
// Goo Parameters
// =============================================================================

/**
 * GooParams control the liquid/metaball rendering effect.
 * These are compile-time stable (don't vary by time).
 */
export interface GooParams {
  blurPx: number;      // e.g. 8..30
  threshold: number;   // e.g. 0.35..0.7 (metaball cutoff)
  glowPx?: number;     // Optional outer glow
  alpha?: number;      // Global alpha multiplier
}

// =============================================================================
// Fields (compile-time parameterization)
// =============================================================================

/**
 * LiquidFields are evaluated once at compile time.
 * They replace all Math.random() usage with deterministic values.
 */
export interface LiquidFields {
  // Spatial initial conditions
  startPosition: Field<Vec2>;

  // Transport timing
  delay: Field<number>;
  duration: Field<number>;

  // Size evolution
  startRadius: Field<number>;
  targetRadius: Field<number>;

  // Style
  color: Field<Color>;
  opacity?: Field<number>;

  // Motion character (bounded, decays to 0 at u=1)
  behavior?: Field<LiquidBehavior>;

  // Renderer/global goo params (compile-time stable)
  goo: Field<GooParams>;
}

// =============================================================================
// Phase Types
// =============================================================================

export type LiquidPhase = 'entrance' | 'hold' | 'exit';

export interface LiquidPhaseSample {
  phase: LiquidPhase;
  u: number;       // Eased progress within phase [0,1]
  uRaw: number;    // Raw progress within phase [0,1]
  tLocal: number;  // Time since start of machine
}

// =============================================================================
// Exit Policy
// =============================================================================

export interface ExitPolicy {
  opacityMul?: number;
  scaleMul?: number;
}

// =============================================================================
// Phases
// =============================================================================

/**
 * LiquidPhases defines the phase machine and phase-specific behaviors.
 */
export interface LiquidPhases {
  machine: PhaseMachine;

  /** Map phase sample -> transport progress gate (0..1) */
  progress: (sample: LiquidPhaseSample) => number;

  /** Map phase sample -> wobble strength multiplier */
  energy?: (sample: LiquidPhaseSample) => number;

  /** Optional exit policy */
  exit?: (sample: LiquidPhaseSample) => ExitPolicy | undefined;
}

// =============================================================================
// Compiled Blob Parameters
// =============================================================================

/**
 * CompiledBlobParams holds the evaluated compile-time values for a single blob.
 */
export interface CompiledBlobParams {
  id: string;
  startPos: Vec2;
  targetPos: Vec2;
  delay: number;
  duration: number;
  r0: number;       // Start radius
  r1: number;       // Target radius
  color: Color;
  opacity: number;
  behavior: LiquidBehavior;
}

// =============================================================================
// Renderer Contract
// =============================================================================

/**
 * LiquidRenderer draws blobs and applies goo cohesion.
 */
export interface LiquidRenderer {
  /** Create a blob node (geometry is implicit circle) */
  blob(args: {
    id: string;
    position: Vec2;
    radius: number;
    color: Color;
    opacity: number;
  }): RenderNode;

  /** Apply a goo/metaball postprocess over a set of blobs */
  gooLayer(args: {
    id: string;
    blobs: readonly RenderNode[];
    goo: GooParams;
    exit?: ExitPolicy;
  }): RenderNode;

  /** Compose into final render tree */
  compose(
    rootId: string,
    node: RenderNode,
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

export interface LiquidSpec {
  scene: LiquidScene;
  fields: LiquidFields;
  phases: LiquidPhases;
  renderer: LiquidRenderer;
}
