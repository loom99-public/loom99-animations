/**
 * V4 Path Morph Animation - Geometry Utilities
 *
 * Per ui_example_docs/03-morph.md and ui_example_docs/geometry-cache.md:
 * - Path parsing (M/L/Q/A/Z commands)
 * - Bounds computation and caching
 * - Path interpolation
 * - Start shape generation
 */

import type { ParsedCmd, StartShapeSpec, Bounds, Vec2 } from './types';

// =============================================================================
// Geometry Cache
// =============================================================================

export type GeometryCacheKey =
  | { kind: 'ParsedPath'; pathId: string }
  | { kind: 'PathBounds'; pathId: string };

const geometryCache = new Map<string, unknown>();

function cacheKey(key: GeometryCacheKey): string {
  return `${key.kind}:${key.pathId}`;
}

export function getCached<T>(key: GeometryCacheKey, compute: () => T): T {
  const k = cacheKey(key);
  if (!geometryCache.has(k)) {
    geometryCache.set(k, compute());
  }
  return geometryCache.get(k) as T;
}

export function clearGeometryCache(): void {
  geometryCache.clear();
}

// =============================================================================
// Path Parsing
// =============================================================================

/**
 * Parse SVG path string into commands.
 * Supports M, L, Q, A, Z commands.
 */
export function parsePathMLAZ(d: string): ParsedCmd[] {
  const commands: ParsedCmd[] = [];

  // Normalize: add spaces around command letters
  const normalized = d
    .replace(/([MLQAZ])/gi, ' $1 ')
    .replace(/,/g, ' ')
    .replace(/-/g, ' -')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized.split(' ').filter(t => t.length > 0);
  let i = 0;
  let currentX = 0;
  let currentY = 0;

  while (i < tokens.length) {
    const cmd = tokens[i].toUpperCase();
    i++;

    switch (cmd) {
      case 'M': {
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        commands.push({ cmd: 'M', x, y });
        currentX = x;
        currentY = y;
        break;
      }
      case 'L': {
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        commands.push({ cmd: 'L', x, y });
        currentX = x;
        currentY = y;
        break;
      }
      case 'Q': {
        const cx = parseFloat(tokens[i++]);
        const cy = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        commands.push({ cmd: 'Q', cx, cy, x, y });
        currentX = x;
        currentY = y;
        break;
      }
      case 'A': {
        const rx = parseFloat(tokens[i++]);
        const ry = parseFloat(tokens[i++]);
        const rot = parseFloat(tokens[i++]);
        const laf = parseInt(tokens[i++]) as 0 | 1;
        const sf = parseInt(tokens[i++]) as 0 | 1;
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        commands.push({ cmd: 'A', rx, ry, rot, laf, sf, x, y });
        currentX = x;
        currentY = y;
        break;
      }
      case 'Z': {
        commands.push({ cmd: 'Z' });
        break;
      }
      default:
        // Skip unknown commands
        break;
    }
  }

  return commands;
}

// =============================================================================
// Bounds Computation
// =============================================================================

/**
 * Compute bounds of a parsed path.
 */
export function computeBoundsFromCommands(commands: ParsedCmd[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const cmd of commands) {
    if (cmd.cmd === 'Z') continue;

    const x = (cmd as { x: number }).x;
    const y = (cmd as { y: number }).y;

    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    // For Q commands, include control point
    if (cmd.cmd === 'Q') {
      minX = Math.min(minX, cmd.cx);
      minY = Math.min(minY, cmd.cy);
      maxX = Math.max(maxX, cmd.cx);
      maxY = Math.max(maxY, cmd.cy);
    }
  }

  // Handle empty paths
  if (!isFinite(minX)) {
    minX = minY = maxX = maxY = 0;
  }

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  };
}

/**
 * Get bounds for a path, using cache.
 */
export function getPathBounds(pathId: string, d: string): Bounds {
  return getCached({ kind: 'PathBounds', pathId }, () => {
    const commands = getCached({ kind: 'ParsedPath', pathId }, () => parsePathMLAZ(d));
    return computeBoundsFromCommands(commands);
  });
}

/**
 * Default start size from bounds.
 */
export function defaultStartSizeFromBounds(bounds: Bounds): number {
  const w = bounds.max.x - bounds.min.x;
  const h = bounds.max.y - bounds.min.y;
  return 0.35 * Math.min(w, h);
}

// =============================================================================
// Start Shape Generation
// =============================================================================

/**
 * Generate path string for a start shape.
 */
export function startShapeToPath(spec: StartShapeSpec): string {
  const { kind, center, size, rot = 0, sides = 5 } = spec;

  switch (kind) {
    case 'circle':
      return circleToPath(center, size);
    case 'square':
      return squareToPath(center, size, rot);
    case 'triangle':
      return polygonToPath(center, size, 3, rot);
    case 'star':
      return starToPath(center, size, 5, rot);
    case 'polygon':
      return polygonToPath(center, size, sides, rot);
    default:
      return circleToPath(center, size);
  }
}

function circleToPath(center: Vec2, radius: number): string {
  const { x, y } = center;
  const r = Math.max(1, radius);

  // Circle as two arcs
  return `M ${x - r} ${y} A ${r} ${r} 0 1 1 ${x + r} ${y} A ${r} ${r} 0 1 1 ${x - r} ${y}`;
}

function squareToPath(center: Vec2, size: number, rot: number): string {
  const { x, y } = center;
  const half = size;

  const corners = [
    { x: -half, y: -half },
    { x: half, y: -half },
    { x: half, y: half },
    { x: -half, y: half },
  ];

  const rotated = corners.map(c => ({
    x: x + c.x * Math.cos(rot) - c.y * Math.sin(rot),
    y: y + c.x * Math.sin(rot) + c.y * Math.cos(rot),
  }));

  return `M ${rotated[0].x} ${rotated[0].y} L ${rotated[1].x} ${rotated[1].y} L ${rotated[2].x} ${rotated[2].y} L ${rotated[3].x} ${rotated[3].y} Z`;
}

function polygonToPath(center: Vec2, radius: number, sides: number, rot: number): string {
  const { x, y } = center;
  const points: Vec2[] = [];

  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2 + rot;
    points.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    });
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  d += ' Z';

  return d;
}

function starToPath(center: Vec2, radius: number, points: number, rot: number): string {
  const { x, y } = center;
  const innerRadius = radius * 0.4;
  const vertices: Vec2[] = [];

  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2 + rot;
    const r = i % 2 === 0 ? radius : innerRadius;
    vertices.push({
      x: x + Math.cos(angle) * r,
      y: y + Math.sin(angle) * r,
    });
  }

  let d = `M ${vertices[0].x} ${vertices[0].y}`;
  for (let i = 1; i < vertices.length; i++) {
    d += ` L ${vertices[i].x} ${vertices[i].y}`;
  }
  d += ' Z';

  return d;
}

/**
 * Parse start shape into commands.
 */
export function parseStartShape(spec: StartShapeSpec): ParsedCmd[] {
  const pathStr = startShapeToPath(spec);
  return parsePathMLAZ(pathStr);
}

// =============================================================================
// Command Normalization
// =============================================================================

/**
 * Normalize two command lists to same length.
 * Pads shorter list by repeating last point.
 */
export function normalizeCmdList(
  start: ParsedCmd[],
  end: ParsedCmd[]
): { s: ParsedCmd[]; e: ParsedCmd[] } {
  const max = Math.max(start.length, end.length);
  const sLast = start[start.length - 1];
  const eLast = end[end.length - 1];

  const s: ParsedCmd[] = [];
  const e: ParsedCmd[] = [];

  for (let i = 0; i < max; i++) {
    s.push(start[i] ?? sLast);
    e.push(end[i] ?? eLast);
  }

  return { s, e };
}

// =============================================================================
// Path Interpolation
// =============================================================================

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate between two command lists.
 * Returns SVG path string.
 */
export function interpolateCommands(
  start: ParsedCmd[],
  end: ParsedCmd[],
  u: number
): string {
  const { s, e } = normalizeCmdList(start, end);
  let d = '';

  for (let i = 0; i < e.length; i++) {
    const sc = s[i];
    const ec = e[i];

    if (ec.cmd === 'Z') {
      d += ' Z';
      continue;
    }

    // Get coordinates from both commands
    const sx = (sc as { x?: number }).x ?? 0;
    const sy = (sc as { y?: number }).y ?? 0;
    const ex = (ec as { x: number }).x;
    const ey = (ec as { y: number }).y;

    const x = lerp(sx, ex, u);
    const y = lerp(sy, ey, u);

    if (ec.cmd === 'M') {
      d += `${i === 0 ? 'M' : ' M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else if (ec.cmd === 'L') {
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else if (ec.cmd === 'Q') {
      // Interpolate control point too
      const scx = (sc as { cx?: number }).cx ?? sx;
      const scy = (sc as { cy?: number }).cy ?? sy;
      const cx = lerp(scx, ec.cx, u);
      const cy = lerp(scy, ec.cy, u);
      d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else if (ec.cmd === 'A') {
      // Keep arc params from target, interpolate only endpoint
      d += ` A ${ec.rx} ${ec.ry} ${ec.rot} ${ec.laf} ${ec.sf} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }

  return d.trim();
}

/**
 * Interpolate between a start shape and target path.
 */
export function interpolateMorph(
  startSpec: StartShapeSpec,
  targetD: string,
  pathId: string,
  u: number
): string {
  const startCmds = parseStartShape(startSpec);
  const targetCmds = getCached({ kind: 'ParsedPath', pathId }, () => parsePathMLAZ(targetD));

  return interpolateCommands(startCmds, targetCmds, u);
}
