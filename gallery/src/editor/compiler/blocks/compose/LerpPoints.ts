/**
 * LerpPoints Block Compiler
 *
 * Interpolates between two Field<Point> arrays based on per-element progress.
 * Outputs Signal<Point[]> - animated positions for each element.
 */

import type {
  BlockCompiler,
  Field,
  RuntimeCtx,
  Vec2,
} from '../../types';

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export const LerpPointsBlock: BlockCompiler = {
  type: 'lerpPoints',
  inputs: [
    { name: 'from', type: { kind: 'Field:vec2' }, required: true },
    { name: 'to', type: { kind: 'Field:vec2' }, required: true },
    { name: 'progress', type: { kind: 'Signal:Unit' }, required: true }, // Actually Signal<number[]>
  ],
  outputs: [
    { name: 'positions', type: { kind: 'Signal:vec2' } }, // Actually Signal<Vec2[]>
  ],

  compile({ inputs, ctx }) {
    // Validate inputs
    if (inputs.from?.kind !== 'Field:vec2') {
      return {
        positions: { kind: 'Error', message: 'LerpPoints: from must be Field:vec2' },
      };
    }
    if (inputs.to?.kind !== 'Field:vec2') {
      return {
        positions: { kind: 'Error', message: 'LerpPoints: to must be Field:vec2' },
      };
    }
    if (inputs.progress?.kind !== 'Signal:Unit') {
      return {
        positions: { kind: 'Error', message: 'LerpPoints: progress must be Signal:Unit' },
      };
    }

    const fromField: Field<Vec2> = inputs.from.value;
    const toField: Field<Vec2> = inputs.to.value;
    const progressSignal = inputs.progress.value as (tMs: number, ctx: RuntimeCtx) => readonly number[];

    const seed = 42;
    const n = ctx.elementCount ?? 10;

    // Evaluate position fields at compile time (BULK form)
    const fromPositions = fromField(seed, n, ctx);
    const toPositions = toField(seed, n, ctx);

    // Create signal that computes interpolated positions at runtime
    const positionsSignal = (tMs: number, rtCtx: RuntimeCtx): readonly Vec2[] => {
      const progressArray = progressSignal(tMs, rtCtx);
      const positions: Vec2[] = new Array(n);

      for (let i = 0; i < n; i++) {
        const from = fromPositions[i] ?? { x: 0, y: 0 };
        const to = toPositions[i] ?? { x: 0, y: 0 };
        const t = progressArray[i] ?? 0;
        positions[i] = lerpVec2(from, to, t);
      }

      return positions;
    };

    return { positions: { kind: 'Signal:vec2', value: positionsSignal as unknown } };
  },
};
