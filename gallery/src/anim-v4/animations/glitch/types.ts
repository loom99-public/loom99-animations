/**
 * V4 Glitch Animation - Type Definitions
 *
 * Per ui_example_docs/04-glitch.md spec:
 * - Static geometry, multi-layer glitch compositor
 * - RGB separation layers with feColorMatrix + feOffset
 * - Time-varying offsets, opacity flicker, transforms
 * - Four phases: glitch -> stabilize -> hold -> exit
 */

import type { Seed, Time, Context } from '../../core/types';
import type { RenderTree, RenderNode } from '../../render/tree';

// =============================================================================
// Scene Definition
// =============================================================================

/**
 * GlitchScene contains the static logo geometry.
 * No animation logic - just the "what".
 */
export interface GlitchScene {
  id: string;
  root: RenderNode;  // Static geometry tree (logo)
  bounds?: Bounds;   // Optional bounds for transform origin
}

// =============================================================================
// Bounds
// =============================================================================

export interface Bounds {
  center: { x: number; y: number };
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
// Fields (compile-time parameterization)
// =============================================================================

/**
 * GlitchFields are evaluated once at compile time.
 * They replace all Math.random() usage with deterministic values.
 */
export interface GlitchFields {
  // Core glitch knobs (per run)
  rgbOffset: Field<number>;        // pixels, e.g. 5..25
  jitterMax: Field<number>;        // pixels, e.g. 15..40
  skewAmount: Field<number>;       // degrees, e.g. 5..25
  rotateMax?: Field<number>;       // degrees, small, e.g. 0..4

  // Timing (per run)
  glitchDuration: Field<number>;   // seconds, e.g. 0.6..1.8
  stabilizeDuration: Field<number>; // seconds
  holdDuration: Field<number>;     // seconds, default 2.0
  exitDuration: Field<number>;     // seconds, default 0.25

  // Style
  mainOpacity?: Field<number>;     // default 1
  layerOpacityMax?: Field<number>; // default ~0.5..1 (varies by phase)
}

// =============================================================================
// Phase Types
// =============================================================================

export type GlitchPhase = 'glitch' | 'stabilize' | 'hold' | 'exit';

export interface GlitchPhaseSample {
  phase: GlitchPhase;
  u: number;      // Eased progress within phase [0,1]
  uRaw: number;   // Raw progress within phase [0,1]
}

// =============================================================================
// Envelope Output (amplitudes for current phase)
// =============================================================================

export interface GlitchEnvelopes {
  rateHz: number;           // Noise sample rate (higher = faster jitter)
  rgbAmp: number;           // RGB offset amplitude multiplier
  jitterAmp: number;        // Transform jitter amplitude
  skewAmp: number;          // Skew amplitude
  rotAmp: number;           // Rotation amplitude
  layerOpacityBase: number; // Base opacity for RGB layers
  mainJitterAmp: number;    // Main logo jitter amplitude
  mainOpacityMul: number;   // Main logo opacity multiplier
}

// =============================================================================
// Layer Types
// =============================================================================

export type GlitchChannel = 'main' | 'r' | 'g' | 'b';

export interface LayerParams {
  id: string;
  channel: GlitchChannel;
  offset: { dx: number; dy: number };
  transform: { tx: number; ty: number; skewXDeg: number; rotDeg: number };
  opacity: number;
}

// =============================================================================
// Renderer Contract
// =============================================================================

/**
 * GlitchRenderer creates the multi-layer glitch composite.
 * Supports SVG filter backend (feColorMatrix + feOffset).
 */
export interface GlitchRenderer {
  /**
   * Create one layer (main or rgb).
   */
  layer(args: {
    id: string;
    content: RenderNode;
    channel: GlitchChannel;
    offset: { dx: number; dy: number };
    transform: { tx: number; ty: number; skewXDeg: number; rotDeg: number };
    opacity: number;
    bounds?: Bounds;
  }): RenderNode;

  /**
   * Compose all layers into final render tree.
   */
  compose(
    rootId: string,
    layers: readonly RenderNode[],
    width: number,
    height: number,
    backgroundColor?: string
  ): RenderTree;
}

// =============================================================================
// Compiled Parameters
// =============================================================================

/**
 * CompiledGlitchParams holds the evaluated compile-time values.
 */
export interface CompiledGlitchParams {
  rgbOffset: number;
  jitterMax: number;
  skewAmountDeg: number;
  rotateMaxDeg: number;
  mainBaseOpacity: number;
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

export interface GlitchSpec {
  scene: GlitchScene;
  fields: GlitchFields;
  renderer: GlitchRenderer;
}
