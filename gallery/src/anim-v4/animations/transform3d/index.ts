/**
 * V4 Transform3D Animation - Public API
 *
 * Exports:
 * - Types (Transform3DScene, Transform3DSpec, etc.)
 * - Compiler (compileTransform3D)
 * - Renderer factory (createSVGTransform3DRenderer)
 * - Mode presets (createProceduralMode, createVariedMode, createTransform3DFields)
 */

// Types
export type {
  Transform3DPartDef,
  Transform3DScene,
  Transform3DFields,
  Transform3DPhases,
  Transform3D,
  Matrix2D,
  Transform3DRenderer,
  Transform3DSpec,
  EaseKind,
  Field,
} from './types';

// Compiler
export { compileTransform3D } from './compiler';

// Renderer
export { createSVGTransform3DRenderer } from './render';

// Projection utilities (exported for testing/debugging)
export { project3DTo2D, matrix2DToSVG } from './projection';

// Modes
export {
  createTransform3DFields,
  createProceduralMode,
  createVariedMode,
} from './modes';

export type {
  Transform3DModeConfig,
  EntryPoseMode,
  TimingMode,
  DepthMode,
  ExitMode,
  VarianceMode,
} from './modes';
