/**
 * V4 Path Morph Animation - Scene Data
 *
 * Derives scene data from pathData.ts for logo and text targets.
 * Each path becomes a morph target.
 */

import type { PathMorphScene, PathDef } from './types';
import { LOGO_PATHS, TEXT_PATHS, pathPointsToSVGPath } from '../../../data/pathData';

// =============================================================================
// Logo Scene
// =============================================================================

export const LOGO_MORPH_SCENE: PathMorphScene = {
  id: 'logo-morph',
  paths: LOGO_PATHS.map((line, i) => ({
    id: `logo-path-${i}`,
    d: `M ${line.startX} ${line.startY} ${pathPointsToSVGPath(line.points).slice(2)}`,
    colorTag: line.color,
  })),
};

// Actually, for morph we want just the final shape, not the start position
// Let me reconsider - the morph starts from a random shape and goes to the final path
// The final path should just be the path points without the external start position

export const LOGO_SCENE: PathMorphScene = {
  id: 'logo-morph',
  paths: LOGO_PATHS.map((line, i) => ({
    id: `logo-path-${i}`,
    d: pathPointsToSVGPath(line.points),
    colorTag: line.color,
  })),
};

// =============================================================================
// Text Scene
// =============================================================================

export const TEXT_SCENE: PathMorphScene = {
  id: 'text-morph',
  paths: TEXT_PATHS.map((line, i) => ({
    id: `text-path-${i}`,
    d: pathPointsToSVGPath(line.points),
    colorTag: line.color,
  })),
};

// =============================================================================
// Scene Accessor
// =============================================================================

export function getScene(target: 'logo' | 'text'): PathMorphScene {
  return target === 'logo' ? LOGO_SCENE : TEXT_SCENE;
}

// =============================================================================
// Viewport
// =============================================================================

export function getViewport(target: 'logo' | 'text'): { w: number; h: number } {
  return target === 'logo'
    ? { w: 600, h: 200 }
    : { w: 700, h: 280 };
}
