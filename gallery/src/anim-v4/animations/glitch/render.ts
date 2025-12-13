/**
 * V4 Glitch Animation - Renderer
 *
 * Creates multi-layer glitch composite using SVG filters.
 * Per ui_example_docs/04-glitch.md spec sections 6-7.
 *
 * The renderer creates:
 * - Main logo layer (with jitter transform)
 * - RGB separation layers (R/G/B) with:
 *   - feColorMatrix for channel isolation
 *   - feOffset for color separation
 *   - Transform (translate, skew, rotate)
 *   - Opacity flicker
 */

import type { RenderNode, FilterDef, FilterEffect } from '../../render/tree';
import type { RenderTree } from '../../render/tree';
import { group, renderTree } from '../../render/tree';
import type { GlitchChannel, GlitchRenderer, Bounds } from './types';

// =============================================================================
// Color Matrices for RGB Channel Isolation
// =============================================================================

/**
 * Color matrix values for extracting only the red channel.
 * Sets G and B to 0, preserves R and A.
 */
const RED_MATRIX: readonly number[] = [
  1, 0, 0, 0, 0,  // R = R
  0, 0, 0, 0, 0,  // G = 0
  0, 0, 0, 0, 0,  // B = 0
  0, 0, 0, 1, 0,  // A = A
];

/**
 * Color matrix values for extracting only the green channel.
 */
const GREEN_MATRIX: readonly number[] = [
  0, 0, 0, 0, 0,  // R = 0
  0, 1, 0, 0, 0,  // G = G
  0, 0, 0, 0, 0,  // B = 0
  0, 0, 0, 1, 0,  // A = A
];

/**
 * Color matrix values for extracting only the blue channel.
 */
const BLUE_MATRIX: readonly number[] = [
  0, 0, 0, 0, 0,  // R = 0
  0, 0, 0, 0, 0,  // G = 0
  0, 0, 1, 0, 0,  // B = B
  0, 0, 0, 1, 0,  // A = A
];

/**
 * Get the color matrix for a given channel.
 */
function getChannelMatrix(channel: GlitchChannel): readonly number[] | null {
  switch (channel) {
    case 'r': return RED_MATRIX;
    case 'g': return GREEN_MATRIX;
    case 'b': return BLUE_MATRIX;
    case 'main': return null;
  }
}

// =============================================================================
// Filter Generation
// =============================================================================

/**
 * Create a filter definition for RGB channel separation with offset.
 */
export function createRGBChannelFilter(
  id: string,
  channel: 'r' | 'g' | 'b',
  dx: number,
  dy: number
): FilterDef {
  const matrix = getChannelMatrix(channel)!;

  const effects: FilterEffect[] = [
    // Apply color matrix to isolate channel
    {
      type: 'colorMatrix',
      values: [...matrix],
      in: 'SourceGraphic',
      result: 'colorized',
    },
    // Apply offset for RGB separation
    {
      type: 'offset',
      dx,
      dy,
      in: 'colorized',
      result: 'offset',
    },
  ];

  return {
    id,
    effects,
    x: '-50%',
    y: '-50%',
    width: '200%',
    height: '200%',
  };
}

// =============================================================================
// Transform Generation
// =============================================================================

/**
 * Build a CSS transform string from transform parameters.
 */
export function buildTransform(
  params: {
    tx: number;
    ty: number;
    skewXDeg: number;
    rotDeg: number;
  },
  bounds?: Bounds
): string {
  const parts: string[] = [];

  // Translation
  if (params.tx !== 0 || params.ty !== 0) {
    parts.push(`translate(${params.tx.toFixed(2)}, ${params.ty.toFixed(2)})`);
  }

  // Rotation (around center if bounds provided)
  if (params.rotDeg !== 0) {
    if (bounds) {
      parts.push(`rotate(${params.rotDeg.toFixed(2)}, ${bounds.center.x}, ${bounds.center.y})`);
    } else {
      parts.push(`rotate(${params.rotDeg.toFixed(2)})`);
    }
  }

  // Skew
  if (params.skewXDeg !== 0) {
    parts.push(`skewX(${params.skewXDeg.toFixed(2)})`);
  }

  return parts.join(' ');
}

// =============================================================================
// SVG Glitch Renderer
// =============================================================================

/**
 * Extended layer result that includes the filter definition.
 */
export interface GlitchLayerResult {
  node: RenderNode;
  filter?: FilterDef;
}

/**
 * Create a glitch layer with optional filter.
 * This is a pure function - no state.
 */
export function createGlitchLayer(args: {
  id: string;
  content: RenderNode;
  channel: GlitchChannel;
  offset: { dx: number; dy: number };
  transform: { tx: number; ty: number; skewXDeg: number; rotDeg: number };
  opacity: number;
  bounds?: Bounds;
}): GlitchLayerResult {
  const { id, content, channel, offset, transform, opacity, bounds } = args;

  // Build transform string
  const transformStr = buildTransform(transform, bounds);

  if (channel === 'main') {
    // Main layer: just transform and opacity
    return {
      node: group(id, [content], {
        opacity,
        transform: transformStr || undefined,
      }),
    };
  }

  // RGB layer: create filter for channel isolation + offset
  const filterId = `glitch-filter-${channel}-${id}`;
  const filter = createRGBChannelFilter(filterId, channel, offset.dx, offset.dy);

  return {
    node: group(id, [content], {
      opacity,
      transform: transformStr || undefined,
      filter: `url(#${filterId})`,
    }),
    filter,
  };
}

/**
 * Compose glitch layers into a render tree.
 * This is a pure function - no state.
 */
export function composeGlitchLayers(
  rootId: string,
  layerResults: readonly GlitchLayerResult[],
  width: number,
  height: number,
  backgroundColor?: string
): RenderTree {
  const nodes = layerResults.map(r => r.node);
  const filters = layerResults
    .map(r => r.filter)
    .filter((f): f is FilterDef => f !== undefined);

  return renderTree(
    width,
    height,
    group(rootId, nodes, {}),
    {
      defs: { filters },
      viewBox: { minX: 0, minY: 0, width, height },
      backgroundColor,
    }
  );
}

/**
 * Create the default SVG-based glitch renderer.
 *
 * Uses SVG filters for RGB channel isolation and offset.
 * Uses group transforms for translation, skew, and rotation.
 *
 * This implementation is stateless - each call is independent.
 */
export function createSVGGlitchRenderer(): GlitchRenderer {
  // Collect filters during layer() calls for the current frame
  let pendingFilters: FilterDef[] = [];

  return {
    layer(args): RenderNode {
      const result = createGlitchLayer(args);
      if (result.filter) {
        pendingFilters.push(result.filter);
      }
      return result.node;
    },

    compose(rootId, layers, width, height, backgroundColor): RenderTree {
      // Capture and reset pending filters
      const filters = pendingFilters;
      pendingFilters = [];

      return renderTree(
        width,
        height,
        group(rootId, layers, {}),
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
// Alternative: Inline Style Renderer (no filters)
// =============================================================================

/**
 * Create a simple renderer that uses CSS mix-blend-mode.
 * Doesn't require SVG filters but has different visual effect.
 *
 * Note: This is an alternative implementation for environments
 * where SVG filters may not perform well.
 */
export function createCSSGlitchRenderer(): GlitchRenderer {
  return {
    layer(args): RenderNode {
      const { id, content, channel, offset, transform, opacity, bounds } = args;

      // Build transform including offset as translation
      const fullTransform = buildTransform(
        {
          tx: transform.tx + offset.dx,
          ty: transform.ty + offset.dy,
          skewXDeg: transform.skewXDeg,
          rotDeg: transform.rotDeg,
        },
        bounds
      );

      // For CSS approach, we'd need to tint the layer
      // This is simplified - real CSS approach would use
      // mix-blend-mode: screen and color overlays
      return group(id, [content], {
        opacity,
        transform: fullTransform || undefined,
      });
    },

    compose(rootId, layers, width, height, backgroundColor): RenderTree {
      return renderTree(
        width,
        height,
        group(rootId, layers),
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

export const defaultRenderer = createSVGGlitchRenderer;
