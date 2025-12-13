/**
 * V4 Transform3D Animation - Compiler
 *
 * Per ui_example_docs/07-3d-transform.md spec section 8.
 *
 * Compiler responsibilities:
 * - Evaluate per-part params once at compile time using BULK FORM
 * - Per frame: sample phase, compute transforms, compose all parts
 * - Entrance: ease from initial 3D pose to identity
 * - Hold: identity transform, full opacity
 * - Exit: move to exit pose with spin, fade out
 */

import type { Time, Context, Seed, CompileCtx } from '../../core/types';
import { PhaseMachines, Vec2 } from '../../core/types';
import type { RenderTree, RenderNode } from '../../render/tree';
import type {
  Transform3DScene,
  Transform3DSpec,
  Transform3D,
  CompiledPartParams,
  EaseKind,
} from './types';
import type { Program } from '../../core/types';

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
 * easeOutCubic for entrance phase.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * easeOutQuint for entrance phase.
 */
function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

/**
 * easeOutBack for entrance phase with configurable overshoot.
 */
function easeOutBack(t: number, overshoot: number): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Apply easing function based on kind.
 */
function applyEase(kind: EaseKind, u: number, overshoot: number): number {
  if (kind === 'easeOutBack') return easeOutBack(u, overshoot);
  if (kind === 'easeOutQuint') return easeOutQuint(u);
  return easeOutCubic(u);
}

/**
 * Compute part center from RenderNode.
 * Simplified: uses position/center based on node type.
 */
function getPartCenter(node: RenderNode): Vec2 {
  switch (node.type) {
    case 'circle':
      return { x: node.cx, y: node.cy };
    case 'rect':
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    case 'text':
      return { x: node.x, y: node.y };
    case 'path':
      // Approximate as (0, 0) - would need path parsing for true center
      return { x: 0, y: 0 };
    case 'group':
      // Use first child's center as approximation
      return node.children.length > 0 ? getPartCenter(node.children[0]!) : { x: 0, y: 0 };
    case 'filter':
      return node.children.length > 0 ? getPartCenter(node.children[0]!) : { x: 0, y: 0 };
  }
}

/**
 * Compute scene center from parts.
 */
function computeSceneCenter(parts: readonly CompiledPartParams[]): Vec2 {
  if (parts.length === 0) return { x: 0, y: 0 };

  let sumX = 0;
  let sumY = 0;
  for (const p of parts) {
    sumX += p.origin.x;
    sumY += p.origin.y;
  }
  return { x: sumX / parts.length, y: sumY / parts.length };
}

// =============================================================================
// Compiler
// =============================================================================

/**
 * Compile a Transform3D animation from spec.
 *
 * BULK FORM: All fields evaluated once, producing arrays.
 */
export function compileTransform3D(
  spec: Transform3DSpec,
  seed: Seed,
  ctx: CompileCtx
): Program<RenderTree, never> {
  const { scene, fields, phases, renderer } = spec;
  const n = scene.parts.length;

  // BULK EVALUATION: Evaluate all fields once
  const delays = fields.delay(seed, n, ctx);
  const durations = fields.duration(seed, n, ctx);
  const entryTranslates = fields.entryTranslate(seed, n, ctx);
  const entryZs = fields.entryZ(seed, n, ctx);
  const entryRotZs = fields.entryRotZDeg(seed, n, ctx);
  const entryRotXs = fields.entryRotXDeg(seed, n, ctx);
  const entryRotYs = fields.entryRotYDeg(seed, n, ctx);
  const entryScales = fields.entryScale(seed, n, ctx);
  const exitTranslates = fields.exitTranslate(seed, n, ctx);
  const exitZs = fields.exitZ(seed, n, ctx);
  const exitRotXs = fields.exitRotXDeg(seed, n, ctx);
  const exitRotYs = fields.exitRotYDeg(seed, n, ctx);
  const exitRotZs = fields.exitRotZDeg(seed, n, ctx);
  const opacities = fields.opacity ? fields.opacity(seed, n, ctx) : Array(n).fill(1);
  const easeKinds = fields.ease ? fields.ease(seed, n, ctx) : Array(n).fill('easeOutCubic' as const);
  const overshoots = fields.overshoot ? fields.overshoot(seed, n, ctx) : Array(n).fill(1.6);

  const perspectivePx = scene.perspectivePx ?? 1000;

  // Map over parts, indexing into the evaluated arrays
  const params: CompiledPartParams[] = scene.parts.map((part, i) => {
    const origin = getPartCenter(part.node);

    return {
      id: part.id,
      content: part.node,
      origin,
      delay: delays[i]!,
      duration: durations[i]!,
      entry: {
        entryTranslate: entryTranslates[i]!,
        entryZ: entryZs[i]!,
        entryRotX: entryRotXs[i]!,
        entryRotY: entryRotYs[i]!,
        entryRotZ: entryRotZs[i]!,
        entryScale: entryScales[i]!,
      },
      exit: {
        exitTranslate: exitTranslates[i]!,
        exitZ: exitZs[i]!,
        exitRotX: exitRotXs[i]!,
        exitRotY: exitRotYs[i]!,
        exitRotZ: exitRotZs[i]!,
      },
      opacityBase: opacities[i]!,
      easeKind: easeKinds[i]!,
      overshoot: overshoots[i]!,
    };
  });

  const sceneCenter = scene.origin ?? computeSceneCenter(params);

  return {
    signal: (t: Time, signalCtx: Context) => {
      const ps = PhaseMachines.sample(phases.machine, t);

      const nodes = params.map((p) => {
        if (ps.phase === 'entrance') {
          const localT = ps.localTime - p.delay;
          const u = p.duration <= 0 ? 1 : clamp01(localT / p.duration);
          const eased = applyEase(p.easeKind, u, p.overshoot);

          const transform3d: Transform3D = {
            translate: {
              x: p.entry.entryTranslate.x * (1 - eased),
              y: p.entry.entryTranslate.y * (1 - eased),
            },
            z: p.entry.entryZ * (1 - eased),
            rotXDeg: p.entry.entryRotX * (1 - eased),
            rotYDeg: p.entry.entryRotY * (1 - eased),
            rotZDeg: p.entry.entryRotZ * (1 - eased),
            scale: p.entry.entryScale + (1 - p.entry.entryScale) * eased,
            origin: p.origin,
            perspectivePx,
          };

          // opacity ramps quickly
          const opacity = p.opacityBase * Math.min(1, u * 2);

          return renderer.part({ id: p.id, content: p.content, transform3d, opacity });
        }

        if (ps.phase === 'hold') {
          const transform3d: Transform3D = {
            translate: { x: 0, y: 0 },
            z: 0,
            rotXDeg: 0,
            rotYDeg: 0,
            rotZDeg: 0,
            scale: 1,
            origin: p.origin,
            perspectivePx,
          };
          return renderer.part({ id: p.id, content: p.content, transform3d, opacity: p.opacityBase });
        }

        // exit
        const u = clamp01(ps.progress);
        const eased = easeInCubic(u);

        const transform3d: Transform3D = {
          translate: {
            x: p.exit.exitTranslate.x * eased,
            y: p.exit.exitTranslate.y * eased,
          },
          z: p.exit.exitZ * eased,
          rotXDeg: p.exit.exitRotX * eased,
          rotYDeg: p.exit.exitRotY * eased,
          rotZDeg: p.exit.exitRotZ * eased,
          scale: 1,
          origin: p.origin,
          perspectivePx,
        };

        const opacity = p.opacityBase * (1 - eased);

        return renderer.part({ id: p.id, content: p.content, transform3d, opacity });
      });

      return renderer.compose(scene.id, nodes, ctx.viewport.width, ctx.viewport.height);
    },

    event: () => [],
  };
}
