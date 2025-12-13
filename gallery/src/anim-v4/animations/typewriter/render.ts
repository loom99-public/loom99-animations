/**
 * V4 Typewriter Animation - Renderer
 *
 * Renders typewriter state to RenderTree.
 * Handles text characters and optional caret.
 */

import type { RenderTree, RenderNode } from '../../render/tree';
import { text, rect, group, renderTree } from '../../render/tree';
import type {
  TypewriterScene,
  TypewriterParams,
  TypewriterState,
  TypewriterRenderInput,
  Color,
} from './types';
import type { HSL } from '../../core/types';
import { createPRNG } from '../../core/rand';

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Convert Color type to CSS string.
 */
function colorToCSS(color: Color): string {
  if (typeof color === 'string') return color;

  // Handle HSL color objects
  if ('h' in color) {
    const hsl = color as HSL;
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  }

  // Fallback
  return '#ffffff';
}

// =============================================================================
// Renderer
// =============================================================================

/**
 * Create typewriter renderer.
 *
 * Renders visible characters as TextNode elements and optional caret as RectNode.
 */
export function createTypewriterRenderer() {
  return {
    render(input: TypewriterRenderInput): RenderTree {
      const { scene, params, state, viewport } = input;
      const { layout } = scene;

      // Build character nodes
      const charNodes: RenderNode[] = [];
      let xOffset = layout.origin.x;

      // Render visible characters
      for (let i = 0; i < state.visibleCount; i++) {
        const char = params.tokens[i] ?? '';

        // Skip spaces (just advance position)
        if (char === ' ') {
          xOffset += layout.fontSizePx * 0.3;
          continue;
        }

        // Per-char alpha
        const alpha = state.perCharAlpha ? state.perCharAlpha(i) : 1;
        const finalOpacity = state.opacity * alpha;

        // Per-char jitter (applied once when char appears)
        // Use deterministic jitter based on character index
        const jitterMax = params.perCharJitters[i] ?? 0;
        let jitterX = 0;
        let jitterY = 0;
        if (jitterMax > 0) {
          const rng = createPRNG(i * 9973); // Deterministic per char
          jitterX = (rng.next() - 0.5) * jitterMax;
          jitterY = (rng.next() - 0.5) * jitterMax;
        }

        // Color
        const color = params.colors[i] ?? '#ffffff';
        const colorCSS = colorToCSS(color);

        charNodes.push(
          text(
            `char-${i}`,
            xOffset + jitterX,
            layout.origin.y + jitterY,
            char,
            {
              fill: colorCSS,
              opacity: finalOpacity,
            },
            {
              fontSize: layout.fontSizePx,
              fontFamily: layout.fontFamily,
              textAnchor: 'start',
              dominantBaseline: 'alphabetic',
            }
          )
        );

        // Advance x for next char
        const spacing = layout.letterSpacingPx ?? 0;
        xOffset += layout.fontSizePx * 0.6 + spacing; // Simplified advance
      }

      // Add caret if needed
      if (state.caret && state.caret.visible) {
        const caretX = xOffset;
        const caretY = layout.origin.y - layout.fontSizePx * 0.8;
        const caretColor = colorToCSS(state.caret.color);

        charNodes.push(
          rect(
            'caret',
            caretX,
            caretY,
            state.caret.widthPx,
            state.caret.heightPx,
            {
              fill: caretColor,
              opacity: state.opacity,
            }
          )
        );
      }

      // Compose tree
      return renderTree(
        viewport.width,
        viewport.height,
        group(scene.id, charNodes),
        {
          backgroundColor: '#0a0a0f',
        }
      );
    },
  };
}
