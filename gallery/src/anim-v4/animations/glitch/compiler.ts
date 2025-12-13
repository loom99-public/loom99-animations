/**
 * V4 Glitch Animation - Compiler
 *
 * Per ui_example_docs/04-glitch.md spec section 8.
 *
 * Compiler responsibilities:
 * - Evaluate run-level parameters once at compile time
 * - Per frame: sample phase, compute envelopes, sample noise, build layers
 */

import type { Signal, Context, Time, Seed, PhaseMachine } from '../../core/types';
import { PhaseMachines } from '../../core/types';
import type { RenderTree, RenderNode } from '../../render/tree';
import { path } from '../../render/tree';
import type {
  GlitchScene,
  GlitchFields,
  GlitchPhaseSample,
  GlitchPhase,
  CompiledGlitchParams,
  GlitchRenderer,
  Env,
  Program,
  Bounds,
} from './types';
import type { ModeSystem } from './modes';
import {
  createOriginalModeSystem,
  createVariedModeSystem,
  createProceduralModeSystem,
} from './modes';
import { glitchEnvelopes, type EnvelopeFn } from './envelopes';
import { noiseSigned, noise01, clamp01 } from './noise';
import { createSVGGlitchRenderer } from './render';

// =============================================================================
// Phase Machine
// =============================================================================

/**
 * Create a phase machine for the glitch animation.
 */
export function createGlitchPhaseMachine(
  glitchDuration: number,
  stabilizeDuration: number,
  holdDuration: number,
  exitDuration: number
): PhaseMachine {
  return PhaseMachines.of([
    { name: 'glitch', duration: glitchDuration },
    { name: 'stabilize', duration: stabilizeDuration },
    { name: 'hold', duration: holdDuration },
    { name: 'exit', duration: exitDuration },
  ]);
}

/**
 * Get total duration of the glitch animation.
 */
export function getProgramDuration(phaseMachine: PhaseMachine): number {
  return PhaseMachines.total(phaseMachine);
}

// =============================================================================
// Phase Sampling
// =============================================================================

/**
 * Sample the phase machine and convert to GlitchPhaseSample.
 */
function samplePhase(phaseMachine: PhaseMachine, t: Time): GlitchPhaseSample {
  const ps = PhaseMachines.sample(phaseMachine, t);
  return {
    phase: ps.phase as GlitchPhase,
    u: ps.progress,
    uRaw: ps.progressRaw,
  };
}

// =============================================================================
// Compiler
// =============================================================================

export interface GlitchCompilerOptions {
  /** Custom envelope function (defaults to standard glitchEnvelopes) */
  envelopeFn?: EnvelopeFn;
  /** Background color for the render tree */
  backgroundColor?: string;
}

/**
 * Compile a glitch animation from scene, mode system, and seed.
 *
 * This is the main entry point for creating a glitch animation program.
 */
export function compileGlitch(
  scene: GlitchScene,
  modeSystem: ModeSystem,
  seed: Seed,
  env: Env,
  options: GlitchCompilerOptions = {}
): Program<RenderTree> {
  const { fields } = modeSystem.resolve();
  const envelopeFn = options.envelopeFn ?? glitchEnvelopes;
  const backgroundColor = options.backgroundColor ?? '#0a0a0f';

  // Compile-time parameter evaluation (determinism boundary)
  const params = evaluateFields(fields, seed, env);

  // Create phase machine from evaluated timing
  const glitchDur = fields.glitchDuration(seed, 0, 1, env);
  const stabilizeDur = fields.stabilizeDuration(seed, 0, 1, env);
  const holdDur = fields.holdDuration(seed, 0, 1, env);
  const exitDur = fields.exitDuration(seed, 0, 1, env);

  const phaseMachine = createGlitchPhaseMachine(
    glitchDur,
    stabilizeDur,
    holdDur,
    exitDur
  );

  // Create renderer
  const renderer = createSVGGlitchRenderer();

  // Viewport
  const viewportWidth = env.viewport.w;
  const viewportHeight = env.viewport.h;

  // ---- PROGRAM ----

  return {
    signal: (t: Time, _ctx: Context): RenderTree => {
      // Sample current phase
      const ps = samplePhase(phaseMachine, t);

      // Get envelope values for this phase
      const e = envelopeFn(ps);

      // Time in milliseconds for noise sampling
      const tMs = t * 1000;

      // Build RGB layers
      const rgbLayers = (['r', 'g', 'b'] as const).map((ch) => {
        // Deterministic "glitch noise" for this channel at time t
        const dx = e.rgbAmp * params.rgbOffset * noiseSigned(seed, ch, 'dx', tMs, e.rateHz);
        const dy = e.rgbAmp * params.rgbOffset * noiseSigned(seed, ch, 'dy', tMs, e.rateHz);

        const tx = e.jitterAmp * params.jitterMax * noiseSigned(seed, ch, 'tx', tMs, e.rateHz * 0.7);
        const ty = e.jitterAmp * params.jitterMax * noiseSigned(seed, ch, 'ty', tMs, e.rateHz * 0.7);

        const skew = e.skewAmp * params.skewAmountDeg * noiseSigned(seed, ch, 'skew', tMs, e.rateHz * 0.5);
        const rot = e.rotAmp * params.rotateMaxDeg * noiseSigned(seed, ch, 'rot', tMs, e.rateHz * 0.4);

        const op = clamp01(e.layerOpacityBase * (0.6 + 0.4 * noise01(seed, ch, 'op', tMs, e.rateHz)));

        return renderer.layer({
          id: `glitch-${ch}`,
          content: scene.root,
          channel: ch,
          offset: { dx, dy },
          transform: { tx, ty, skewXDeg: skew, rotDeg: rot },
          opacity: op,
          bounds: scene.bounds,
        });
      });

      // Main logo jitter (violent early, subtle later)
      const mainTx = e.mainJitterAmp * (params.jitterMax * 0.6) * noiseSigned(seed, 'main', 'tx', tMs, e.rateHz * 0.6);
      const mainTy = e.mainJitterAmp * (params.jitterMax * 0.6) * noiseSigned(seed, 'main', 'ty', tMs, e.rateHz * 0.6);
      const mainRot = e.mainJitterAmp * params.rotateMaxDeg * noiseSigned(seed, 'main', 'rot', tMs, e.rateHz * 0.4);

      const mainLayer = renderer.layer({
        id: 'glitch-main',
        content: scene.root,
        channel: 'main',
        offset: { dx: 0, dy: 0 },
        transform: { tx: mainTx, ty: mainTy, skewXDeg: 0, rotDeg: mainRot },
        opacity: params.mainBaseOpacity * e.mainOpacityMul,
        bounds: scene.bounds,
      });

      // Compose all layers: main first, then RGB on top
      return renderer.compose(
        scene.id,
        [mainLayer, ...rgbLayers],
        viewportWidth,
        viewportHeight,
        backgroundColor
      );
    },

    event: () => [],
  };
}

/**
 * Evaluate all fields at compile time.
 */
function evaluateFields(
  fields: GlitchFields,
  seed: Seed,
  env: Env
): CompiledGlitchParams {
  return {
    rgbOffset: fields.rgbOffset(seed, 0, 1, env),
    jitterMax: fields.jitterMax(seed, 0, 1, env),
    skewAmountDeg: fields.skewAmount(seed, 0, 1, env),
    rotateMaxDeg: fields.rotateMax ? fields.rotateMax(seed, 0, 1, env) : 3,
    mainBaseOpacity: fields.mainOpacity ? fields.mainOpacity(seed, 0, 1, env) : 1,
  };
}

// =============================================================================
// Convenience Compilers
// =============================================================================

/**
 * Compile with "original" mode (matches HTML reference).
 */
export function compileOriginalGlitch(
  scene: GlitchScene,
  seed: Seed,
  env: Env,
  options?: GlitchCompilerOptions
): Program<RenderTree> {
  return compileGlitch(scene, createOriginalModeSystem(), seed, env, options);
}

/**
 * Compile with "varied" mode (more randomness).
 */
export function compileVariedGlitch(
  scene: GlitchScene,
  seed: Seed,
  env: Env,
  options?: GlitchCompilerOptions
): Program<RenderTree> {
  return compileGlitch(scene, createVariedModeSystem(), seed, env, options);
}

/**
 * Compile with "procedural" mode (consistent parameters).
 */
export function compileProceduralGlitch(
  scene: GlitchScene,
  seed: Seed,
  env: Env,
  options?: GlitchCompilerOptions
): Program<RenderTree> {
  return compileGlitch(scene, createProceduralModeSystem(), seed, env, options);
}

// =============================================================================
// Scene Helpers
// =============================================================================

/**
 * Create a simple test scene with a rectangle.
 */
export function createTestScene(): GlitchScene {
  return {
    id: 'test-glitch',
    root: path('test-rect', 'M100 100 H300 V200 H100 Z', {
      fill: 'white',
      stroke: '#00ffff',
      strokeWidth: 2,
    }),
    bounds: {
      center: { x: 200, y: 150 },
      width: 200,
      height: 100,
    },
  };
}

/**
 * Create a scene from existing render nodes.
 */
export function createSceneFromNode(
  id: string,
  root: RenderNode,
  bounds?: Bounds
): GlitchScene {
  return { id, root, bounds };
}
