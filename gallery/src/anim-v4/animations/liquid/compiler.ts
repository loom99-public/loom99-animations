/**
 * V4 Liquid Animation - Compiler
 *
 * Per ui_example_docs/05-liquid.md spec section 9.
 *
 * Compiler responsibilities:
 * - Evaluate fields once per blob at compile time
 * - Per frame: sample phase, compute local u per blob, compute pos + radius
 * - Emit blobs -> goo layer -> compose
 */

import type { Time, Context, Seed, PhaseMachine } from '../../core/types';
import { PhaseMachines } from '../../core/types';
import type { RenderTree } from '../../render/tree';
import type {
  LiquidScene,
  LiquidPhases,
  LiquidPhaseSample,
  LiquidPhase,
  CompiledBlobParams,
  Env,
  Program,
  ExitPolicy,
} from './types';
import type { ModeSystem } from './modes';
import { createProceduralModeSystem, createVariedModeSystem } from './modes';
import { liquidOffset, liquidRadiusOffset, lerpVec2, lerpNum, clamp01 } from './trajectory';
import { createSVGLiquidRenderer } from './render';

// =============================================================================
// Phase Machine
// =============================================================================

/**
 * Create a phase machine for the liquid animation.
 */
export function createLiquidPhaseMachine(
  entranceDuration: number,
  holdDuration: number,
  exitDuration: number
): PhaseMachine {
  return PhaseMachines.of([
    { name: 'entrance', duration: entranceDuration },
    { name: 'hold', duration: holdDuration },
    { name: 'exit', duration: exitDuration },
  ]);
}

/**
 * Get total duration of the liquid animation.
 */
export function getProgramDuration(phaseMachine: PhaseMachine): number {
  return PhaseMachines.total(phaseMachine);
}

// =============================================================================
// Default Phase Functions
// =============================================================================

/**
 * Default progress function: maps phase to transport progress gate.
 */
function defaultProgress(sample: LiquidPhaseSample): number {
  switch (sample.phase) {
    case 'entrance':
      return sample.u;  // 0 -> 1 during entrance
    case 'hold':
    case 'exit':
      return 1;         // Stay at target during hold/exit
    default:
      return 1;
  }
}

/**
 * Default energy function: maps phase to wobble strength.
 */
function defaultEnergy(sample: LiquidPhaseSample): number {
  switch (sample.phase) {
    case 'entrance':
      return 1;         // Full energy during entrance
    case 'hold':
      return 0.1;       // Subtle micro-wobble during hold
    case 'exit':
      return 0.5;       // Some energy during exit
    default:
      return 0;
  }
}

/**
 * Default exit policy: fade and scale out.
 */
function defaultExit(sample: LiquidPhaseSample): ExitPolicy | undefined {
  if (sample.phase !== 'exit') return undefined;
  return {
    opacityMul: 1 - sample.u,
    scaleMul: 1 - sample.u * 0.3,  // Scale down slightly
  };
}

// =============================================================================
// Phase Sampling
// =============================================================================

/**
 * Sample the phase machine and convert to LiquidPhaseSample.
 */
function samplePhase(phaseMachine: PhaseMachine, t: Time): LiquidPhaseSample {
  const ps = PhaseMachines.sample(phaseMachine, t);
  return {
    phase: ps.phase as LiquidPhase,
    u: ps.progress,
    uRaw: ps.progressRaw,
    tLocal: ps.globalTime,
  };
}

// =============================================================================
// Compiler Options
// =============================================================================

export interface LiquidCompilerOptions {
  /** Custom entrance duration in seconds */
  entranceDuration?: number;
  /** Custom hold duration in seconds */
  holdDuration?: number;
  /** Custom exit duration in seconds */
  exitDuration?: number;
  /** Background color for the render tree */
  backgroundColor?: string;
}

// =============================================================================
// Compiler
// =============================================================================

/**
 * Compile a liquid animation from scene, mode system, and seed.
 *
 * This is the main entry point for creating a liquid animation program.
 */
export function compileLiquid(
  scene: LiquidScene,
  modeSystem: ModeSystem,
  seed: Seed,
  env: Env,
  options: LiquidCompilerOptions = {}
): Program<RenderTree> {
  const { fields } = modeSystem.resolve(scene.targets);

  // Timing configuration
  const entranceDur = options.entranceDuration ?? 2.0;
  const holdDur = options.holdDuration ?? 1.5;
  const exitDur = options.exitDuration ?? 0.5;
  const backgroundColor = options.backgroundColor ?? '#0a0a0f';

  // Create phase machine
  const phaseMachine = createLiquidPhaseMachine(entranceDur, holdDur, exitDur);

  // Create phases with default functions
  const phases: LiquidPhases = {
    machine: phaseMachine,
    progress: defaultProgress,
    energy: defaultEnergy,
    exit: defaultExit,
  };

  // Create renderer
  const renderer = createSVGLiquidRenderer();

  // Viewport
  const viewportWidth = env.viewport.w;
  const viewportHeight = env.viewport.h;

  // Get target count
  const n = scene.targets.length;

  // Compile-time parameter evaluation (determinism boundary)
  const goo = fields.goo(seed, 0, 1, env);

  const params: CompiledBlobParams[] = scene.targets.map((target, i) => {
    const startPos = fields.startPosition(seed, i, n, env);
    const delay = fields.delay(seed, i, n, env);
    const duration = fields.duration(seed, i, n, env);
    const r0 = fields.startRadius(seed, i, n, env);
    const r1 = target.r ?? fields.targetRadius(seed, i, n, env);
    const color = fields.color(seed, i, n, env);
    const opacity = fields.opacity ? fields.opacity(seed, i, n, env) : 1;
    const behavior = fields.behavior
      ? fields.behavior(seed, i, n, env)
      : { kind: 'none' as const };

    return {
      id: `blob-${i}`,
      startPos,
      targetPos: target.p,
      delay,
      duration,
      r0,
      r1,
      color,
      opacity,
      behavior,
    };
  });

  // ---- PROGRAM ----

  return {
    signal: (t: Time, _ctx: Context): RenderTree => {
      // Sample current phase
      const ps = samplePhase(phaseMachine, t);

      // Get phase-dependent values
      const gate = phases.progress(ps);
      const energy = phases.energy ? phases.energy(ps) : 1;
      const exit = phases.exit ? phases.exit(ps) : undefined;

      // Time in seconds for noise sampling
      const tSec = ps.tLocal;

      // Build all blobs
      const blobs = params.map((p, i) => {
        // Calculate local progress for this blob
        const localT = tSec - p.delay;
        const uLocal = p.duration <= 0 ? 1 : clamp01(localT / p.duration);

        // Gate by phase progress
        const u = clamp01(uLocal * gate);

        // Base position: linear interpolation from start to target
        const base = lerpVec2(p.startPos, p.targetPos, u);

        // Bounded offset (decays to 0 at u=1)
        const off = liquidOffset(seed, i, p.behavior, tSec, u, energy);

        const pos = {
          x: base.x + off.x,
          y: base.y + off.y,
        };

        // Radius morph + subtle wobble
        const rBase = lerpNum(p.r0, p.r1, u);
        const rOff = liquidRadiusOffset(seed, i, p.behavior, tSec, u, energy);
        const radius = Math.max(0.5, rBase + rOff);

        // Apply exit opacity
        const opacity = clamp01(p.opacity * (exit?.opacityMul ?? 1));

        return renderer.blob({
          id: p.id,
          position: pos,
          radius,
          color: p.color,
          opacity,
        });
      });

      // Wrap in goo layer
      const gooNode = renderer.gooLayer({
        id: `${scene.id}-goo`,
        blobs,
        goo,
        exit,
      });

      // Compose into render tree
      return renderer.compose(
        scene.id,
        gooNode,
        viewportWidth,
        viewportHeight,
        backgroundColor
      );
    },

    event: () => [],
  };
}

// =============================================================================
// Convenience Compilers
// =============================================================================

/**
 * Compile with "procedural" mode (tight envelopes, uniform behavior).
 */
export function compileProceduralLiquid(
  scene: LiquidScene,
  seed: Seed,
  env: Env,
  options?: LiquidCompilerOptions
): Program<RenderTree> {
  return compileLiquid(scene, createProceduralModeSystem(), seed, env, options);
}

/**
 * Compile with "varied" mode (wider envelopes, mixed behaviors).
 */
export function compileVariedLiquid(
  scene: LiquidScene,
  seed: Seed,
  env: Env,
  options?: LiquidCompilerOptions
): Program<RenderTree> {
  return compileLiquid(scene, createVariedModeSystem(), seed, env, options);
}

// =============================================================================
// Scene Helpers
// =============================================================================

/**
 * Create a simple test scene with a grid of blobs.
 */
export function createTestScene(): LiquidScene {
  const targets = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      targets.push({
        p: { x: 100 + col * 40, y: 50 + row * 40 },
        r: 8,
        groupId: row,
      });
    }
  }
  return {
    id: 'test-liquid',
    targets,
    bounds: {
      center: { x: 180, y: 90 },
      width: 160,
      height: 80,
    },
  };
}

/**
 * Create a scene from custom target positions.
 */
export function createSceneFromTargets(
  id: string,
  targets: Array<{ x: number; y: number; r?: number }>
): LiquidScene {
  return {
    id,
    targets: targets.map((t, i) => ({
      p: { x: t.x, y: t.y },
      r: t.r,
      groupId: Math.floor(i / 10),
    })),
  };
}
