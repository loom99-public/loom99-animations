/**
 * V4 Transform3D - SVG Renderer
 *
 * Renders parts with 3D transforms projected to 2D SVG matrices.
 * Backend-neutral architecture via Transform3DRenderer interface.
 */

import { group as createGroup, renderTree } from '../../render/tree';
import type { Transform3DRenderer } from './types';
import { project3DTo2D, matrix2DToSVG } from './projection';

/**
 * Create an SVG-based Transform3D renderer.
 * Projects 3D transforms to 2D matrices for universal compatibility.
 */
export function createSVGTransform3DRenderer(): Transform3DRenderer {
  return {
    part({ id, content, transform3d, opacity }) {
      // Project 3D transform to 2D matrix
      const matrix2D = project3DTo2D(transform3d);
      const transformStr = matrix2DToSVG(matrix2D);

      // Apply transform and opacity to the content node
      const style = {
        ...content.style,
        transform: transformStr,
        opacity,
      };

      // Clone the content node with updated style
      return {
        ...content,
        id: `${id}-transformed`,
        style,
      };
    },

    compose(rootId, nodes, width, height) {
      // Wrap all nodes in a group
      const root = createGroup(rootId, nodes);

      return renderTree(width, height, root, {
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
