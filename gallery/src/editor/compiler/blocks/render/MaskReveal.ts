/**
 * MaskReveal Block Compiler
 *
 * Creates a mask-based reveal effect.
 * Used for wipe transitions where content is progressively revealed.
 *
 * Outputs: RenderTree with masked content.
 */

import type { BlockCompiler, RuntimeCtx } from '../../types';
import type { DrawNode } from '../../../runtime/renderTree';
import { group } from '../../../runtime/renderTree';

type WipeDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' | 'radial';

export const MaskRevealBlock: BlockCompiler = {
  type: 'MaskReveal',
  inputs: [
    { name: 'content', type: { kind: 'RenderTree' }, required: true },
    { name: 'progress', type: { kind: 'Signal:Unit' }, required: true },
  ],
  outputs: [{ name: 'tree', type: { kind: 'RenderTree' } }],

  compile({ inputs, params, id }) {
    const direction = (params.direction as WipeDirection) ?? 'left-to-right';
    const softEdge = Number(params.softEdge ?? 20);
    const sceneWidth = Number(params.sceneWidth ?? 800);
    const sceneHeight = Number(params.sceneHeight ?? 600);

    // Get content and progress from inputs
    const contentTree = inputs.content?.kind === 'RenderTree' ? inputs.content.value : null;
    const progressSignal = inputs.progress?.kind === 'Signal:Unit' ? inputs.progress.value : null;

    const signal = (tMs: number, rt: RuntimeCtx): DrawNode => {
      const progress = progressSignal ? (progressSignal as (t: number, ctx: RuntimeCtx) => number)(tMs, rt) : 0;

      // Calculate mask position based on direction and progress
      let maskX = 0, maskY = 0, maskWidth = sceneWidth, maskHeight = sceneHeight;

      switch (direction) {
        case 'left-to-right':
          maskWidth = progress * sceneWidth;
          break;
        case 'right-to-left':
          maskX = (1 - progress) * sceneWidth;
          maskWidth = progress * sceneWidth;
          break;
        case 'top-to-bottom':
          maskHeight = progress * sceneHeight;
          break;
        case 'bottom-to-top':
          maskY = (1 - progress) * sceneHeight;
          maskHeight = progress * sceneHeight;
          break;
        case 'radial':
          // Radial mask would need circle clip-path
          break;
      }

      // Create mask rect node
      const maskNode: DrawNode = {
        kind: 'shape',
        id: `mask-${id}`,
        geom: {
          kind: 'rect',
          x: maskX,
          y: maskY,
          width: maskWidth,
          height: maskHeight,
        },
        style: {
          fill: '#ffffff',
        },
      };

      // Get content nodes
      const contentNodes = contentTree
        ? [(contentTree as (t: number, ctx: RuntimeCtx) => DrawNode)(tMs, rt)]
        : [];

      return group(`mask-reveal-${id}`, [
        ...contentNodes,
        // Mask would be applied via SVG clipPath in renderer
        maskNode,
      ]);
    };

    return {
      tree: {
        kind: 'RenderTree',
        value: signal,
      },
    };
  },
};
