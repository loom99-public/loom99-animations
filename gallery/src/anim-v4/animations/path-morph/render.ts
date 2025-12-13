/**
 * V4 Path Morph Animation - Render Functions
 *
 * Renders morphing paths as RenderTree nodes.
 */

import type { PathNode, FilterDef, FilterEffect } from '../../render/tree';
import { path as pathNode } from '../../render/tree';
import type { Color, Style, StartShapeSpec } from './types';
import { interpolateMorph } from './geometry';

// =============================================================================
// Color Conversion
// =============================================================================

export function colorToString(color: Color): string {
  if (color.kind === 'hex') {
    return color.value;
  }
  return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
}

export function hexToColor(hex: string): Color {
  return { kind: 'hex', value: hex };
}

// =============================================================================
// Easing Functions
// =============================================================================

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// =============================================================================
// Glow Filter
// =============================================================================

export function generatePathGlowFilter(glowRadius: number): FilterDef {
  return {
    id: 'path-glow',
    effects: [
      { type: 'gaussianBlur', stdDeviation: glowRadius / 2 } as FilterEffect,
    ],
  };
}

// =============================================================================
// Path Rendering
// =============================================================================

export interface RenderPathArgs {
  id: string;
  morph: number;
  targetD: string;
  start: StartShapeSpec;
  style: Style;
  exit?: { scale?: number; opacityMul?: number };
}

export function renderMorphPath(args: RenderPathArgs): PathNode {
  const { id, morph, targetD, start, style, exit } = args;

  // Interpolate path
  const d = interpolateMorph(start, targetD, id, morph);

  // Apply exit transform
  let opacity = style.opacity;
  if (exit?.opacityMul !== undefined) {
    opacity *= exit.opacityMul;
  }

  // Build style
  const strokeColor = colorToString(style.stroke);
  const fillColor = style.fill === 'none' || !style.fill
    ? 'none'
    : colorToString(style.fill);

  return pathNode(id, d, {
    stroke: strokeColor,
    strokeWidth: style.strokeWidth,
    fill: fillColor,
    opacity,
    strokeLinecap: style.lineCap ?? 'round',
    strokeLinejoin: style.lineJoin ?? 'round',
    filter: 'url(#path-glow)',
  });
}
