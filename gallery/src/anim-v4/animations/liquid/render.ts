/**
 * V4 Liquid Animation - Renderer
 *
 * Creates liquid blob composite using SVG goo filter.
 * Per ui_example_docs/05-liquid.md spec section 5.
 *
 * The renderer creates:
 * - Blob circles with position, radius, color, opacity
 * - Goo filter using blur + contrast for metaball effect
 * - Composed render tree with filter defs
 */

import type { Vec2 } from '../../core/types';
import type { RenderNode, FilterDef, FilterEffect, Color } from '../../render/tree';
import type { RenderTree } from '../../render/tree';
import { circle, group, renderTree } from '../../render/tree';
import type { LiquidRenderer, GooParams, ExitPolicy } from './types';

// =============================================================================
// Goo Filter Generation
// =============================================================================

/**
 * Create a goo/metaball filter definition.
 *
 * The goo effect uses:
 * 1. Gaussian blur to soften edges
 * 2. Color matrix to increase contrast (threshold effect)
 *
 * This makes overlapping circles merge into blob shapes.
 */
export function createGooFilter(
  id: string,
  params: GooParams
): FilterDef {
  const { blurPx, threshold } = params;

  // Contrast multiplier based on threshold
  // Higher threshold = more contrast = sharper blob edges
  // Formula: contrast = 1 / (1 - threshold) roughly
  const contrast = Math.max(10, Math.round(20 * (1 - threshold) + 10));

  // Color matrix for contrast/threshold effect
  // This makes semi-transparent areas either fully opaque or transparent
  const matrix: readonly number[] = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, contrast, -contrast * threshold,
  ];

  const effects: FilterEffect[] = [
    // Step 1: Blur to create soft edges
    {
      type: 'gaussianBlur',
      stdDeviation: blurPx,
      in: 'SourceGraphic',
      result: 'blur',
    },
    // Step 2: Contrast to create sharp blob edges
    {
      type: 'colorMatrix',
      values: [...matrix],
      in: 'blur',
      result: 'goo',
    },
  ];

  // Add glow if specified
  if (params.glowPx && params.glowPx > 0) {
    effects.push(
      {
        type: 'gaussianBlur',
        stdDeviation: params.glowPx,
        in: 'goo',
        result: 'glow',
      },
      {
        type: 'merge',
        nodes: ['glow', 'goo'],
      }
    );
  }

  return {
    id,
    effects,
    // Extend filter region to accommodate blur
    x: '-50%',
    y: '-50%',
    width: '200%',
    height: '200%',
  };
}

// =============================================================================
// Blob Creation
// =============================================================================

/**
 * Create a blob (circle) node.
 */
export function createBlob(args: {
  id: string;
  position: Vec2;
  radius: number;
  color: Color;
  opacity: number;
}): RenderNode {
  const { id, position, radius, color, opacity } = args;

  return circle(id, position.x, position.y, radius, {
    fill: color,
    opacity,
  });
}

// =============================================================================
// Goo Layer Creation
// =============================================================================

/**
 * Wrap blobs in a group with goo filter applied.
 */
export function createGooLayer(args: {
  id: string;
  blobs: readonly RenderNode[];
  goo: GooParams;
  exit?: ExitPolicy;
}): { node: RenderNode; filter: FilterDef } {
  const { id, blobs, goo, exit } = args;

  const filterId = `goo-filter-${id}`;
  const filter = createGooFilter(filterId, goo);

  // Apply exit policy if present
  let groupOpacity = goo.alpha ?? 1;
  let transform: string | undefined;

  if (exit) {
    if (exit.opacityMul !== undefined) {
      groupOpacity *= exit.opacityMul;
    }
    if (exit.scaleMul !== undefined && exit.scaleMul !== 1) {
      // Scale from center - we'd need bounds info for proper centering
      transform = `scale(${exit.scaleMul})`;
    }
  }

  const node = group(id, blobs, {
    filter: `url(#${filterId})`,
    opacity: groupOpacity,
    transform,
  });

  return { node, filter };
}

// =============================================================================
// SVG Liquid Renderer
// =============================================================================

/**
 * Create the default SVG-based liquid renderer.
 *
 * Uses SVG filter (blur + color matrix) for goo/metaball effect.
 * This is the most compatible approach across browsers.
 */
export function createSVGLiquidRenderer(): LiquidRenderer {
  // Collect filters during gooLayer() calls for the current frame
  let pendingFilters: FilterDef[] = [];

  return {
    blob(args): RenderNode {
      return createBlob(args);
    },

    gooLayer(args): RenderNode {
      const result = createGooLayer(args);
      pendingFilters.push(result.filter);
      return result.node;
    },

    compose(rootId, node, width, height, backgroundColor): RenderTree {
      // Capture and reset pending filters
      const filters = pendingFilters;
      pendingFilters = [];

      return renderTree(
        width,
        height,
        group(rootId, [node], {}),
        {
          defs: { filters },
          viewBox: { minX: 0, minY: 0, width, height },
          backgroundColor,
        }
      );
    },
  };
}

// =============================================================================
// Alternative: Canvas-style Renderer (no filters)
// =============================================================================

/**
 * Create a simple renderer without goo filter.
 * Useful for debugging or environments where SVG filters are slow.
 */
export function createSimpleLiquidRenderer(): LiquidRenderer {
  return {
    blob(args): RenderNode {
      return createBlob(args);
    },

    gooLayer(args): RenderNode {
      const { id, blobs, exit } = args;

      let groupOpacity = 1;
      let transform: string | undefined;

      if (exit) {
        if (exit.opacityMul !== undefined) {
          groupOpacity = exit.opacityMul;
        }
        if (exit.scaleMul !== undefined && exit.scaleMul !== 1) {
          transform = `scale(${exit.scaleMul})`;
        }
      }

      return group(id, blobs, {
        opacity: groupOpacity,
        transform,
      });
    },

    compose(rootId, node, width, height, backgroundColor): RenderTree {
      return renderTree(
        width,
        height,
        group(rootId, [node], {}),
        {
          viewBox: { minX: 0, minY: 0, width, height },
          backgroundColor,
        }
      );
    },
  };
}

// =============================================================================
// Default Export
// =============================================================================

export const defaultRenderer = createSVGLiquidRenderer;
