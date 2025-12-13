/**
 * V4 Particles Animation - Render Functions
 *
 * Converts ParticleState to RenderTree nodes.
 * Based on ui_example_docs/particle.md
 */

import type { Vec2 } from '../../core/types';
import type { CircleNode, FilterDef } from '../../render/tree';
import { circle, glowFilter } from '../../render/tree';
import type { Color, ParticleState } from './types';

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Convert Color type to CSS color string.
 */
export function colorToCSS(color: Color): string {
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

/**
 * Convert hex color to Color type.
 */
export function hexToColor(hex: string): Color {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Convert to HSL for consistency
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      case bn:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }

  return {
    kind: 'hsl',
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// =============================================================================
// Render Particle
// =============================================================================

export type RenderParticleInput = {
  readonly id: string;
  readonly state: ParticleState;
  readonly glowRadius?: number;
};

/**
 * Render a single particle as a CircleNode.
 */
export function renderParticle(input: RenderParticleInput): CircleNode {
  const { id, state, glowRadius } = input;

  const filterRef = glowRadius && glowRadius > 0 ? `url(#particle-glow)` : undefined;

  return circle(id, state.position.x, state.position.y, state.radius, {
    fill: colorToCSS(state.color),
    opacity: state.opacity,
    filter: filterRef,
  });
}

// =============================================================================
// Glow Filter Generation
// =============================================================================

/**
 * Generate a shared glow filter for particles.
 */
export function generateParticleGlowFilter(radius: number = 8): FilterDef {
  return glowFilter('particle-glow', radius);
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
 * Ease in cubic: accelerates from start.
 */
export function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Smoothstep: smooth S-curve.
 */
export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
