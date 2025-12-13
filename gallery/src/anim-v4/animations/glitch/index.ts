/**
 * V4 Glitch Animation
 *
 * A multi-layer RGB separation glitch effect.
 * Per ui_example_docs/04-glitch.md spec.
 *
 * Features:
 * - Static geometry with multi-layer compositor
 * - RGB channel separation via feColorMatrix + feOffset
 * - Time-varying offsets, opacity flicker, transforms
 * - Four phases: glitch -> stabilize -> hold -> exit
 * - Deterministic noise (scrub-safe)
 *
 * Usage:
 * ```typescript
 * import {
 *   compileGlitch,
 *   createModeSystem,
 *   createSceneFromNode,
 * } from './anim-v4/animations/glitch';
 *
 * const scene = createSceneFromNode('my-logo', logoNode, bounds);
 * const modeSystem = createModeSystem({ intensity: 'normal' });
 * const program = compileGlitch(scene, modeSystem, seed, env);
 *
 * // In animation loop:
 * const renderTree = program.signal(t, ctx);
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  GlitchScene,
  GlitchFields,
  GlitchPhase,
  GlitchPhaseSample,
  GlitchEnvelopes,
  GlitchChannel,
  LayerParams,
  GlitchRenderer,
  CompiledGlitchParams,
  GlitchSpec,
  Bounds,
  Env,
  Field,
  Program,
} from './types';

// =============================================================================
// Compiler
// =============================================================================

export {
  compileGlitch,
  compileOriginalGlitch,
  compileVariedGlitch,
  compileProceduralGlitch,
  createGlitchPhaseMachine,
  getProgramDuration,
  createTestScene,
  createSceneFromNode,
  type GlitchCompilerOptions,
} from './compiler';

// =============================================================================
// Modes
// =============================================================================

export {
  createModeSystem,
  createOriginalModeSystem,
  createVariedModeSystem,
  createProceduralModeSystem,
  createIntenseModeSystem,
  createSubtleModeSystem,
  type ModeSystem,
  type GlitchModeConfig,
  type GlitchModeFields,
  type IntensityMode,
  type TimingMode,
  type VarianceMode,
} from './modes';

// =============================================================================
// Envelopes
// =============================================================================

export {
  glitchEnvelopes,
  glitchEnvelopesIntense,
  glitchEnvelopesSubtle,
  createScaledEnvelopes,
  type EnvelopeFn,
} from './envelopes';

// =============================================================================
// Noise Functions
// =============================================================================

export {
  noise01,
  noiseSigned,
  noiseRange,
  noiseSmooth01,
  noiseSmoothedSigned,
  hash32,
  hashMany,
  clamp01,
  clamp,
  lerp,
} from './noise';

// =============================================================================
// Renderer
// =============================================================================

export {
  createSVGGlitchRenderer,
  createCSSGlitchRenderer,
  createRGBChannelFilter,
  buildTransform,
  defaultRenderer,
  createGlitchLayer,
  composeGlitchLayers,
  type GlitchLayerResult,
} from './render';

// =============================================================================
// Scene Data
// =============================================================================

export {
  LOGO_GLITCH_SCENE,
  TEXT_GLITCH_SCENE,
  getScene as getGlitchScene,
  getViewport as getGlitchViewport,
} from './scene';
