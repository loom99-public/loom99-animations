/**
 * V4 Liquid Animation - Scene Data
 *
 * Creates LiquidScene from logo/text path data.
 * Samples points along paths to create blob target positions.
 */

import type { Vec2 } from '../../core/types';
import type { LiquidScene, LiquidTarget, Bounds } from './types';
import { LOGO_PATHS, TEXT_PATHS, type PathPoint } from '../../../data/pathData';

// =============================================================================
// Path Sampling
// =============================================================================

/**
 * Sample points along a line segment.
 */
function sampleLine(
  start: Vec2,
  end: Vec2,
  spacing: number,
  color: string,
  groupId: number
): LiquidTarget[] {
  const targets: LiquidTarget[] = [];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const count = Math.max(1, Math.floor(length / spacing));

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    targets.push({
      p: {
        x: start.x + dx * t,
        y: start.y + dy * t,
      },
      r: 6,
      groupId,
    });
  }

  return targets;
}

/**
 * Sample points along a quadratic bezier curve.
 */
function sampleQuadratic(
  start: Vec2,
  control: Vec2,
  end: Vec2,
  spacing: number,
  groupId: number
): LiquidTarget[] {
  const targets: LiquidTarget[] = [];

  // Estimate curve length
  const d1 = Math.sqrt((control.x - start.x) ** 2 + (control.y - start.y) ** 2);
  const d2 = Math.sqrt((end.x - control.x) ** 2 + (end.y - control.y) ** 2);
  const approxLength = d1 + d2;
  const count = Math.max(2, Math.floor(approxLength / spacing));

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const oneMinusT = 1 - t;
    targets.push({
      p: {
        x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
        y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y,
      },
      r: 6,
      groupId,
    });
  }

  return targets;
}

/**
 * Sample points along an arc (approximated as segments).
 */
function sampleArc(
  start: Vec2,
  rx: number,
  ry: number,
  end: Vec2,
  spacing: number,
  groupId: number
): LiquidTarget[] {
  const targets: LiquidTarget[] = [];

  // Approximate arc as series of line segments
  // This is simplified - a proper implementation would use the arc equation
  const cx = (start.x + end.x) / 2;
  const cy = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const chord = Math.sqrt(dx * dx + dy * dy);

  // Estimate arc length as larger than chord
  const approxLength = chord * 1.5;
  const count = Math.max(3, Math.floor(approxLength / spacing));

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    // Simple parametric interpolation with arc bulge
    const bulge = Math.sin(t * Math.PI) * (rx + ry) * 0.3;
    const perpX = -dy / chord;
    const perpY = dx / chord;

    targets.push({
      p: {
        x: start.x + dx * t + perpX * bulge,
        y: start.y + dy * t + perpY * bulge,
      },
      r: 6,
      groupId,
    });
  }

  return targets;
}

/**
 * Sample points along a path defined by PathPoint[].
 */
function samplePath(
  startX: number,
  startY: number,
  points: PathPoint[],
  spacing: number,
  groupId: number
): LiquidTarget[] {
  if (points.length === 0) return [];

  const targets: LiquidTarget[] = [];
  let current: Vec2 = { x: points[0].x, y: points[0].y };

  // Add first point from path start
  targets.push({ p: current, r: 6, groupId });

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const next: Vec2 = { x: point.x, y: point.y };

    if (point.type === 'Q' && point.cx !== undefined && point.cy !== undefined) {
      // Quadratic bezier
      const control: Vec2 = { x: point.cx, y: point.cy };
      const sampled = sampleQuadratic(current, control, next, spacing, groupId);
      // Skip first point (duplicate of current)
      targets.push(...sampled.slice(1));
    } else if (point.type === 'A' && point.rx !== undefined && point.ry !== undefined) {
      // Arc
      const sampled = sampleArc(current, point.rx, point.ry, next, spacing, groupId);
      targets.push(...sampled.slice(1));
    } else {
      // Line segment
      const sampled = sampleLine(current, next, spacing, '', groupId);
      targets.push(...sampled.slice(1));
    }

    current = next;
  }

  return targets;
}

/**
 * Sample all paths in a path set.
 */
function sampleAllPaths(
  paths: typeof LOGO_PATHS,
  spacing: number = 15
): LiquidTarget[] {
  const targets: LiquidTarget[] = [];

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const sampled = samplePath(
      path.startX,
      path.startY,
      path.points,
      spacing,
      i
    );
    targets.push(...sampled);
  }

  return targets;
}

// =============================================================================
// Bounds Calculation
// =============================================================================

/**
 * Calculate bounds from targets.
 */
function calculateBounds(targets: readonly LiquidTarget[]): Bounds {
  if (targets.length === 0) {
    return { center: { x: 0, y: 0 }, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const target of targets) {
    minX = Math.min(minX, target.p.x);
    maxX = Math.max(maxX, target.p.x);
    minY = Math.min(minY, target.p.y);
    maxY = Math.max(maxY, target.p.y);
  }

  return {
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    },
    width: maxX - minX,
    height: maxY - minY,
  };
}

// =============================================================================
// Logo Scene
// =============================================================================

const LOGO_TARGETS = sampleAllPaths(LOGO_PATHS, 12);

export const LOGO_LIQUID_SCENE: LiquidScene = {
  id: 'logo-liquid',
  targets: LOGO_TARGETS,
  bounds: calculateBounds(LOGO_TARGETS),
};

// =============================================================================
// Text Scene
// =============================================================================

const TEXT_TARGETS = sampleAllPaths(TEXT_PATHS, 10);

export const TEXT_LIQUID_SCENE: LiquidScene = {
  id: 'text-liquid',
  targets: TEXT_TARGETS,
  bounds: calculateBounds(TEXT_TARGETS),
};

// =============================================================================
// Scene Accessors
// =============================================================================

export function getScene(target: 'logo' | 'text'): LiquidScene {
  return target === 'logo' ? LOGO_LIQUID_SCENE : TEXT_LIQUID_SCENE;
}

export function getViewport(target: 'logo' | 'text'): { w: number; h: number } {
  return target === 'logo'
    ? { w: 600, h: 200 }
    : { w: 400, h: 300 };
}

// =============================================================================
// Custom Scene Creation
// =============================================================================

/**
 * Create a scene from custom target points.
 */
export function createCustomScene(
  id: string,
  targets: readonly LiquidTarget[]
): LiquidScene {
  return {
    id,
    targets,
    bounds: calculateBounds(targets),
  };
}

/**
 * Create a grid of blob targets.
 */
export function createGridScene(
  id: string,
  cols: number,
  rows: number,
  spacing: number,
  offsetX: number = 50,
  offsetY: number = 50
): LiquidScene {
  const targets: LiquidTarget[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      targets.push({
        p: {
          x: offsetX + col * spacing,
          y: offsetY + row * spacing,
        },
        r: spacing * 0.3,
        groupId: row,
      });
    }
  }

  return {
    id,
    targets,
    bounds: calculateBounds(targets),
  };
}

/**
 * Create a circular arrangement of blob targets.
 */
export function createCircleScene(
  id: string,
  centerX: number,
  centerY: number,
  radius: number,
  count: number
): LiquidScene {
  const targets: LiquidTarget[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    targets.push({
      p: {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      },
      r: 8,
      groupId: 0,
    });
  }

  return {
    id,
    targets,
    bounds: calculateBounds(targets),
  };
}

/**
 * Create a test scene with a simple pattern.
 */
export function createTestScene(): LiquidScene {
  return createGridScene('test-liquid', 5, 3, 40, 100, 50);
}
