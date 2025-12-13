/**
 * V4 LineMorph Animation - Public API
 *
 * Convenience compilers for the 6 animation combinations:
 * - logo/text × original/varied/procedural
 */

import type { Seed } from '../../core/types';
import type { RenderTree } from '../../render/tree';
import type { Program } from './compiler';
import type { Env, Field, Color } from './types';
import { VARIANCE_PROCEDURAL, VARIANCE_VARIED, VARIANCE_ORIGINAL } from './types';
import { compileLineMorph, createLineMorphPhaseMachine, getProgramDuration } from './compiler';
import {
  getScene,
  getOriginalOriginsForTarget,
  getOriginalTimingForTarget,
} from './scene';
import {
  createModeSystem,
  pickOriginMode,
  PROCEDURAL_MODE_SYSTEM,
  VARIED_MODE_SYSTEM,
  ORIGINAL_MODE_SYSTEM,
} from './modes';
import type { Vec2 } from '../../core/types';

// =============================================================================
// Default Environment
// =============================================================================

const DEFAULT_ENV: Env = {
  viewport: { w: 600, h: 200 },
};

// =============================================================================
// Original Mode - Uses exact origins/timing from path data
// =============================================================================

/**
 * Create mode fields that use original origins from path data.
 */
function createOriginalOriginField(origins: readonly Vec2[]): Field<Vec2> {
  return (_seed, index, _count, _env) => {
    return origins[index] ?? { x: 0, y: 0 };
  };
}

/**
 * Create mode fields that use original timing from path data.
 */
function createOriginalDelayField(delays: readonly number[]): Field<number> {
  return (_seed, index, _count, _env) => {
    return delays[index] ?? 0;
  };
}

/**
 * Create a constant duration field.
 */
function createOriginalDurationField(duration: number): Field<number> {
  return () => duration;
}

/**
 * Compile an "original" line drawing animation.
 * Uses exact origins and timing from the original HTML animation.
 */
export function compileOriginalLineDrawing(
  seed: Seed,
  target: 'logo' | 'text',
  env: Env = DEFAULT_ENV
): Program<RenderTree> {
  const scene = getScene(target);
  const origins = getOriginalOriginsForTarget(target);
  const timing = getOriginalTimingForTarget(target);

  // Create a custom mode system with original values
  const modeSystem = createModeSystem(VARIANCE_ORIGINAL);

  // We need to inject original fields. Create a custom mode system that uses them.
  const originalModes: readonly string[] = ['staggered', 'neon-line'];

  // Create phase machine with timing that matches original HTML
  const maxDelay = Math.max(...timing.delays);
  const entranceDuration = maxDelay + timing.duration + 0.2; // Add buffer
  const phaseMachine = createLineMorphPhaseMachine(entranceDuration, 2.0, 0.25);

  // Compile with injected original fields by creating a temporary custom mode system
  const customModeSystem = {
    get: modeSystem.get,
    resolve: (keys: readonly string[]) => {
      const composed = modeSystem.resolve(keys);
      // Override with original fields
      return {
        ...composed,
        fields: {
          ...composed.fields,
          origin: createOriginalOriginField(origins),
          delay: createOriginalDelayField(timing.delays),
          duration: createOriginalDurationField(timing.duration),
        },
      };
    },
  };

  return compileLineMorph(
    scene,
    originalModes,
    phaseMachine,
    customModeSystem,
    seed,
    env
  );
}

// =============================================================================
// Varied Mode - More randomness in timing and positions
// =============================================================================

/**
 * Compile a "varied" line drawing animation.
 * Uses higher variance for more dynamic, unique animations.
 */
export function compileVariedLineDrawing(
  seed: Seed,
  target: 'logo' | 'text',
  env: Env = DEFAULT_ENV
): Program<RenderTree> {
  const scene = getScene(target);

  // Pick origin mode based on seed
  const originMode = pickOriginMode(seed);
  const modes: readonly string[] = [originMode, 'staggered', 'neon-line'];

  const phaseMachine = createLineMorphPhaseMachine(1.5, 2.0, 0.25);

  return compileLineMorph(
    scene,
    modes,
    phaseMachine,
    VARIED_MODE_SYSTEM,
    seed,
    env
  );
}

// =============================================================================
// Procedural Mode - Subtle randomness, more controlled
// =============================================================================

/**
 * Compile a "procedural" line drawing animation.
 * Uses subtle variance for controlled procedural animations.
 */
export function compileProceduralLineDrawing(
  seed: Seed,
  target: 'logo' | 'text',
  env: Env = DEFAULT_ENV
): Program<RenderTree> {
  const scene = getScene(target);

  // Pick origin mode based on seed
  const originMode = pickOriginMode(seed);
  const modes: readonly string[] = [originMode, 'staggered', 'neon-line'];

  const phaseMachine = createLineMorphPhaseMachine(1.2, 2.0, 0.25);

  return compileLineMorph(
    scene,
    modes,
    phaseMachine,
    PROCEDURAL_MODE_SYSTEM,
    seed,
    env
  );
}

// =============================================================================
// Re-exports
// =============================================================================

export { compileLineMorph, createLineMorphPhaseMachine, getProgramDuration } from './compiler';
export { getScene, LOGO_SCENE, TEXT_SCENE } from './scene';
export { createModeSystem, pickOriginMode } from './modes';
export { geometryCache, Invalidate } from './geometry';
export type { LineScene, StrokeDef, Env, Color, LineMorphModeFields } from './types';
export type { Program } from './compiler';
