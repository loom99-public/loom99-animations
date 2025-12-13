/**
 * V4 Kinetic Animation - Compiler
 *
 * Per ui_example_docs/06-kinetic.md spec section 8.
 *
 * Compiler responsibilities:
 * - Evaluate per-part params once at compile time
 * - Per frame: sample phase, compute transforms, compose all parts
 * - Entrance: easeOutBack from initial offset/rotation/scale to identity
 * - Hold: identity transform, full opacity
 * - Exit: fly radially from center with spin, fade out
 */

import type { Time, Context, Seed, PhaseMachine } from '../../core/types';
import { PhaseMachines, Vec2 } from '../../core/types';
import type { RenderTree } from '../../render/tree';
import type {
  KineticScene,
  KineticFields,
  KineticPhases,
  KineticPhaseSample,
  KineticPhase,
  CompiledPartParams,
  KineticRenderer,
  Transform2D,
  Env,
  Program,
} from './types';
import type { ModeSystem } from './modes';
import { createProceduralModeSystem, createVariedModeSystem } from './modes';
import { createSVGKineticRenderer } from './render';

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Clamp value to [0, 1].
 */
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * easeInCubic for exit phase.
 */
function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * easeOutBack for entrance phase with configurable overshoot.
 * Matches HTML: c1 = overshoot; c3 = c1 + 1
 */
function easeOutBack(t: number, overshoot: number): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Normalize a vector to unit length.
 * Returns (1, 0) if vector is too small.
 */
function normalize(v: { x: number; y: number }): { x: number; y: number } {
  const m = Math.hypot(v.x, v.y);
  return m < 1e-6 ? { x: 1, y: 0 } : { x: v.x / m, y: v.y / m };
}

/**
 * Compute bounds center from parts.
 * Averages all part centers as a simple approximation.
 */
function computeSceneCenter(parts: readonly CompiledPartParams[]): { x: number; y: number } {
  if (parts.length === 0) return { x: 0, y: 0 };

  let sumX = 0;
  let sumY = 0;
  for (const p of parts) {
    sumX += p.center.x;
    sumY += p.center.y;
  }
  return { x: sumX / parts.length, y: sumY / parts.length };
}

/**
 * Extract center from a RenderNode.
 * Uses bounding box center for paths, or explicit position for circles/rects.
 */
function getPartCenter(node: import('../../render/tree').RenderNode): { x: number; y: number } {
  switch (node.type) {
    case 'circle':
      return { x: node.cx, y: node.cy };
    case 'rect':
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    case 'text':
      return { x: node.x, y: node.y };
    case 'path': {
      // Parse path to get bounding box center (simplified)
      // For production, use a proper path parser
      // For now, try to extract first M command coordinates
      const match = node.d.match(/M\s*(-?[\d.]+)\s*[,\s]\s*(-?[\d.]+)/i);
      if (match) {
        return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
      }
      return { x: 0, y: 0 };
    }
    case 'group':
    case 'filter':
      // For groups, return center of first child or (0,0)
      if (node.children.length > 0) {
        return getPartCenter(node.children[0]);
      }
      return { x: 0, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

// =============================================================================
// Phase Machine
// =============================================================================

/**
 * Create a phase machine for the kinetic animation.
 */
export function createKineticPhaseMachine(
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
 * Get total duration of the kinetic animation.
 */
export function getProgramDuration(phaseMachine: PhaseMachine): number {
  return PhaseMachines.total(phaseMachine);
}

// =============================================================================
// Default Phase Functions
// =============================================================================

/**
 * Default progress function: maps phase to transform progress gate.
 */
function defaultProgress(sample: KineticPhaseSample): number {
  switch (sample.phase) {
    case 'entrance':
      return sample.u;  // 0 -> 1 during entrance
    case 'hold':
    case 'exit':
      return 1;         // Transform complete during hold/exit
    default:
      return 1;
  }
}

/**
 * Default energy function: maps phase to behavior strength.
 */
function defaultEnergy(sample: KineticPhaseSample): number {
  switch (sample.phase) {
    case 'entrance':
      return 1;
    case 'hold':
      return 0;
    case 'exit':
      return 0.5;
    default:
      return 0;
  }
}

// =============================================================================
// Phase Sampling
// =============================================================================

/**
 * Sample the phase machine and convert to KineticPhaseSample.
 */
function samplePhase(phaseMachine: PhaseMachine, t: Time): KineticPhaseSample {
  const ps = PhaseMachines.sample(phaseMachine, t);
  return {
    phase: ps.phase as KineticPhase,
    u: ps.progress,
    uRaw: ps.progressRaw,
    tLocal: ps.globalTime,
  };
}

// =============================================================================
// Compiler Options
// =============================================================================

export interface KineticCompilerOptions {
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
 * Compile a kinetic animation from scene, mode system, and seed.
 *
 * This is the main entry point for creating a kinetic animation program.
 */
export function compileKinetic(
  scene: KineticScene,
  modeSystem: ModeSystem,
  seed: Seed,
  env: Env,
  options: KineticCompilerOptions = {}
): Program<RenderTree> {
  const { fields } = modeSystem.resolve(scene.parts);

  // Timing configuration (HTML defaults: entrance ~3.5s, hold 2s, exit 0.25s)
  const entranceDur = options.entranceDuration ?? 3.5;
  const holdDur = options.holdDuration ?? 2.0;
  const exitDur = options.exitDuration ?? 0.25;
  const backgroundColor = options.backgroundColor ?? '#0a0a0f';

  // Create phase machine
  const phaseMachine = createKineticPhaseMachine(entranceDur, holdDur, exitDur);

  // Create phases with default functions
  const phases: KineticPhases = {
    machine: phaseMachine,
    progress: defaultProgress,
    energy: defaultEnergy,
  };

  // Create renderer
  const renderer = createSVGKineticRenderer();

  // Viewport
  const viewportWidth = env.viewport.w;
  const viewportHeight = env.viewport.h;

  // Get part count
  const n = scene.parts.length;

  // First pass: compile part params to get centers
  const partParams: CompiledPartParams[] = scene.parts.map((part, i) => {
    const center = getPartCenter(part.node);
    const delay = fields.delay(seed, i, n, env);
    const duration = fields.duration(seed, i, n, env);
    const entryOffset = fields.entryOffset(seed, i, n, env);
    const entryRot = fields.entryRotationDeg(seed, i, n, env);
    const entryScale = fields.entryScale(seed, i, n, env);
    const overshoot = fields.overshoot(seed, i, n, env);
    const opacityBase = fields.opacity ? fields.opacity(seed, i, n, env) : 1;
    const colorOverride = fields.color ? fields.color(seed, i, n, env) : undefined;
    const exitDist = fields.exitDistance(seed, i, n, env);
    const exitSpin = fields.exitSpinDeg(seed, i, n, env);

    return {
      id: part.id,
      content: part.node,
      center,
      dir: { x: 0, y: 0 },  // Will be computed after scene center is known
      delay,
      duration,
      entryOffset,
      entryRot,
      entryScale,
      overshoot,
      opacityBase,
      colorOverride,
      exitDist,
      exitSpin,
    };
  });

  // Compute scene center (for exit direction)
  const sceneCenter = scene.exitCenter ?? scene.bounds?.center ?? computeSceneCenter(partParams);

  // Second pass: compute exit directions
  const params = partParams.map((p) => {
    // Exit direction: from sceneCenter toward part center
    const dir = normalize({
      x: p.center.x - sceneCenter.x,
      y: p.center.y - sceneCenter.y,
    });
    return { ...p, dir };
  });

  // ---- PROGRAM ----

  return {
    signal: (t: Time, _ctx: Context): RenderTree => {
      // Sample current phase
      const ps = samplePhase(phaseMachine, t);

      // Build all part nodes
      const nodes = params.map((p) => {
        if (ps.phase === 'entrance') {
          // Calculate local progress for this part
          const localT = ps.tLocal - p.delay;
          const uLocal = p.duration <= 0 ? 1 : clamp01(localT / p.duration);

          // Apply easeOutBack for bounce effect
          const eased = easeOutBack(uLocal, p.overshoot);

          // Entrance transform: animate from initial values toward identity
          // x = entryOffset.x * (1 - eased), y = entryOffset.y * (1 - eased)
          // rot = entryRot * (1 - eased)
          // scale = entryScale + (1 - entryScale) * eased
          const tx = p.entryOffset.x * (1 - eased);
          const ty = p.entryOffset.y * (1 - eased);
          const rot = p.entryRot * (1 - eased);
          const sc = p.entryScale + (1 - p.entryScale) * eased;

          // Opacity ramps in fast: min(1, progress * 2)
          const op = p.opacityBase * Math.min(1, uLocal * 2);

          const transform: Transform2D = {
            translate: { x: tx, y: ty },
            rotateDeg: rot,
            scale: sc,
            origin: p.center,
          };

          return renderer.part({
            id: p.id,
            content: p.content,
            transform,
            opacity: op,
            colorOverride: p.colorOverride,
          });
        }

        if (ps.phase === 'hold') {
          // Identity transform during hold
          const transform: Transform2D = {
            translate: { x: 0, y: 0 },
            rotateDeg: 0,
            scale: 1,
            origin: p.center,
          };

          return renderer.part({
            id: p.id,
            content: p.content,
            transform,
            opacity: p.opacityBase,
            colorOverride: p.colorOverride,
          });
        }

        // Exit phase
        const u = clamp01(ps.u);
        const eased = easeInCubic(u);

        // Fly away from center along dir, spin, fade out
        const dist = p.exitDist * eased;
        const tx = p.dir.x * dist;
        const ty = p.dir.y * dist;
        const rot = p.exitSpin * eased;
        const op = p.opacityBase * (1 - eased);

        const transform: Transform2D = {
          translate: { x: tx, y: ty },
          rotateDeg: rot,
          scale: 1,  // No scale change during exit
          origin: p.center,
        };

        return renderer.part({
          id: p.id,
          content: p.content,
          transform,
          opacity: op,
          colorOverride: p.colorOverride,
        });
      });

      // Compose into render tree
      return renderer.compose(
        scene.id,
        nodes,
        viewportWidth,
        viewportHeight,
        backgroundColor
      );
    },

    event: () => [] as const,
  };
}

// =============================================================================
// Convenience Compilers
// =============================================================================

/**
 * Compile with "procedural" mode (tight envelopes, uniform behavior).
 */
export function compileProceduralKinetic(
  scene: KineticScene,
  seed: Seed,
  env: Env,
  options?: KineticCompilerOptions
): Program<RenderTree> {
  return compileKinetic(scene, createProceduralModeSystem(), seed, env, options);
}

/**
 * Compile with "varied" mode (wider envelopes, more randomness).
 */
export function compileVariedKinetic(
  scene: KineticScene,
  seed: Seed,
  env: Env,
  options?: KineticCompilerOptions
): Program<RenderTree> {
  return compileKinetic(scene, createVariedModeSystem(), seed, env, options);
}

// =============================================================================
// Scene Helpers
// =============================================================================

/**
 * Create a simple test scene with geometric shapes.
 */
export function createTestScene(): KineticScene {
  const parts = [
    {
      id: 'part-0',
      node: {
        type: 'circle' as const,
        id: 'circle-0',
        cx: 100,
        cy: 100,
        r: 30,
        style: { fill: '#00ffff' },
      },
    },
    {
      id: 'part-1',
      node: {
        type: 'rect' as const,
        id: 'rect-1',
        x: 180,
        y: 80,
        width: 50,
        height: 40,
        style: { fill: '#ff00ff' },
      },
    },
    {
      id: 'part-2',
      node: {
        type: 'circle' as const,
        id: 'circle-2',
        cx: 280,
        cy: 100,
        r: 25,
        style: { fill: '#ffff00' },
      },
    },
  ];

  return {
    id: 'test-kinetic',
    parts,
    exitCenter: { x: 200, y: 100 },
  };
}

/**
 * Create a scene from custom parts.
 */
export function createSceneFromParts(
  id: string,
  parts: KineticScene['parts'],
  exitCenter?: { x: number; y: number }
): KineticScene {
  return {
    id,
    parts,
    exitCenter,
  };
}
