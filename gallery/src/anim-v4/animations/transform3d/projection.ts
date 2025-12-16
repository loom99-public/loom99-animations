/**
 * V4 Transform3D - 3D to 2D Projection Math
 *
 * Implements perspective projection from 3D transforms to 2D SVG matrices.
 * Pure functions, no side effects, fully testable.
 *
 * Math approach:
 * 1. Build 4x4 transformation matrix (scale, rotate, translate)
 * 2. Apply perspective projection (divide by z distance)
 * 3. Extract 2D affine transform as SVG matrix(a,b,c,d,e,f)
 */

import type { Transform3D, Matrix2D } from './types';

// =============================================================================
// Matrix Math (4x4 for 3D transforms)
// =============================================================================

type Mat4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

/**
 * Identity 4x4 matrix.
 */
const IDENTITY: Mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
];

/**
 * Multiply two 4x4 matrices.
 */
function multiply(a: Mat4, b: Mat4): Mat4 {
  const result = new Array(16).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[row * 4 + k]! * b[k * 4 + col]!;
      }
      result[row * 4 + col] = sum;
    }
  }
  return result as unknown as Mat4;
}

/**
 * Transform a 3D point by a 4x4 matrix.
 * Returns [x, y, z, w] (homogeneous coordinates).
 */
function transformPoint(m: Mat4, x: number, y: number, z: number): [number, number, number, number] {
  return [
    m[0]! * x + m[1]! * y + m[2]! * z + m[3]!,
    m[4]! * x + m[5]! * y + m[6]! * z + m[7]!,
    m[8]! * x + m[9]! * y + m[10]! * z + m[11]!,
    m[12]! * x + m[13]! * y + m[14]! * z + m[15]!,
  ];
}

// =============================================================================
// 3D Transform Matrix Builders
// =============================================================================

/**
 * Create a translation matrix.
 */
function matrixTranslate(x: number, y: number, z: number): Mat4 {
  return [
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z,
    0, 0, 0, 1
  ];
}

/**
 * Create a scale matrix.
 */
function matrixScale(sx: number, sy: number, sz: number): Mat4 {
  return [
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1
  ];
}

/**
 * Create a rotation matrix around X axis.
 * @param deg - Rotation in degrees
 */
function matrixRotateX(deg: number): Mat4 {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    1, 0, 0, 0,
    0, c, -s, 0,
    0, s, c, 0,
    0, 0, 0, 1
  ];
}

/**
 * Create a rotation matrix around Y axis.
 * @param deg - Rotation in degrees
 */
function matrixRotateY(deg: number): Mat4 {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    c, 0, s, 0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    0, 0, 0, 1
  ];
}

/**
 * Create a rotation matrix around Z axis.
 * @param deg - Rotation in degrees
 */
function matrixRotateZ(deg: number): Mat4 {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    c, -s, 0, 0,
    s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

// =============================================================================
// Perspective Projection
// =============================================================================

/**
 * Create a perspective projection matrix.
 * @param distance - Camera distance (perspective in px)
 */
function matrixPerspective(distance: number): Mat4 {
  // Simple perspective: z affects scale via 1/(1 + z/distance)
  const d = distance;
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -1 / d, 1
  ];
}

// =============================================================================
// Main Projection Function
// =============================================================================

/**
 * Project a 3D transform to a 2D SVG matrix.
 *
 * Algorithm:
 * 1. Translate to origin
 * 2. Apply rotations (X, Y, Z order)
 * 3. Apply scale
 * 4. Translate by offset
 * 5. Apply perspective
 * 6. Project to 2D
 * 7. Translate back from origin
 *
 * Returns a 2D affine transform matrix.
 */
export function project3DTo2D(t3d: Transform3D): Matrix2D {
  const { translate, z, rotXDeg, rotYDeg, rotZDeg, scale, origin, perspectivePx } = t3d;

  // Build composite 3D transform matrix
  let mat = IDENTITY;

  // 1. Translate to origin
  mat = multiply(mat, matrixTranslate(-origin.x, -origin.y, 0));

  // 2. Apply rotations (order: X, Y, Z - matches CSS transform3d)
  if (rotXDeg !== 0) mat = multiply(mat, matrixRotateX(rotXDeg));
  if (rotYDeg !== 0) mat = multiply(mat, matrixRotateY(rotYDeg));
  if (rotZDeg !== 0) mat = multiply(mat, matrixRotateZ(rotZDeg));

  // 3. Apply scale
  if (scale !== 1) mat = multiply(mat, matrixScale(scale, scale, scale));

  // 4. Apply 3D translation (x, y, z)
  mat = multiply(mat, matrixTranslate(translate.x, translate.y, z));

  // 5. Translate back from origin
  mat = multiply(mat, matrixTranslate(origin.x, origin.y, 0));

  // 6. Apply perspective projection
  const perspective = matrixPerspective(perspectivePx);
  mat = multiply(perspective, mat);

  // 7. Extract 2D affine transform from 4x4 matrix
  // For a point at origin after transform, we need to handle the perspective division
  // Test the origin point
  const [px, py, _pz, pw] = transformPoint(mat, 0, 0, 0);
  const w = pw === 0 ? 1 : pw;

  // Extract the 2x3 affine part, accounting for perspective
  // The matrix maps (x,y) -> (x', y') via:
  // x' = (a*x + c*y + e*w) / w
  // y' = (b*x + d*y + f*w) / w
  //
  // For small z values and typical perspective, w ≈ 1 - z/perspectivePx
  // We approximate by extracting the linear part and scaling by w

  const a = mat[0]! / w;
  const b = mat[4]! / w;
  const c = mat[1]! / w;
  const d = mat[5]! / w;
  const e = px / w;
  const f = py / w;

  return { a, b, c, d, e, f };
}

/**
 * Convert a 2D matrix to SVG transform string.
 */
export function matrix2DToSVG(m: Matrix2D): string {
  return `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
}
