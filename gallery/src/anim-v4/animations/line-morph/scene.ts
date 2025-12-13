/**
 * V4 LineMorph Animation - Scene Data
 *
 * Derives LineScene from LOGO_PATHS and TEXT_PATHS in pathData.ts
 */

import type { Vec2, HSL } from '../../core/types';
import type { LineScene, StrokeDef, PathPoint } from './types';
import { LOGO_PATHS, TEXT_PATHS, type LineData } from '../../../data/pathData';

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Convert hex color to HSL.
 */
function hexToHSL(hex: string): HSL {
  // Remove # if present
  hex = hex.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// =============================================================================
// Path Conversion
// =============================================================================

/**
 * Convert LineData points to V4 PathPoint format.
 */
function convertPoints(
  points: LineData['points']
): readonly PathPoint[] {
  return points.map((p) => ({
    x: p.x,
    y: p.y,
    type: p.type,
    cx: p.cx,
    cy: p.cy,
    rx: p.rx,
    ry: p.ry,
    rotation: p.rotation,
    largeArc: p.largeArc === 1,
    sweep: p.sweep === 1,
  }));
}

/**
 * Convert LineData to StrokeDef.
 */
function lineDataToStrokeDef(line: LineData, index: number, prefix: string): StrokeDef {
  const points = convertPoints(line.points);
  const p0: Vec2 = points.length > 0
    ? { x: points[0].x, y: points[0].y }
    : { x: 0, y: 0 };

  return {
    id: `${prefix}-stroke-${index}`,
    finalPoints: points,
    p0,
    baseColor: hexToHSL(line.color),
    strokeWidth: 12,
  };
}

// =============================================================================
// Scene Creation
// =============================================================================

/**
 * Create a LineScene from an array of LineData.
 */
function createScene(
  paths: LineData[],
  sceneId: string,
  strokePrefix: string
): LineScene {
  return {
    id: sceneId,
    strokes: paths.map((line, index) => lineDataToStrokeDef(line, index, strokePrefix)),
  };
}

// =============================================================================
// Pre-built Scenes
// =============================================================================

/**
 * Logo scene - "loom99" logo (6 strokes)
 */
export const LOGO_SCENE: LineScene = createScene(LOGO_PATHS, 'logo-01', 'logo');

/**
 * Text scene - "DO MORE NOW" text (27 strokes)
 */
export const TEXT_SCENE: LineScene = createScene(TEXT_PATHS, 'text-01', 'text');

// =============================================================================
// Original Origins (for "original" variant matching HTML exactly)
// =============================================================================

/**
 * Get original start positions from path data.
 * Used for "original" mode that matches HTML exactly.
 */
function getOriginalOrigins(paths: LineData[]): readonly Vec2[] {
  return paths.map((line) => ({
    x: line.startX,
    y: line.startY,
  }));
}

/**
 * Original origins for logo scene.
 */
export const LOGO_ORIGINS: readonly Vec2[] = getOriginalOrigins(LOGO_PATHS);

/**
 * Original origins for text scene.
 */
export const TEXT_ORIGINS: readonly Vec2[] = getOriginalOrigins(TEXT_PATHS);

// =============================================================================
// Original Timing (for "original" variant)
// =============================================================================

export type OriginalTiming = {
  readonly delays: readonly number[];
  readonly duration: number;
};

/**
 * Get original timing from path data.
 */
function getOriginalTiming(paths: LineData[]): OriginalTiming {
  return {
    delays: paths.map((line) => line.delay / 1000), // Convert ms to seconds
    duration: paths[0]?.duration ? paths[0].duration / 1000 : 0.4,
  };
}

/**
 * Original timing for logo scene.
 */
export const LOGO_TIMING: OriginalTiming = getOriginalTiming(LOGO_PATHS);

/**
 * Original timing for text scene.
 */
export const TEXT_TIMING: OriginalTiming = getOriginalTiming(TEXT_PATHS);

// =============================================================================
// Scene Lookup
// =============================================================================

/**
 * Get scene by target type.
 */
export function getScene(target: 'logo' | 'text'): LineScene {
  return target === 'logo' ? LOGO_SCENE : TEXT_SCENE;
}

/**
 * Get original origins by target type.
 */
export function getOriginalOriginsForTarget(target: 'logo' | 'text'): readonly Vec2[] {
  return target === 'logo' ? LOGO_ORIGINS : TEXT_ORIGINS;
}

/**
 * Get original timing by target type.
 */
export function getOriginalTimingForTarget(target: 'logo' | 'text'): OriginalTiming {
  return target === 'logo' ? LOGO_TIMING : TEXT_TIMING;
}
