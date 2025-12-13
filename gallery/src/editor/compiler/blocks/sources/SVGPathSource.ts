/**
 * SVGPathSource Block Compiler
 *
 * Loads SVG path data from logo or text targets.
 * Outputs: TargetScene with sampled points from paths.
 */

import type { BlockCompiler, TargetScene, Vec2 } from '../../types';
import { LOGO_PATHS, TEXT_PATHS, type LineData } from '../../../../data/pathData';

/**
 * Sample points along a path defined by LineData.
 * Returns approximate points along the path for particle targets.
 */
function samplePathPoints(line: LineData, density: number = 1.0): Vec2[] {
  const points: Vec2[] = [];
  const { startX, startY, points: pathPoints } = line;

  // Start point
  let lastX = startX;
  let lastY = startY;

  for (const point of pathPoints) {
    const steps = Math.max(1, Math.floor(10 * density));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      if (point.type === 'Q' && point.cx !== undefined && point.cy !== undefined) {
        // Quadratic bezier
        const x =
          (1 - t) * (1 - t) * lastX +
          2 * (1 - t) * t * point.cx +
          t * t * point.x;
        const y =
          (1 - t) * (1 - t) * lastY +
          2 * (1 - t) * t * point.cy +
          t * t * point.y;
        points.push({ x, y });
      } else if (point.type === 'A') {
        // Arc - approximate with linear interpolation for now
        const x = lastX + (point.x - lastX) * t;
        const y = lastY + (point.y - lastY) * t;
        points.push({ x, y });
      } else {
        // Line segment
        const x = lastX + (point.x - lastX) * t;
        const y = lastY + (point.y - lastY) * t;
        points.push({ x, y });
      }
    }

    lastX = point.x;
    lastY = point.y;
  }

  return points;
}

/**
 * Get color for each sampled point based on the path it came from.
 */
function getPathColors(paths: LineData[], pointsPerPath: number[]): string[] {
  const colors: string[] = [];
  for (let i = 0; i < paths.length; i++) {
    const count = pointsPerPath[i] ?? 0;
    for (let j = 0; j < count; j++) {
      colors.push(paths[i]!.color);
    }
  }
  return colors;
}

export const SVGPathSourceBlock: BlockCompiler = {
  type: 'SVGPathSource',
  inputs: [],
  outputs: [{ name: 'scene', type: { kind: 'TargetScene' } }],

  compile({ id, params }) {
    const target = String(params.target ?? 'logo');
    const density = Number(params.density ?? 1.0);

    const paths = target === 'text' ? TEXT_PATHS : LOGO_PATHS;

    // Sample points from all paths
    const allPoints: Vec2[] = [];
    const pointsPerPath: number[] = [];
    const groups: number[] = [];

    for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
      const pathData = paths[pathIndex]!;
      const pathPoints = samplePathPoints(pathData, density);
      pointsPerPath.push(pathPoints.length);

      for (const point of pathPoints) {
        allPoints.push(point);
        groups.push(pathIndex);
      }
    }

    // Get colors for each point
    const colors = getPathColors(paths, pointsPerPath);

    // Compute bounds
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of allPoints) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const scene: TargetScene = {
      id: `${id}-scene`,
      targets: allPoints,
      groups,
      bounds: {
        min: { x: minX, y: minY },
        max: { x: maxX, y: maxY },
      },
      meta: {
        source: target,
        colors,
        pathCount: paths.length,
      },
    };

    return { scene: { kind: 'TargetScene', value: scene } };
  },
};
