/**
 * V4 Liquid Animation
 *
 * A liquid blob animation where circular blobs transport toward target
 * positions and merge visually via a goo/metaball filter.
 *
 * Per ui_example_docs/05-liquid.md spec.
 *
 * Features:
 * - Deterministic transport from start to target positions
 * - Goo/metaball rendering for visual cohesion
 * - Phase-driven: entrance -> hold -> exit
 * - Scrub-safe (no runtime RNG)
 * - Multiple behavior modes: wobble, swirl, jitter
 *
 * Usage:
 * ```typescript
 * import {
 *   compileLiquid,
 *   createModeSystem,
 *   getScene,
 *   getViewport,
 * } from './anim-v4/animations/liquid';
 *
 * const scene = getScene('logo');
 * const viewport = getViewport('logo');
 * const modeSystem = createModeSystem({ origin: 'leftBand', goo: 'soft' });
 * const env = { viewport: { w: viewport.w, h: viewport.h } };
 * const program = compileLiquid(scene, modeSystem, seed, env);
 *
 * // In animation loop:
 * const renderTree = program.signal(t, ctx);
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  LiquidScene,
  LiquidTarget,
  LiquidFields,
  LiquidPhases,
  LiquidPhase,
  LiquidPhaseSample,
  LiquidBehavior,
  GooParams,
  LiquidRenderer,
  CompiledBlobParams,
  ExitPolicy,
  Bounds,
  Env,
  Field,
  Program,
} from './types';

// =============================================================================
// Compiler
// =============================================================================

export {
  compileLiquid,
  compileProceduralLiquid,
  compileVariedLiquid,
  createLiquidPhaseMachine,
  getProgramDuration,
  createTestScene,
  createSceneFromTargets,
  type LiquidCompilerOptions,
} from './compiler';

// =============================================================================
// Modes
// =============================================================================

export {
  createModeSystem,
  createProceduralModeSystem,
  createVariedModeSystem,
  createRingModeSystem,
  createBurstModeSystem,
  createSoftModeSystem,
  type ModeSystem,
  type LiquidModeConfig,
  type LiquidModeFields,
  type OriginMode,
  type TimingMode,
  type SizeMode,
  type GooMode,
  type BehaviorMode,
  type VarianceMode,
} from './modes';

// =============================================================================
// Trajectory Functions
// =============================================================================

export {
  liquidOffset,
  liquidRadiusOffset,
  noise01,
  noiseSigned,
  hash32,
  clamp01,
  lerpVec2,
  lerpNum,
} from './trajectory';

// =============================================================================
// Renderer
// =============================================================================

export {
  createSVGLiquidRenderer,
  createSimpleLiquidRenderer,
  createGooFilter,
  createBlob,
  createGooLayer,
  defaultRenderer,
} from './render';

// =============================================================================
// Scene Data
// =============================================================================

export {
  LOGO_LIQUID_SCENE,
  TEXT_LIQUID_SCENE,
  getScene as getLiquidScene,
  getViewport as getLiquidViewport,
  createCustomScene,
  createGridScene,
  createCircleScene,
} from './scene';
