/**
 * V4 Kinetic Animation - Renderer
 *
 * Per ui_example_docs/06-kinetic.md spec section 5.
 *
 * Renderer responsibilities:
 * - Apply 2D transforms (translate, rotate, scale) to parts
 * - Apply opacity
 * - Compose all parts into final render tree
 */

import type { RenderNode, RenderTree, Color, GroupNode, Style } from '../../render/tree';
import { group, renderTree } from '../../render/tree';
import type { KineticRenderer, Transform2D } from './types';

// =============================================================================
// Transform Helpers
// =============================================================================

/**
 * Build a CSS transform string from Transform2D.
 * Order: translate(origin) * rotate * scale * translate(-origin) * translate(offset)
 *
 * This is equivalent to:
 * 1. Move origin to (0,0)
 * 2. Apply scale
 * 3. Apply rotation
 * 4. Move origin back
 * 5. Apply translation offset
 */
function buildTransformString(t: Transform2D): string {
  const { translate, rotateDeg, scale, origin } = t;

  // If all values are identity, return empty string
  if (
    Math.abs(translate.x) < 0.001 &&
    Math.abs(translate.y) < 0.001 &&
    Math.abs(rotateDeg) < 0.001 &&
    Math.abs(scale - 1) < 0.001
  ) {
    return '';
  }

  // Build transform around origin
  // translate(origin) rotate scale translate(-origin) translate(offset)
  const parts: string[] = [];

  // First translate by offset
  if (Math.abs(translate.x) > 0.001 || Math.abs(translate.y) > 0.001) {
    parts.push(`translate(${translate.x.toFixed(2)}, ${translate.y.toFixed(2)})`);
  }

  // Then apply transform around origin
  // Move to origin
  parts.push(`translate(${origin.x.toFixed(2)}, ${origin.y.toFixed(2)})`);

  // Apply rotation
  if (Math.abs(rotateDeg) > 0.001) {
    parts.push(`rotate(${rotateDeg.toFixed(2)})`);
  }

  // Apply scale
  if (Math.abs(scale - 1) > 0.001) {
    parts.push(`scale(${scale.toFixed(4)})`);
  }

  // Move back from origin
  parts.push(`translate(${(-origin.x).toFixed(2)}, ${(-origin.y).toFixed(2)})`);

  return parts.join(' ');
}

/**
 * Apply a style update to a node, preserving existing styles.
 */
function applyStyle(node: RenderNode, styleUpdate: Partial<Style>): RenderNode {
  return {
    ...node,
    style: {
      ...node.style,
      ...styleUpdate,
    },
  };
}

/**
 * Deep clone a render node, applying transform and opacity.
 */
function cloneNodeWithTransform(
  node: RenderNode,
  transform: string,
  opacity: number,
  colorOverride?: Color
): RenderNode {
  // Build style object with all overrides at once
  const styleOverrides: Style = {
    ...node.style,
    ...(transform ? { transform } : {}),
    ...(opacity < 1 ? { opacity } : {}),
    ...(colorOverride ? { fill: colorOverride } : {}),
  };

  // For groups, we want to apply transform to the group itself
  if (node.type === 'group') {
    return {
      ...node,
      style: styleOverrides,
    };
  }

  // For filter nodes, apply to the filter wrapper
  if (node.type === 'filter') {
    return {
      ...node,
      style: styleOverrides,
    };
  }

  // For leaf nodes, apply directly
  return {
    ...node,
    style: styleOverrides,
  };
}

// =============================================================================
// SVG Kinetic Renderer
// =============================================================================

/**
 * Create an SVG renderer for kinetic animations.
 */
export function createSVGKineticRenderer(): KineticRenderer {
  return {
    part(args) {
      const { id, content, transform, opacity, colorOverride } = args;

      // Build CSS transform string
      const transformStr = buildTransformString(transform);

      // Clone the content node with transform and opacity applied
      const transformedContent = cloneNodeWithTransform(
        content,
        transformStr,
        opacity,
        colorOverride
      );

      // Wrap in a group for stable ID
      return group(`part-${id}`, [transformedContent], {
        transform: transformStr || undefined,
        opacity: opacity < 1 ? opacity : undefined,
      });
    },

    compose(rootId, nodes, width, height, backgroundColor) {
      // Create root group containing all parts
      const root = group(rootId, nodes);

      return renderTree(width, height, root, {
        backgroundColor,
        viewBox: {
          minX: 0,
          minY: 0,
          width,
          height,
        },
      });
    },
  };
}

// =============================================================================
// Alternative Renderers (for future use)
// =============================================================================

/**
 * Create a Canvas-compatible kinetic renderer.
 * Returns the same RenderTree structure, which can be interpreted by a Canvas backend.
 */
export function createCanvasKineticRenderer(): KineticRenderer {
  // Canvas renderer uses the same structure; the difference is in interpretation
  return createSVGKineticRenderer();
}
