/**
 * V4 Path Morph Animation - Public API
 *
 * Provides convenience compilers for the 6 animation variants:
 * - Logo Original/Varied/Procedural
 * - Text Original/Varied/Procedural
 */

import type { Seed } from '../../core/types';
import type { RenderTree } from '../../render/tree';
import type { Env, Program } from './types';
import { compilePathMorph, createPathMorphPhaseMachine, getProgramDuration } from './compiler';
import { createModeSystem } from './modes';
import { getScene, getViewport } from './scene';

// =============================================================================
// Re-exports
// =============================================================================

export { compilePathMorph, createPathMorphPhaseMachine, getProgramDuration } from './compiler';
export { createModeSystem } from './modes';
export { getScene, getViewport, LOGO_SCENE, TEXT_SCENE } from './scene';
export { clearGeometryCache } from './geometry';

export type {
  PathMorphScene,
  PathDef,
  StartShapeSpec,
  StartShapeKind,
  Color,
  Style,
  Env,
  Program,
} from './types';

// =============================================================================
// Convenience Compilers
// =============================================================================

/**
 * Compile original path morph animation.
 * Fixed timing, predictable start shapes.
 */
export function compileOriginalPathMorph(
  seed: Seed,
  target: 'logo' | 'text',
  env?: Env
): Program<RenderTree> {
  const scene = getScene(target);
  const viewport = getViewport(target);
  const resolvedEnv = env ?? { viewport };
  const modeSystem = createModeSystem('original');
  const phaseMachine = createPathMorphPhaseMachine(2.0, 2.0, 0.5);

  return compilePathMorph(scene, modeSystem, phaseMachine, seed, resolvedEnv);
}

/**
 * Compile varied path morph animation.
 * Randomized timing, varied shapes and colors.
 */
export function compileVariedPathMorph(
  seed: Seed,
  target: 'logo' | 'text',
  env?: Env
): Program<RenderTree> {
  const scene = getScene(target);
  const viewport = getViewport(target);
  const resolvedEnv = env ?? { viewport };
  const modeSystem = createModeSystem('varied');
  const phaseMachine = createPathMorphPhaseMachine(2.5, 2.0, 0.5);

  return compilePathMorph(scene, modeSystem, phaseMachine, seed, resolvedEnv);
}

/**
 * Compile procedural path morph animation.
 * Aggressive variance, diverse shapes, dynamic colors.
 */
export function compileProceduralPathMorph(
  seed: Seed,
  target: 'logo' | 'text',
  env?: Env
): Program<RenderTree> {
  const scene = getScene(target);
  const viewport = getViewport(target);
  const resolvedEnv = env ?? { viewport };
  const modeSystem = createModeSystem('procedural');
  const phaseMachine = createPathMorphPhaseMachine(3.0, 2.0, 0.5);

  return compilePathMorph(scene, modeSystem, phaseMachine, seed, resolvedEnv);
}
