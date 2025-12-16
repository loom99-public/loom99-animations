/**
 * V4 Path Morph Animation - Compiler
 *
 * Per ui_example_docs/03-morph.md spec:
 * - Evaluate fields once at compile time
 * - Compute local morph progress per path
 * - Feed renderer with (morph, startShape, targetPath)
 */

import type { Context, Time, Seed } from '../../core/types';
import { PhaseMachines, type PhaseMachine } from '../../core/types';
import type { RenderTree } from '../../render/tree';
import { group, renderTree } from '../../render/tree';
import type {
  PathMorphScene,
  PathParams,
  Color,
  Style,
  StartShapeSpec,
  Env,
  Program,
} from './types';
import type { ModeSystem } from './modes';
import { renderMorphPath, generatePathGlowFilter, easeOutCubic, easeInCubic, hexToColor } from './render';
import { getPathBounds, defaultStartSizeFromBounds } from './geometry';
import { createPRNG } from '../../core/rand';

// =============================================================================
// Helpers
// =============================================================================

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// =============================================================================
// Default Fields (fallbacks)
// =============================================================================

const DEFAULT_DELAY = (_seed: Seed, index: number, count: number) => (index / count) * 0.5;
const DEFAULT_DURATION = () => 1.2;
const DEFAULT_START_SHAPE = (): StartShapeSpec => ({
  kind: 'circle',
  center: { x: 0, y: 0 },
  size: 30,
});
const DEFAULT_COLOR = (): Color => ({ kind: 'hex', value: '#00d4ff' });
const DEFAULT_OPACITY = () => 1;

// =============================================================================
// Path Morph Compiler
// =============================================================================

export function compilePathMorph(
  scene: PathMorphScene,
  modeSystem: ModeSystem,
  phaseMachine: PhaseMachine,
  seed: Seed,
  env: Env
): Program<RenderTree> {
  const count = scene.paths.length;

  // Resolve mode fields
  const { fields } = modeSystem.resolve();

  // Pull fields with fallbacks
  const delayF = fields.delay ?? DEFAULT_DELAY;
  const durationF = fields.duration ?? DEFAULT_DURATION;
  const startShapeF = fields.startShape ?? DEFAULT_START_SHAPE;
  const colorF = fields.color ?? DEFAULT_COLOR;
  const opacityF = fields.opacity ?? DEFAULT_OPACITY;

  // Precompute per-path params at compile time
  const params: PathParams[] = scene.paths.map((pathDef, i) => {
    // Get bounds for this path
    const bounds = getPathBounds(pathDef.id, pathDef.d);

    // Get base start shape from mode
    const baseStart = startShapeF(seed, i, count, env);

    // Compute start size with variance for non-original
    const rng = createPRNG(seed + i * 7777);
    const baseSize = defaultStartSizeFromBounds(bounds);
    const sizeVariance = 1 + (rng.next() - 0.5) * 0.4; // 0.8 to 1.2
    const size = baseStart.size > 0 ? baseStart.size : baseSize * sizeVariance;

    // Resolve start shape with center from bounds
    const start: StartShapeSpec = {
      ...baseStart,
      center: bounds.center,
      size,
    };

    // Get color - use path's colorTag if available
    const color = pathDef.colorTag
      ? hexToColor(pathDef.colorTag)
      : colorF(seed, i, count, env);

    return {
      id: pathDef.id,
      target: pathDef,
      start,
      delay: delayF(seed, i, count, env),
      duration: durationF(seed, i, count, env),
      color,
      opacity: opacityF(seed, i, count, env),
    };
  });

  // Pre-generate glow filter
  const glowFilter = generatePathGlowFilter(6);

  // Viewport
  const viewportWidth = env.viewport.w;
  const viewportHeight = env.viewport.h;

  // ---- PROGRAM ----

  return {
    signal: (t: Time, _ctx: Context): RenderTree => {
      const phaseSample = PhaseMachines.sample(phaseMachine, t);

      const nodes = params.map((p) => {
        let morph: number;
        let exit: { scale?: number; opacityMul?: number } | undefined;

        if (phaseSample.phase === 'entrance') {
          // Local time for this path
          const localT = phaseSample.globalTime - p.delay;
          const uRaw = p.duration <= 0 ? 1 : localT / p.duration;
          const u = clamp01(uRaw);
          morph = easeOutCubic(u);
        } else if (phaseSample.phase === 'hold') {
          morph = 1;
        } else {
          // Exit phase - morph stays at 1, but opacity fades
          morph = 1;
          const exitProgress = easeInCubic(phaseSample.progress);
          exit = {
            opacityMul: 1 - exitProgress,
          };
        }

        const style: Style = {
          stroke: p.color,
          strokeWidth: 4,
          opacity: p.opacity,
          fill: 'none',
          lineCap: 'round',
          lineJoin: 'round',
        };

        return renderMorphPath({
          id: p.id,
          morph,
          targetD: p.target.d,
          start: p.start,
          style,
          exit,
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

export function createPathMorphPhaseMachine(
  entranceDuration: number = 2.0,
  holdDuration: number = 2.0,
  exitDuration: number = 0.5
): PhaseMachine {
  return PhaseMachines.of([
    { name: 'entrance', duration: entranceDuration, ease: easeOutCubic },
    { name: 'hold', duration: holdDuration },
    { name: 'exit', duration: exitDuration, ease: easeInCubic },
  ]);
}

export function getProgramDuration(phaseMachine: PhaseMachine): number {
  return PhaseMachines.total(phaseMachine);
}
