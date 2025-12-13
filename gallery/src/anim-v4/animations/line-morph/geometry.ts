/**
 * V4 LineMorph Animation - Geometry Cache
 *
 * Kernel-level geometry cache per ui_example_docs/geometry-cache.md
 *
 * Design principles:
 * 1. Caches expensive derived geometry (NOT animation state)
 * 2. Purely functional from inputs
 * 3. Keyed by stable semantic inputs
 * 4. Safe under scrubbing
 * 5. Explicit invalidation
 */

import type { Vec2 } from '../../core/types';
import type { PathPoint, StrokeDef } from './types';

// =============================================================================
// Geometry Key Types
// =============================================================================

/**
 * Keys must reflect semantic identity, not object identity.
 * If changing a value should change geometry, it must be in the key.
 */
export type GeometryKey =
  | { readonly kind: 'SceneStrokes'; readonly sceneId: string }
  | { readonly kind: 'StrokeSegments'; readonly strokeId: string }
  | { readonly kind: 'PathSample'; readonly strokeId: string; readonly resolution: number }
  | { readonly kind: 'Targets'; readonly sceneId: string; readonly density: number }
  | { readonly kind: 'Bounds'; readonly sceneId: string }
  | { readonly kind: 'Custom'; readonly id: string; readonly deps: readonly string[] };

// =============================================================================
// Geometry Value Types
// =============================================================================

export type GeometryValue =
  | StrokeDef[]
  | StrokeSegments
  | Vec2[]
  | Bounds
  | unknown;

export type Bounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

// =============================================================================
// Stroke Segments (for interpolation)
// =============================================================================

/**
 * Simplified segment for morph interpolation.
 */
export type GeomSegment = {
  readonly ctrl: Vec2;  // Control point (for Q) or midpoint (for L/A)
  readonly end: Vec2;   // End anchor
};

/**
 * Simplified path geometry for morph interpolation.
 */
export type PathGeom = {
  readonly start: Vec2;
  readonly segments: readonly GeomSegment[];
};

/**
 * Pre-computed stroke segments with arc-length parameterization.
 */
export type StrokeSegments = {
  readonly final: PathGeom;
  readonly anchorParams: readonly number[];  // Parameter (0..1) for each anchor
  readonly ctrlParams: readonly number[];    // Parameter for control points
};

// =============================================================================
// Geometry Cache Interface
// =============================================================================

export type GeometryCacheStats = {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
};

export interface GeometryCache {
  get<V extends GeometryValue>(
    key: GeometryKey,
    compute: () => V
  ): V;

  invalidate(scope?: GeometryInvalidation): void;

  stats(): GeometryCacheStats;
}

// =============================================================================
// Invalidation Types
// =============================================================================

export type GeometryInvalidation =
  | { readonly kind: 'scene'; readonly sceneId: string }
  | { readonly kind: 'stroke'; readonly strokeId: string }
  | { readonly kind: 'all' }
  | { readonly kind: 'custom'; readonly matches: (keyString: string) => boolean };

/**
 * Invalidation helpers.
 */
export const Invalidate = {
  scene: (sceneId: string): GeometryInvalidation => ({
    kind: 'custom',
    matches: (k) => k.includes(`"sceneId":"${sceneId}"`),
  }),

  stroke: (strokeId: string): GeometryInvalidation => ({
    kind: 'custom',
    matches: (k) => k.includes(`"strokeId":"${strokeId}"`),
  }),

  all: (): GeometryInvalidation => ({
    kind: 'all',
  }),
};

// =============================================================================
// Geometry Cache Implementation
// =============================================================================

/**
 * Create a geometry cache.
 * Simple Map-based implementation per spec.
 */
export function createGeometryCache(): GeometryCache {
  const map = new Map<string, GeometryValue>();
  let hits = 0;
  let misses = 0;

  function keyToString(key: GeometryKey): string {
    return JSON.stringify(key);
  }

  return {
    get<V extends GeometryValue>(key: GeometryKey, compute: () => V): V {
      const k = keyToString(key);
      const existing = map.get(k);
      if (existing !== undefined) {
        hits++;
        return existing as V;
      }

      misses++;
      const value = compute();
      map.set(k, value);
      return value;
    },

    invalidate(scope) {
      if (!scope || scope.kind === 'all') {
        map.clear();
        return;
      }

      if (scope.kind === 'custom') {
        for (const k of map.keys()) {
          if (scope.matches(k)) {
            map.delete(k);
          }
        }
        return;
      }

      // scene or stroke invalidation
      const match = scope.kind === 'scene'
        ? `"sceneId":"${scope.sceneId}"`
        : `"strokeId":"${scope.strokeId}"`;

      for (const k of map.keys()) {
        if (k.includes(match)) {
          map.delete(k);
        }
      }
    },

    stats() {
      return { size: map.size, hits, misses };
    },
  };
}

// =============================================================================
// Math Utilities
// =============================================================================

/**
 * Distance between two points.
 */
function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Linear interpolation between two points.
 */
export function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// =============================================================================
// Stroke Segments Computation
// =============================================================================

/**
 * Convert PathPoint[] to simplified PathGeom.
 */
function pathPointsToGeom(points: readonly PathPoint[]): PathGeom {
  if (points.length === 0) {
    return { start: { x: 0, y: 0 }, segments: [] };
  }

  const start = { x: points[0].x, y: points[0].y };
  const segments: GeomSegment[] = [];

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const type = p.type || 'L';

    // For control point: use actual control point for Q,
    // or midpoint for L/A
    let ctrl: Vec2;
    if (type === 'Q' && p.cx !== undefined && p.cy !== undefined) {
      ctrl = { x: p.cx, y: p.cy };
    } else {
      // Use midpoint as "virtual" control point
      ctrl = { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 };
    }

    segments.push({
      ctrl,
      end: { x: p.x, y: p.y },
    });
  }

  return { start, segments };
}

/**
 * Compute stroke segments with arc-length parameterization.
 */
export function computeStrokeSegments(
  finalPoints: readonly PathPoint[]
): StrokeSegments {
  const final = pathPointsToGeom(finalPoints);

  // Collect all anchor points: start + all segment ends
  const anchors: Vec2[] = [final.start, ...final.segments.map(s => s.end)];

  // Compute cumulative distances
  const cumulative: number[] = [0];
  for (let i = 1; i < anchors.length; i++) {
    cumulative[i] = cumulative[i - 1] + dist(anchors[i - 1], anchors[i]);
  }

  // Normalize to [0, 1]
  const totalLength = Math.max(1e-6, cumulative[cumulative.length - 1]);
  const anchorParams = cumulative.map(d => d / totalLength);

  // Control point parameters: midpoint between adjacent anchor parameters
  const ctrlParams = final.segments.map((_, i) =>
    0.5 * (anchorParams[i] + anchorParams[i + 1])
  );

  return {
    final,
    anchorParams,
    ctrlParams,
  };
}

// =============================================================================
// Geometry Interpolation
// =============================================================================

/**
 * Build straight geometry from origin to final endpoint.
 */
export function buildStraightGeom(
  segments: StrokeSegments,
  origin: Vec2
): PathGeom {
  const { final, anchorParams, ctrlParams } = segments;
  const anchors: Vec2[] = [final.start, ...final.segments.map(s => s.end)];
  const end = anchors[anchors.length - 1];

  // Map: parameter t → point on line from origin to end
  const pointOnLine = (t: number) => lerpPoint(origin, end, t);

  // Anchors on straight line
  const straightAnchors = anchorParams.map(pointOnLine);

  // Control points on straight line
  const straightCtrls = ctrlParams.map(pointOnLine);

  return {
    start: straightAnchors[0],
    segments: final.segments.map((_, i) => ({
      ctrl: straightCtrls[i],
      end: straightAnchors[i + 1],
    })),
  };
}

/**
 * Interpolate between two PathGeom instances.
 */
export function interpolateGeom(from: PathGeom, to: PathGeom, t: number): PathGeom {
  if (from.segments.length !== to.segments.length) {
    throw new Error('Geometry segment count mismatch');
  }

  return {
    start: lerpPoint(from.start, to.start, t),
    segments: from.segments.map((fromSeg, i) => ({
      ctrl: lerpPoint(fromSeg.ctrl, to.segments[i].ctrl, t),
      end: lerpPoint(fromSeg.end, to.segments[i].end, t),
    })),
  };
}

/**
 * Build interpolated geometry.
 *
 * @param segments - Pre-computed stroke segments
 * @param origin - Starting origin for the straight line
 * @param morphProgress - 0 = straight from origin, 1 = final curved
 */
export function buildInterpolatedGeom(
  segments: StrokeSegments,
  origin: Vec2,
  morphProgress: number
): PathGeom {
  const straight = buildStraightGeom(segments, origin);
  return interpolateGeom(straight, segments.final, morphProgress);
}

// =============================================================================
// Path String Generation
// =============================================================================

/**
 * Convert PathGeom to SVG path `d` attribute.
 *
 * @param geom - The geometry to render
 * @param tailPos - Position to start the path (for tail animation)
 * @param finalPoints - Original path points (for type info: Q vs L vs A)
 */
export function geomToPathD(
  geom: PathGeom,
  tailPos: Vec2,
  finalPoints: readonly PathPoint[]
): string {
  const parts: string[] = [];

  // Move to tail position
  parts.push(`M ${tailPos.x.toFixed(2)} ${tailPos.y.toFixed(2)}`);

  // Line to first anchor if tail != start
  if (Math.abs(tailPos.x - geom.start.x) > 0.01 || Math.abs(tailPos.y - geom.start.y) > 0.01) {
    parts.push(`L ${geom.start.x.toFixed(2)} ${geom.start.y.toFixed(2)}`);
  }

  // Generate segments based on original point types
  for (let i = 0; i < geom.segments.length; i++) {
    const seg = geom.segments[i];
    const originalPoint = finalPoints[i + 1]; // +1 because finalPoints[0] is start
    const type = originalPoint?.type || 'L';

    if (type === 'Q') {
      parts.push(
        `Q ${seg.ctrl.x.toFixed(2)} ${seg.ctrl.y.toFixed(2)} ` +
        `${seg.end.x.toFixed(2)} ${seg.end.y.toFixed(2)}`
      );
    } else if (type === 'A' && originalPoint) {
      // For arcs, keep original arc params but use interpolated endpoint
      const rx = originalPoint.rx ?? 0;
      const ry = originalPoint.ry ?? 0;
      const rotation = originalPoint.rotation ?? 0;
      const largeArc = originalPoint.largeArc ? 1 : 0;
      const sweep = originalPoint.sweep ? 1 : 0;
      parts.push(
        `A ${rx} ${ry} ${rotation} ${largeArc} ${sweep} ` +
        `${seg.end.x.toFixed(2)} ${seg.end.y.toFixed(2)}`
      );
    } else {
      // Line
      parts.push(`L ${seg.end.x.toFixed(2)} ${seg.end.y.toFixed(2)}`);
    }
  }

  return parts.join(' ');
}

// =============================================================================
// Global Cache Instance
// =============================================================================

/**
 * Shared geometry cache instance.
 * Safe to use globally because:
 * - Keys are pure data
 * - Compute functions are pure
 * - Cache has no time awareness
 */
export const geometryCache = createGeometryCache();
