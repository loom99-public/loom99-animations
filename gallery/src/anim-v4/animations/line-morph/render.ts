/**
 * V4 LineMorph Animation - Render Functions
 *
 * Render functions that convert MorphState to RenderTree nodes.
 * Based on ui_example_docs/line-morph/impl.md
 */

import type { Vec2 } from '../../core/types';
import type { PathNode, FilterDef } from '../../render/tree';
import { path, glowFilter } from '../../render/tree';
import type { StrokeDef, Color } from './types';
import {
  computeStrokeSegments,
  buildInterpolatedGeom,
  geomToPathD,
  geometryCache,
  type StrokeSegments,
} from './geometry';

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Convert Color type to CSS color string.
 */
function colorToCSS(color: Color): string {
  if (color.kind === 'rgb') {
    const a = color.a ?? 1;
    return a < 1
      ? `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`
      : `rgb(${color.r}, ${color.g}, ${color.b})`;
  } else {
    const a = color.a ?? 1;
    return a < 1
      ? `hsla(${color.h}, ${color.s}%, ${color.l}%, ${a})`
      : `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
  }
}

// =============================================================================
// Render Morph Stroke
// =============================================================================

export type RenderMorphStrokeInput = {
  readonly id: string;
  readonly stroke: StrokeDef;
  readonly tail: Vec2;
  readonly morph: number;
  readonly style: {
    readonly stroke: Color;
    readonly strokeWidth: number;
    readonly opacity: number;
    readonly glowRadius: number;
  };
};

/**
 * Render a single morphing stroke as a PathNode.
 *
 * This function:
 * 1. Gets/computes cached stroke segments
 * 2. Builds interpolated geometry based on morph progress
 * 3. Generates SVG path data
 * 4. Returns a PathNode with styling
 */
export function renderMorphStroke(input: RenderMorphStrokeInput): PathNode {
  const { id, stroke, tail, morph, style } = input;

  // Get cached stroke segments (expensive computation, done once)
  const segments = geometryCache.get<StrokeSegments>(
    { kind: 'StrokeSegments', strokeId: stroke.id },
    () => computeStrokeSegments(stroke.finalPoints)
  );

  // Build interpolated geometry
  // Origin for straight line is computed backwards from tail position
  // When morph=0, tail=origin; when morph=1, tail=p0
  // So: origin = tail when morph=0, origin needs to be back-computed
  // Actually per impl.md: tail = lerp(origin, p0, morph)
  // So when morph=0, tail=origin
  // We don't need to compute origin here - we just use the current tail

  // The geometry interpolation uses the stroke's p0 (first point of final path)
  // as the "straight line target" endpoint, and origin as start
  // At morph=0, geometry is straight from origin to final endpoint
  // At morph=1, geometry is the final curved path

  // Since we already have tail (which is lerp(origin, p0, morph)),
  // we use it directly in the path rendering
  const geom = buildInterpolatedGeom(segments, tail, morph);

  // Generate SVG path data
  const d = geomToPathD(geom, tail, stroke.finalPoints);

  // Create filter reference if glow is enabled
  const filterRef = style.glowRadius > 0 ? `url(#glow-${id})` : undefined;

  return path(id, d, {
    stroke: colorToCSS(style.stroke),
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    filter: filterRef,
  });
}

// =============================================================================
// Glow Filter Generation
// =============================================================================

/**
 * Generate glow filter definitions for strokes.
 */
export function generateGlowFilters(
  strokeIds: readonly string[],
  glowRadii: readonly number[]
): readonly FilterDef[] {
  const filters: FilterDef[] = [];

  for (let i = 0; i < strokeIds.length; i++) {
    const id = strokeIds[i];
    const radius = glowRadii[i];

    if (radius > 0) {
      filters.push(glowFilter(`glow-${id}`, radius));
    }
  }

  return filters;
}

// =============================================================================
// Easing Functions
// =============================================================================

/**
 * Ease out cubic: decelerates towards end.
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease out quart: faster deceleration.
 */
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Smoothstep: smooth S-curve.
 */
export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
