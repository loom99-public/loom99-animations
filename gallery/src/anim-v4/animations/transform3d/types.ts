/**
 * V4 Transform3D Animation - Type Definitions
 *
 * Per ui_example_docs/07-3d-transform.md spec:
 * - Transform3DParts: animate static geometry via 3D transforms
 * - Each part has animated transform (translate, rotateX/Y/Z, translateZ, scale) and opacity
 * - Entrance uses easeOutBack/easeOutCubic settling from 3D pose to identity
 * - Exit uses easeInCubic, moving to exit pose with fade
 * - Pure, deterministic, scrubbable via 2D matrix projection
 */

import type { Seed, Vec2, PhaseMachine, CompileCtx } from '../../core/types';
import type { RenderTree, RenderNode } from '../../render/tree';

// =============================================================================
// Scene Definition
// =============================================================================

/**
 * Static geometry for a single part.
 */
export interface Transform3DPartDef {
  id: string;
  node: RenderNode;
  groupId?: number;
}

/**
 * Transform3DScene defines the set of parts to animate.
 * Geometry is static; only transforms/opacity animate.
 */
export interface Transform3DScene {
  id: string;
  parts: readonly Transform3DPartDef[];

  /** Perspective distance in px (CSS perspective analog); default 1000 */
  perspectivePx?: number;

  /** Center used as transform origin; defaults to scene bounds center */
  origin?: Vec2;
}

// =============================================================================
// Bounds
// =============================================================================

export interface Bounds {
  center: Vec2;
  width: number;
  height: number;
}

// =============================================================================
// Field Types (Bulk Form)
// =============================================================================

/**
 * Field<T> generates an array of T values at compile time.
 * Bulk form: (seed, n, ctx) => readonly T[]
 */
export type Field<T> = (seed: Seed, n: number, ctx: CompileCtx) => readonly T[];

// =============================================================================
// Transform Types
// =============================================================================

/**
 * 3D transform specification with perspective.
 */
export interface Transform3D {
  translate: Vec2;
  z: number;
  rotXDeg: number;
  rotYDeg: number;
  rotZDeg: number;
  scale: number;
  origin: Vec2;
  perspectivePx: number;
}

/**
 * 2D affine transform matrix (for SVG).
 */
export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

// =============================================================================
// Easing Types
// =============================================================================

export type EaseKind = 'easeOutCubic' | 'easeOutBack' | 'easeOutQuint';

// =============================================================================
// Fields (compile-time parameterization)
// =============================================================================

/**
 * Transform3DFields are evaluated once at compile time using bulk form.
 */
export interface Transform3DFields {
  // Timing per part
  delay: Field<number>;
  duration: Field<number>;

  // Entrance initial conditions per part
  entryTranslate: Field<Vec2>;
  entryZ: Field<number>;
  entryRotZDeg: Field<number>;
  entryRotXDeg: Field<number>;
  entryRotYDeg: Field<number>;
  entryScale: Field<number>;

  // Entrance feel
  ease?: Field<EaseKind>;
  overshoot?: Field<number>;

  // Style (optional)
  opacity?: Field<number>;

  // Exit policy
  exitTranslate: Field<Vec2>;
  exitZ: Field<number>;
  exitRotXDeg: Field<number>;
  exitRotYDeg: Field<number>;
  exitRotZDeg: Field<number>;
}

// =============================================================================
// Phases
// =============================================================================

export type Transform3DPhase = 'entrance' | 'hold' | 'exit';

/**
 * Transform3DPhases defines the phase machine.
 */
export interface Transform3DPhases {
  machine: PhaseMachine;
}

// =============================================================================
// Compiled Part Parameters
// =============================================================================

/**
 * CompiledPartParams holds the evaluated compile-time values for a single part.
 */
export interface CompiledPartParams {
  id: string;
  content: RenderNode;
  origin: Vec2;
  delay: number;
  duration: number;
  entry: {
    entryTranslate: Vec2;
    entryZ: number;
    entryRotX: number;
    entryRotY: number;
    entryRotZ: number;
    entryScale: number;
  };
  exit: {
    exitTranslate: Vec2;
    exitZ: number;
    exitRotX: number;
    exitRotY: number;
    exitRotZ: number;
  };
  opacityBase: number;
  easeKind: EaseKind;
  overshoot: number;
}

// =============================================================================
// Renderer Contract
// =============================================================================

/**
 * Transform3DRenderer renders parts with 3D transforms via 2D projection.
 */
export interface Transform3DRenderer {
  /** Create a part node with transform and opacity applied */
  part(args: {
    id: string;
    content: RenderNode;
    transform3d: Transform3D;
    opacity: number;
  }): RenderNode;

  /** Compose all parts into final render tree */
  compose(
    rootId: string,
    nodes: readonly RenderNode[],
    width: number,
    height: number
  ): RenderTree;
}

// =============================================================================
// Geometry Cache (placeholder)
// =============================================================================

export interface GeometryCache {
  get<T>(key: unknown, compute: () => T): T;
}

// =============================================================================
// Spec Type (combines all components)
// =============================================================================

export interface Transform3DSpec {
  scene: Transform3DScene;
  fields: Transform3DFields;
  phases: Transform3DPhases;
  renderer: Transform3DRenderer;
  geom?: GeometryCache;
}
