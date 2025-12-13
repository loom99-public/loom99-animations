/**
 * V4 Glitch Animation - Scene Data
 *
 * Creates GlitchScene from logo/text path data.
 * The scene contains a group of all paths as a single render node.
 */

import type { GlitchScene, Bounds } from './types';
import { group, path } from '../../render/tree';
import { LOGO_PATHS, TEXT_PATHS, pathPointsToSVGPath } from '../../../data/pathData';

// =============================================================================
// Logo Scene
// =============================================================================

export const LOGO_GLITCH_SCENE: GlitchScene = {
  id: 'logo-glitch',
  root: group(
    'logo-group',
    LOGO_PATHS.map((line, i) =>
      path(`logo-path-${i}`, pathPointsToSVGPath(line.points), {
        stroke: line.color,
        strokeWidth: 3,
        fill: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      })
    ),
    {}
  ),
  bounds: {
    center: { x: 300, y: 100 },
    width: 560,
    height: 160,
  },
};

// =============================================================================
// Text Scene
// =============================================================================

export const TEXT_GLITCH_SCENE: GlitchScene = {
  id: 'text-glitch',
  root: group(
    'text-group',
    TEXT_PATHS.map((line, i) =>
      path(`text-path-${i}`, pathPointsToSVGPath(line.points), {
        stroke: line.color,
        strokeWidth: 3,
        fill: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      })
    ),
    {}
  ),
  bounds: {
    center: { x: 350, y: 140 },
    width: 660,
    height: 220,
  },
};

// =============================================================================
// Scene Accessor
// =============================================================================

export function getScene(target: 'logo' | 'text'): GlitchScene {
  return target === 'logo' ? LOGO_GLITCH_SCENE : TEXT_GLITCH_SCENE;
}

// =============================================================================
// Viewport
// =============================================================================

export function getViewport(target: 'logo' | 'text'): { w: number; h: number } {
  return target === 'logo'
    ? { w: 600, h: 200 }
    : { w: 700, h: 280 };
}
