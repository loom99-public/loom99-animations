/**
 * V4 Particles Animation - Compiler
 *
 * Compiles Particles animations per ui_example_docs/particle.md
 *
 * Guarantees:
 * - Deterministic
 * - Scrubbable (entrance at least)
 * - No hidden state
 */

import type { Signal, Context, Time, Seed } from '../../core/types';
import { PhaseMachines, type PhaseMachine } from '../../core/types';
import type { RenderTree } from '../../render/tree';
import { group, renderTree } from '../../render/tree';
import type {
  ParticlesScene,
  ParticleParams,
  ParticleState,
  ParticleBehavior,
  Color,
  Env,
  Field,
} from './types';
import type { ModeSystem } from './modes';
import { canonicalTrajectory, exitPosition, exitOpacity } from './trajectory';
import { renderParticle, generateParticleGlowFilter, easeOutCubic, easeInCubic, hexToColor } from './render';
import { createPRNG } from '../../core/rand';

// =============================================================================
// Program Type
// =============================================================================

export type Program<Out> = {
  readonly signal: Signal<Out>;
  readonly event: (t: Time, ctx: Context) => readonly never[];
};

// =============================================================================
// Helpers
// =============================================================================

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// =============================================================================
// Default Field Values
// =============================================================================

const DEFAULT_START_POSITION: Field<{ x: number; y: number }> = (seed, index, _count, env) => {
  const rng = createPRNG(seed + index * 10007);
  const angle = rng.next() * Math.PI * 2;
  const distance = 200 + rng.next() * 200;
  return {
    x: env.viewport.w / 2 + Math.cos(angle) * distance,
    y: env.viewport.h / 2 + Math.sin(angle) * distance,
  };
};

const DEFAULT_DELAY: Field<number> = (_seed, index, count, _env) => {
  return (index / count) * 0.5;
};

const DEFAULT_DURATION: Field<number> = () => 2.0;
const DEFAULT_RADIUS: Field<number> = () => 2.5;
const DEFAULT_COLOR: Field<Color> = () => ({ kind: 'hsl', h: 190, s: 100, l: 50 });
const DEFAULT_OPACITY: Field<number> = () => 1;
const DEFAULT_BEHAVIOR: Field<ParticleBehavior> = () => ({ kind: 'spiral', turns: 0.3, radius: 20 });

// =============================================================================
// Particles Compiler
// =============================================================================

/**
 * Compile a Particles animation.
 */
export function compileParticles(
  scene: ParticlesScene,
  modeSystem: ModeSystem,
  phaseMachine: PhaseMachine,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const count = scene.targets.length;

  // Resolve modes
  const composed = modeSystem.resolve();

  // Pull fields with fallbacks
  const startPositionF = composed.fields.startPosition ?? DEFAULT_START_POSITION;
  const delayF = composed.fields.delay ?? DEFAULT_DELAY;
  const durationF = composed.fields.duration ?? DEFAULT_DURATION;
  const radiusF = composed.fields.radius ?? DEFAULT_RADIUS;
  const colorF = composed.fields.color ?? DEFAULT_COLOR;
  const opacityF = composed.fields.opacity ?? DEFAULT_OPACITY;
  const behaviorF = composed.fields.behavior ?? DEFAULT_BEHAVIOR;

  // Precompute per-particle params at compile time
  const params: ParticleParams[] = scene.targets.map((target, i) => {
    // Use scene color if available, otherwise use field
    const sceneColor = scene.colors[i];
    const baseColor = sceneColor ? hexToColor(sceneColor) : colorF(seed, i, count, env);

    // Compute exit target (scatter outward)
    const rng = createPRNG(seed + i * 99999);
    const exitAngle = rng.next() * Math.PI * 2;
    const exitDistance = 200 + rng.next() * 200;

    return {
      startPosition: startPositionF(seed, i, count, env),
      target,
      delay: delayF(seed, i, count, env),
      duration: durationF(seed, i, count, env),
      radius: radiusF(seed, i, count, env),
      color: baseColor,
      opacity: opacityF(seed, i, count, env),
      behavior: behaviorF(seed, i, count, env),
      // Store exit target for exit phase
      _exitTarget: {
        x: target.x + Math.cos(exitAngle) * exitDistance,
        y: target.y + Math.sin(exitAngle) * exitDistance,
      },
    } as ParticleParams & { _exitTarget: { x: number; y: number } };
  });

  // Pre-generate glow filter
  const glowFilter = generateParticleGlowFilter(8);

  // Viewport
  const viewportWidth = env.viewport.w;
  const viewportHeight = env.viewport.h;

  // ---- PROGRAM ----

  return {
    signal: (t: Time, _ctx: Context): RenderTree => {
      const phaseSample = PhaseMachines.sample(phaseMachine, t);

      const nodes = params.map((p, i) => {
        const extendedP = p as ParticleParams & { _exitTarget: { x: number; y: number } };
        let state: ParticleState;

        if (phaseSample.phase === 'entrance') {
          // Local time for this particle
          const localT = phaseSample.globalTime - p.delay;
          const uRaw = p.duration <= 0 ? 1 : localT / p.duration;
          const u = clamp01(uRaw);
          const uEased = easeOutCubic(u);

          // Compute position using trajectory
          const position = canonicalTrajectory.position(
            uEased,
            p.startPosition,
            p.target,
            p.behavior,
            i
          );

          // Compute opacity
          const opacity = canonicalTrajectory.opacity(u, p.opacity);

          state = {
            position,
            radius: p.radius,
            color: p.color,
            opacity,
          };
        } else if (phaseSample.phase === 'hold') {
          // Particles at rest
          state = {
            position: p.target,
            radius: p.radius,
            color: p.color,
            opacity: p.opacity,
          };
        } else {
          // Exit phase
          const exitProgress = phaseSample.progress;
          const uEased = easeInCubic(exitProgress);

          const position = exitPosition(uEased, p.target, extendedP._exitTarget);
          const opacity = exitOpacity(uEased, p.opacity);

          state = {
            position,
            radius: p.radius,
            color: p.color,
            opacity,
          };
        }

        return renderParticle({
          id: `particle-${i}`,
          state,
          glowRadius: 8,
        });
      });

      return renderTree(
        viewportWidth,
        viewportHeight,
        group(scene.id, nodes),
        {
          defs: { filters: [glowFilter] },
          viewBox: {
            minX: 0,
            minY: 0,
            width: viewportWidth,
            height: viewportHeight,
          },
          backgroundColor: '#1a1a2e',
        }
      );
    },

    event: () => [],
  };
}

// =============================================================================
// Phase Machine Factory
// =============================================================================

/**
 * Create a standard Particles phase machine.
 */
export function createParticlesPhaseMachine(
  entranceDuration: number = 2.5,
  holdDuration: number = 2.0,
  exitDuration: number = 0.5
): PhaseMachine {
  return PhaseMachines.of([
    { name: 'entrance', duration: entranceDuration, ease: easeOutCubic },
    { name: 'hold', duration: holdDuration },
    { name: 'exit', duration: exitDuration, ease: easeInCubic },
  ]);
}

/**
 * Get total duration of a compiled program.
 */
export function getProgramDuration(phaseMachine: PhaseMachine): number {
  return PhaseMachines.total(phaseMachine);
}
