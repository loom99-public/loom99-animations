/**
 * V4 Animation Framework
 *
 * A comprehensive, pure, composable animation system built on 8 primitives:
 *
 * 1. Signal<A>        - Continuous time-indexed values (scrubbable)
 * 2. Event<A>         - Discrete occurrences at specific times
 * 3. map/zip          - Signal combinators for composition
 * 4. delay/stretch/warp - Time transforms
 * 5. switch/until     - Event-driven signal switching
 * 6. scan             - Pure state evolution over time
 * 7. Rand<A>          - Seedable randomness (deterministic)
 * 8. RenderTree       - Backend-neutral visual output
 *
 * Key design principles:
 * - Pure: same inputs always produce same outputs
 * - Scrubbable: can sample at any time, in any order
 * - Composable: small primitives combine into complex animations
 * - Reproducible: same seed produces identical animations
 *
 * Usage:
 * ```typescript
 * import { Signal, SignalFns, TimeFns, RenderFns } from './anim-v4';
 *
 * // Create a simple fade-in animation
 * const opacity = TimeFns.easedRamp(1.0, TimeFns.easeOutQuart);
 *
 * // Create a render tree signal
 * const animation: Signal<RenderTree> = (t, input) => {
 *   const o = opacity(t, input);
 *   return RenderFns.renderTree(800, 600, RenderFns.path('rect', 'M0 0 H100 V100 H0 Z', {
 *     fill: 'blue',
 *     opacity: o,
 *   }));
 * };
 * ```
 */

// Core module - namespaced function exports + types
export {
  // Namespaced function modules
  SignalFns,
  EventFns,
  TimeFns,
  SwitchFns,
  ScanFns,
  RandFns,
  // Commonly used functions
  createPRNG,
  DEFAULT_SEED,
  runRand,
  runField,
  DEFAULT_INPUT,
  DEFAULT_CONTEXT,
  // Easing functions
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
  EASINGS,
  getEasing,
} from './core';

// Core types
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
  EasingFn,
  EasingName,
} from './core';

// Render module - namespaced
import * as RenderFns from './render';
export { RenderFns };

// Render types exported directly
export type {
  RenderTree,
  RenderNode,
  PathNode,
  CircleNode,
  RectNode,
  TextNode,
  GroupNode,
  FilterNode,
  Style,
  FilterDef,
  FilterEffect,
  MaskDef,
  SVGInterpreter,
} from './render';

// =============================================================================
// LineMorph Animation
// =============================================================================

export {
  compileOriginalLineDrawing,
  compileVariedLineDrawing,
  compileProceduralLineDrawing,
  compileLineMorph,
  createLineMorphPhaseMachine,
  getProgramDuration,
  getScene,
  LOGO_SCENE,
  TEXT_SCENE,
  createModeSystem,
  pickOriginMode,
  geometryCache,
  Invalidate,
} from './animations/line-morph';

export type {
  LineScene,
  StrokeDef,
  Env as LineMorphEnv,
  Color as LineMorphColor,
  LineMorphModeFields,
  Program as LineMorphProgram,
} from './animations/line-morph';

// =============================================================================
// Particles Animation
// =============================================================================

export {
  compileOriginalParticles,
  compileVariedParticles,
  compileProceduralParticles,
  compileParticles,
  createParticlesPhaseMachine,
  getProgramDuration as getParticlesProgramDuration,
  getScene as getParticlesScene,
  getViewport as getParticlesViewport,
  clearSceneCache as clearParticlesSceneCache,
  createModeSystem as createParticlesModeSystem,
  canonicalTrajectory,
} from './animations/particles';

export type {
  ParticlesScene,
  ParticleParams,
  Env as ParticlesEnv,
  Color as ParticlesColor,
  ParticleBehavior,
  Program as ParticlesProgram,
} from './animations/particles';

// =============================================================================
// Path Morph Animation
// =============================================================================

export {
  compileOriginalPathMorph,
  compileVariedPathMorph,
  compileProceduralPathMorph,
  compilePathMorph,
  createPathMorphPhaseMachine,
  getProgramDuration as getPathMorphProgramDuration,
  getScene as getPathMorphScene,
  getViewport as getPathMorphViewport,
  clearGeometryCache as clearPathMorphGeometryCache,
  createModeSystem as createPathMorphModeSystem,
} from './animations/path-morph';

export type {
  PathMorphScene,
  PathDef,
  StartShapeSpec,
  StartShapeKind,
  Color as PathMorphColor,
  Env as PathMorphEnv,
  Program as PathMorphProgram,
} from './animations/path-morph';

// =============================================================================
// Glitch Animation
// =============================================================================

export {
  compileGlitch,
  compileOriginalGlitch,
  compileVariedGlitch,
  compileProceduralGlitch,
  createGlitchPhaseMachine,
  getProgramDuration as getGlitchProgramDuration,
  createTestScene as createGlitchTestScene,
  createSceneFromNode as createGlitchSceneFromNode,
  createModeSystem as createGlitchModeSystem,
  createOriginalModeSystem as createOriginalGlitchModeSystem,
  createVariedModeSystem as createVariedGlitchModeSystem,
  createProceduralModeSystem as createProceduralGlitchModeSystem,
  createIntenseModeSystem as createIntenseGlitchModeSystem,
  createSubtleModeSystem as createSubtleGlitchModeSystem,
  glitchEnvelopes,
  glitchEnvelopesIntense,
  glitchEnvelopesSubtle,
  createScaledEnvelopes as createScaledGlitchEnvelopes,
  noise01 as glitchNoise01,
  noiseSigned as glitchNoiseSigned,
  hash32 as glitchHash32,
  createSVGGlitchRenderer,
  createRGBChannelFilter,
  buildTransform as buildGlitchTransform,
  getGlitchScene,
  getGlitchViewport,
  LOGO_GLITCH_SCENE,
  TEXT_GLITCH_SCENE,
} from './animations/glitch';

export type {
  GlitchScene,
  GlitchFields,
  GlitchPhase,
  GlitchPhaseSample,
  GlitchEnvelopes,
  GlitchChannel,
  GlitchRenderer,
  GlitchSpec,
  Bounds as GlitchBounds,
  Env as GlitchEnv,
  Program as GlitchProgram,
  ModeSystem as GlitchModeSystem,
  GlitchModeConfig,
  GlitchModeFields,
  IntensityMode as GlitchIntensityMode,
  TimingMode as GlitchTimingMode,
  VarianceMode as GlitchVarianceMode,
  EnvelopeFn as GlitchEnvelopeFn,
  GlitchCompilerOptions,
} from './animations/glitch';

// =============================================================================
// Liquid Animation
// =============================================================================

export {
  compileLiquid,
  compileProceduralLiquid,
  compileVariedLiquid,
  createLiquidPhaseMachine,
  getProgramDuration as getLiquidProgramDuration,
  createTestScene as createLiquidTestScene,
  createSceneFromTargets as createLiquidSceneFromTargets,
  createModeSystem as createLiquidModeSystem,
  createProceduralModeSystem as createProceduralLiquidModeSystem,
  createVariedModeSystem as createVariedLiquidModeSystem,
  createRingModeSystem as createRingLiquidModeSystem,
  createBurstModeSystem as createBurstLiquidModeSystem,
  createSoftModeSystem as createSoftLiquidModeSystem,
  liquidOffset,
  liquidRadiusOffset,
  noise01 as liquidNoise01,
  noiseSigned as liquidNoiseSigned,
  hash32 as liquidHash32,
  createSVGLiquidRenderer,
  createSimpleLiquidRenderer,
  createGooFilter,
  getLiquidScene,
  getLiquidViewport,
  LOGO_LIQUID_SCENE,
  TEXT_LIQUID_SCENE,
  createGridScene as createLiquidGridScene,
  createCircleScene as createLiquidCircleScene,
} from './animations/liquid';

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
  ExitPolicy as LiquidExitPolicy,
  Bounds as LiquidBounds,
  Env as LiquidEnv,
  Program as LiquidProgram,
  ModeSystem as LiquidModeSystem,
  LiquidModeConfig,
  LiquidModeFields,
  OriginMode as LiquidOriginMode,
  TimingMode as LiquidTimingMode,
  SizeMode as LiquidSizeMode,
  GooMode as LiquidGooMode,
  BehaviorMode as LiquidBehaviorMode,
  VarianceMode as LiquidVarianceMode,
  LiquidCompilerOptions,
} from './animations/liquid';
