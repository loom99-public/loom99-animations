/**
 * RGBSplitFilter Block Compiler
 *
 * Creates RGB channel separation filter for glitch effects.
 * Splits color channels with offset for chromatic aberration.
 *
 * Outputs: FilterDef for SVG rendering.
 */

import type { BlockCompiler } from '../../types';

interface RGBSplitConfig {
  id: string;
  redOffsetX: number;
  redOffsetY: number;
  greenOffsetX: number;
  greenOffsetY: number;
  blueOffsetX: number;
  blueOffsetY: number;
}

export const RGBSplitFilterBlock: BlockCompiler = {
  type: 'RGBSplitFilter',
  inputs: [],
  outputs: [{ name: 'filter', type: { kind: 'FilterDef' } }],

  compile({ params, id }) {
    const config: RGBSplitConfig = {
      id: `rgb-split-${id}`,
      redOffsetX: Number(params.redOffsetX ?? 3),
      redOffsetY: Number(params.redOffsetY ?? 0),
      greenOffsetX: Number(params.greenOffsetX ?? 0),
      greenOffsetY: Number(params.greenOffsetY ?? 0),
      blueOffsetX: Number(params.blueOffsetX ?? -3),
      blueOffsetY: Number(params.blueOffsetY ?? 0),
    };

    return {
      filter: {
        kind: 'FilterDef' as const,
        value: {
          type: 'rgbSplit',
          ...config,
        },
      },
    };
  },
};
