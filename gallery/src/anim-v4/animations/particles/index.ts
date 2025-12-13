/**
 * V4 Particles Animation - Public API
 *
 * Convenience compilers for the 6 animation combinations:
 * - logo/text × original/varied/procedural
 */

import type { Seed } from '../../core/types';
import type { RenderTree } from '../../render/tree';
import type { Program } from './compiler';
import type { Env } from './types';
import { compileParticles, createParticlesPhaseMachine, getProgramDuration } from './compiler';
import { getScene, getViewport } from './scene';
import {
  createModeSystem,
  ORIGINAL_MODE_SYSTEM,
  PROCEDURAL_MODE_SYSTEM,
  VARIED_MODE_SYSTEM,
} from './modes';
import {
  VARIANCE_ORIGINAL,
  VARIANCE_PROCEDURAL,
  VARIANCE_VARIED,
} from './types';

// =============================================================================
// Default Environment
// =============================================================================

function getEnv(target: 'logo' | 'text'): Env {
  return { viewport: getViewport(target) };
}

// =============================================================================
// Original Mode
// =============================================================================

/**
 * Compile an "original" particles animation.
 * Minimal variance, predictable motion.
 */
export function compileOriginalParticles(
  seed: Seed,
  target: 'logo' | 'text'
): Program<RenderTree> {
  const scene = getScene(target);
  const env = getEnv(target);
  const modeSystem = createModeSystem(VARIANCE_ORIGINAL);
  const phaseMachine = createParticlesPhaseMachine(2.5, 2.0, 0.5);

  return compileParticles(scene, modeSystem, phaseMachine, seed, env);
}

// =============================================================================
// Varied Mode
// =============================================================================

/**
 * Compile a "varied" particles animation.
 * Higher variance for more dynamic animations.
 */
export function compileVariedParticles(
  seed: Seed,
  target: 'logo' | 'text'
): Program<RenderTree> {
  const scene = getScene(target);
  const env = getEnv(target);
  const modeSystem = createModeSystem(VARIANCE_VARIED);
  const phaseMachine = createParticlesPhaseMachine(3.0, 2.0, 0.5);

  return compileParticles(scene, modeSystem, phaseMachine, seed, env);
}

// =============================================================================
// Procedural Mode
// =============================================================================

/**
 * Compile a "procedural" particles animation.
 * Subtle variance, controlled procedural motion.
 */
export function compileProceduralParticles(
  seed: Seed,
  target: 'logo' | 'text'
): Program<RenderTree> {
  const scene = getScene(target);
  const env = getEnv(target);
  const modeSystem = createModeSystem(VARIANCE_PROCEDURAL);
  const phaseMachine = createParticlesPhaseMachine(2.5, 2.0, 0.5);

  return compileParticles(scene, modeSystem, phaseMachine, seed, env);
}

// =============================================================================
// Re-exports
// =============================================================================

export { compileParticles, createParticlesPhaseMachine, getProgramDuration } from './compiler';
export { getScene, getViewport, clearSceneCache } from './scene';
export { createModeSystem } from './modes';
export { canonicalTrajectory } from './trajectory';
export type { ParticlesScene, ParticleParams, Env, Color, ParticleBehavior } from './types';
export type { Program } from './compiler';
