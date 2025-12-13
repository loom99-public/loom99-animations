/**
 * PerElementCircles Block Compiler
 *
 * Takes per-element positions and progress, renders animated circles.
 * This is a high-level render block that handles the per-element iteration.
 */

import type { BlockCompiler, RuntimeCtx, Vec2, Program } from '../../types';
import type { RenderTree, DrawNode } from '../../../runtime/renderTree';
import { circle, group, withOpacity } from '../../../runtime/renderTree';

export const PerElementCirclesBlock: BlockCompiler = {
  type: 'perElementCircles',
  inputs: [
    { name: 'positions', type: { kind: 'Signal:vec2' }, required: true }, // Actually Signal<Vec2[]>
    { name: 'progress', type: { kind: 'Signal:Unit' }, required: false }, // For opacity, Signal<number[]>
  ],
  outputs: [{ name: 'program', type: { kind: 'RenderTreeProgram' } }],

  compile({ id, inputs, params }) {
    if (inputs.positions?.kind !== 'Signal:vec2') {
      return {
        program: { kind: 'Error', message: 'PerElementCircles: positions must be Signal:vec2' },
      };
    }

    const positionsSignal = inputs.positions.value as (tMs: number, ctx: RuntimeCtx) => readonly Vec2[];
    const progressSignal = inputs.progress?.kind === 'Signal:Unit'
      ? inputs.progress.value as (tMs: number, ctx: RuntimeCtx) => readonly number[]
      : null;

    const radius = Number(params.radius ?? 2.5);
    const color = (params.color as string) ?? '#00d4ff';
    const glow = params.glow !== false;

    const program: Program<RenderTree> = {
      signal: (tMs: number, rt: RuntimeCtx): RenderTree => {
        const positions = positionsSignal(tMs, rt);
        const progress = progressSignal ? progressSignal(tMs, rt) : null;

        const circles: DrawNode[] = positions.map((pos, i) => {
          const opacity = progress ? Math.min(1, (progress[i] ?? 1) * 2) : 1; // Fade in
          const circleNode = circle(`${id}-p-${i}`, pos.x, pos.y, radius, {
            fill: color,
            filter: glow ? 'blur(4px)' : undefined,
          });

          // Apply opacity via effect wrapper
          return withOpacity(`${id}-op-${i}`, opacity, circleNode);
        });

        return group(`${id}-root`, circles);
      },
      event: () => [],
    };

    return { program: { kind: 'RenderTreeProgram', value: program } };
  },
};
