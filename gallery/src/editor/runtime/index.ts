/**
 * Runtime Module Exports
 *
 * The execution substrate for animations:
 * - RenderTree types and helpers
 * - Player (RAF loop, hot swap, scrubbing)
 * - SvgRenderer (keyed reconciliation)
 * - Proof programs for testing
 */

// RenderTree types and helpers
export type {
  // Geometry
  SvgPathGeom,
  CircleGeom,
  RectGeom,
  Geometry,

  // Style
  Style,

  // Transform
  Transform2D,
  Transform3D,

  // Effects
  OpacityMulEffect,
  Transform2DEffect,
  Transform3DEffect,
  FilterEffect,
  ClipEffect,
  DeformEffect,
  Effect,

  // Nodes
  GroupNode,
  ShapeNode,
  EffectNode,
  DrawNode,
  RenderTree,
} from './renderTree';

export {
  group,
  path,
  circle,
  withOpacity,
  withTransform2D,
  withTransform3D,
} from './renderTree';

// Player
export type {
  ProgramFactory,
  Scene,
  PlayState,
  PlayerOptions,
} from './player';

export { Player, createPlayer } from './player';

// SVG Renderer
export {
  SvgRenderer,
  createSvgRenderer,
  createSvgRendererWithElement,
  transform2dToSvg,
  transform3dToCss,
} from './svgRenderer';

// Proof programs
export {
  pulsingLineProgram,
  bouncingCircleProgram,
  composedEffectsProgram,
  lineDrawingProgram,
  particlesProgram,
  PROOF_PROGRAMS,
  type ProofProgramName,
} from './proofPrograms';
