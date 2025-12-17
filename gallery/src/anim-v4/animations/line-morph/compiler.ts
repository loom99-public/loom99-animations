/**
 * V4 LineMorph Animation - Compiler
 *
 * Compiles LineMorph animations per ui_example_docs/line-morph/impl.md
 *
 * Purpose: Compile line-drawing/morphing strokes by mapping a scalar morph
 * progress into geometry interpolation, coordinated by per-stroke fields.
 */

import type { Signal, Context, Time, Seed } from '../../core/types';
import { PhaseMachines, type PhaseMachine } from '../../core/types';
import type { RenderTree } from '../../render/tree';
import { group, renderTree } from '../../render/tree';
import type {
  LineScene,
  StrokeParams,
  Color,
  Env,
  Field,
} from './types';
import type { ModeSystem } from './modes';
import { renderMorphStroke, generateGlowFilters, easeOutCubic, smoothstep } from './render';
import { lerpPoint } from './geometry';

// =============================================================================
// Program Type (matches kernel)
// =============================================================================

export type Program<Out> = {
  readonly signal: Signal<Out>;
  readonly event: (t: Time, ctx: Context) => readonly never[];
};

// =============================================================================
// Clamp Helper
// =============================================================================

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// =============================================================================
// Default Field Values
// =============================================================================

const DEFAULT_ORIGIN: Field<{ x: number; y: number }> = () => ({ x: 0, y: 0 });
const DEFAULT_DELAY: Field<number> = () => 0;
const DEFAULT_DURATION: Field<number> = () => 0.8;
const DEFAULT_STROKE_WIDTH: Field<number> = () => 4;
const DEFAULT_GLOW_RADIUS: Field<number> = () => 6;
const DEFAULT_COLOR: Field<Color> = () => ({ kind: 'hsl', h: 190, s: 100, l: 50 });
const DEFAULT_OPACITY: Field<number> = () => 1;

// =============================================================================
// LineMorph Compiler
// =============================================================================

/**
 * Compile a LineMorph animation.
 *
 * Per impl.md spec:
 * - scene: LineScene with strokes (constraint)
 * - modes: Stack of mode keys to compose
 * - phaseMachine: Defines entrance/hold/fold timing
 * - modeSystem: Resolves mode keys to composed fields
 * - seed: For deterministic randomness
 * - env: Viewport info
 */
export function compileLineMorph(
  scene: LineScene,
  modes: readonly string[],
  phaseMachine: PhaseMachine,
  modeSystem: ModeSystem,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const count = scene.strokes.length;

  // Resolve stacked modes into one composed bundle
  const composed = modeSystem.resolve(modes);

  // Pull required fields (with fallbacks)
  const originF = composed.fields.origin ?? DEFAULT_ORIGIN;
  const delayF = composed.fields.delay ?? DEFAULT_DELAY;
  const durationF = composed.fields.duration ?? DEFAULT_DURATION;
  const strokeWidthF = composed.fields.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const glowRadiusF = composed.fields.glowRadius ?? DEFAULT_GLOW_RADIUS;
  const colorF = composed.fields.color ?? DEFAULT_COLOR;
  const opacityF = composed.fields.opacity ?? DEFAULT_OPACITY;

  // Precompute per-stroke static params (determinism boundary)
  const params: StrokeParams[] = scene.strokes.map((_, i) => ({
    origin: originF(seed, i, count, env),
    delay: delayF(seed, i, count, env),
    duration: durationF(seed, i, count, env),
    strokeWidth: strokeWidthF(seed, i, count, env),
    glowRadius: glowRadiusF(seed, i, count, env),
    color: colorF(seed, i, count, env),
    opacity: opacityF(seed, i, count, env),
  }));

  // Pre-generate glow filters
  const filters = generateGlowFilters(
    scene.strokes.map(s => s.id),
    params.map(p => p.glowRadius)
  );


  // Get viewport dimensions for render tree
  const viewportWidth = env.viewport.w;
  const viewportHeight = env.viewport.h;

  // ---- PROGRAM ----

  return {
    signal: (t: Time, _ctx: Context): RenderTree => {
      const phaseSample = PhaseMachines.sample(phaseMachine, t);

      const nodes = scene.strokes.map((stroke, i) => {
        const p = params[i];

        // Local time for this stroke (accounting for stagger delay)
        const localT = phaseSample.globalTime - p.delay;
        const uRaw = p.duration <= 0 ? 1 : localT / p.duration;
        const u = clamp01(uRaw);

        // Apply easing to morph progress
        const uEased = easeOutCubic(u);

        // Phase-aware morph rule
        const morph =
          phaseSample.phase === 'entrance' ? uEased :
          phaseSample.phase === 'hold' ? 1 :
          phaseSample.phase === 'fold' ? 1 :
          1;

        // Tail position rule (only moves during entrance)
        const tail =
          phaseSample.phase === 'entrance'
            ? lerpPoint(p.origin, stroke.p0, morph)
            : stroke.p0;

        // Compute opacity (fade in during entrance)
        const opacity =
          phaseSample.phase === 'entrance'
            ? smoothstep(u) * p.opacity
            : p.opacity;

        return renderMorphStroke({
          id: stroke.id,
          stroke,
          tail,
          morph,
          style: {
            stroke: p.color,
            strokeWidth: p.strokeWidth,
            opacity,
            glowRadius: p.glowRadius,
          },
        });
      });

      return renderTree(
        viewportWidth,
        viewportHeight,
        group(scene.id, nodes),
        {
          defs: filters.length > 0 ? { filters } : undefined,
          viewBox: {
            minX: 0,
            minY: 0,
            width: viewportWidth,
            height: viewportHeight,
          },
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
 * Create a standard LineMorph phase machine.
 */
export function createLineMorphPhaseMachine(
  entranceDuration: number = 1.2,
  holdDuration: number = 2.0,
  foldDuration: number = 0.25
): PhaseMachine {
  return PhaseMachines.of([
    { name: 'entrance', duration: entranceDuration, ease: easeOutCubic },
    { name: 'hold', duration: holdDuration },
    { name: 'fold', duration: foldDuration },
  ]);
}

/**
 * Get total duration of a compiled program.
 * (Convenience function for the viewer)
 */
export function getProgramDuration(phaseMachine: PhaseMachine): number {
  return PhaseMachines.total(phaseMachine);
}
