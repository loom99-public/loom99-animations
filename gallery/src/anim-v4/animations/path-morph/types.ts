/**
 * V4 Path Morph Animation - Type Definitions
 *
 * Per ui_example_docs/03-morph.md spec:
 * - Multi-path morph where each path starts as a simple shape
 * - Morphs into final target path via command interpolation
 * - Supports M/L/A/Z commands
 */

import type { Seed, Time, Context } from '../../core/types';

// =============================================================================
// Vec2
// =============================================================================

export interface Vec2 {
  x: number;
  y: number;
}

// =============================================================================
// Path Definition
// =============================================================================

export interface PathDef {
  id: string;
  d: string;           // Final SVG path string
  colorTag?: string;   // e.g. "purple", "cyan"
  groupId?: number;    // Optional grouping
}

// =============================================================================
// Scene Definition
// =============================================================================

export interface PathMorphScene {
  id: string;
  paths: readonly PathDef[];
}

// =============================================================================
// Start Shape Specification
// =============================================================================

export type StartShapeKind = 'circle' | 'square' | 'triangle' | 'star' | 'polygon';

export interface StartShapeSpec {
  kind: StartShapeKind;
  center: Vec2;
  size: number;
  sides?: number;   // For polygon: 3..8
  rot?: number;     // Micro-rotation in radians
}

// =============================================================================
// Parsed Path Commands
// =============================================================================

export type ParsedCmd =
  | { cmd: 'M'; x: number; y: number }
  | { cmd: 'L'; x: number; y: number }
  | { cmd: 'Q'; cx: number; cy: number; x: number; y: number }
  | { cmd: 'A'; rx: number; ry: number; rot: number; laf: 0 | 1; sf: 0 | 1; x: number; y: number }
  | { cmd: 'Z' };

// =============================================================================
// Color
// =============================================================================

export type Color =
  | { kind: 'hex'; value: string }
  | { kind: 'hsl'; h: number; s: number; l: number };

// =============================================================================
// Style
// =============================================================================

export interface Style {
  stroke: Color;
  strokeWidth: number;
  opacity: number;
  fill?: Color | 'none';
  lineCap?: 'round' | 'butt' | 'square';
  lineJoin?: 'round' | 'bevel' | 'miter';
}

// =============================================================================
// Compiled Path Parameters
// =============================================================================

export interface PathParams {
  id: string;
  target: PathDef;
  start: StartShapeSpec;
  delay: number;
  duration: number;
  color: Color;
  opacity: number;
}

// =============================================================================
// Bounds
// =============================================================================

export interface Bounds {
  min: Vec2;
  max: Vec2;
  center: Vec2;
}

// =============================================================================
// Env
// =============================================================================

export interface Env {
  viewport: {
    w: number;
    h: number;
  };
}

// =============================================================================
// Field Type
// =============================================================================

export type Field<T> = (seed: Seed, index: number, count: number, env: Env) => T;

// =============================================================================
// Program Type
// =============================================================================

export type Program<Out> = {
  readonly signal: (t: Time, ctx: Context) => Out;
  readonly event: (t: Time, ctx: Context) => readonly never[];
};
