/**
 * V4 Particles Animation - Scene Data
 *
 * Creates ParticlesScene by sampling points along paths.
 * Based on ui_example_docs/particle.md
 */

import type { Vec2 } from '../../core/types';
import type { ParticlesScene } from './types';
import { LOGO_PATHS, TEXT_PATHS, pathPointsToSVGPath, type LineData } from '../../../data/pathData';

// =============================================================================
// Path Sampling (Runtime - requires DOM)
// =============================================================================

/**
 * Sample points along SVG paths.
 * This requires DOM access to measure path lengths.
 */
export function samplePathPoints(
  paths: LineData[],
  spacing: number = 8 // Increased from 4 to reduce particle count
): { targets: Vec2[]; colors: string[] } {
  const targets: Vec2[] = [];
  const colors: string[] = [];

  // Create temporary SVG to sample paths
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '800');
  svg.setAttribute('height', '400');
  svg.style.position = 'absolute';
  svg.style.visibility = 'hidden';
  document.body.appendChild(svg);

  try {
    paths.forEach((lineData) => {
      const pathD = pathPointsToSVGPath(lineData.points);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      svg.appendChild(path);

      const totalLength = path.getTotalLength();
      for (let i = 0; i < totalLength; i += spacing) {
        const point = path.getPointAtLength(i);
        targets.push({ x: point.x, y: point.y });
        colors.push(lineData.color);
      }
    });
  } finally {
    document.body.removeChild(svg);
  }

  return { targets, colors };
}

// =============================================================================
// Scene Creation
// =============================================================================

/**
 * Create a ParticlesScene from path data.
 * Note: This must be called in a browser environment (requires DOM).
 */
export function createParticlesScene(
  target: 'logo' | 'text',
  spacing: number = 8 // Increased from 4 to reduce particle count
): ParticlesScene {
  const paths = target === 'logo' ? LOGO_PATHS : TEXT_PATHS;
  const { targets, colors } = samplePathPoints(paths, spacing);

  return {
    id: `particles-${target}`,
    targets,
    colors,
  };
}

// =============================================================================
// Scene Cache (avoid re-sampling on every render)
// =============================================================================

const sceneCache = new Map<string, ParticlesScene>();

/**
 * Get or create a cached scene.
 */
export function getScene(
  target: 'logo' | 'text',
  spacing: number = 8 // Increased from 4 to reduce particle count
): ParticlesScene {
  const key = `${target}-${spacing}`;
  let scene = sceneCache.get(key);

  if (!scene) {
    scene = createParticlesScene(target, spacing);
    sceneCache.set(key, scene);
  }

  return scene;
}

/**
 * Clear the scene cache (useful for testing).
 */
export function clearSceneCache(): void {
  sceneCache.clear();
}

// =============================================================================
// Viewport Dimensions
// =============================================================================

/**
 * Get viewport dimensions for a target.
 */
export function getViewport(target: 'logo' | 'text'): { w: number; h: number } {
  return target === 'logo'
    ? { w: 600, h: 200 }
    : { w: 700, h: 280 };
}

/**
 * Get center point for a target viewport.
 */
export function getCenter(target: 'logo' | 'text'): Vec2 {
  const vp = getViewport(target);
  return { x: vp.w / 2, y: vp.h / 2 };
}
