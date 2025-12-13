/**
 * Block Compiler Registry
 *
 * Aggregates all block compilers into a single registry.
 * Organized by data flow stage:
 *   sources → fields → time → math → compose → render → adapters → sinks
 */

import type { BlockRegistry } from '../types';

// Sources - data origins
import {
  SVGPathSourceBlock,
  ConstantNumberBlock,
  ConstantVec2Block,
  TextSourceBlock,
} from './sources';

// Fields - per-element value generators
import {
  // Basic fields
  RadialOriginBlock,
  LinearStaggerBlock,
  AddFieldNumberBlock,
  MulFieldNumberBlock,
  ScaleFieldNumberBlock,
  MapFieldNumberBlock,
  StaggerFieldBlock,
  NoiseFieldBlock,
  RegionFieldBlock,
  ConstantFieldDurationBlock,
  WaveStaggerBlock,
  SizeVariationBlock,
  ColorFieldBlock,
  // Timing/Stagger fields
  RandomStaggerBlock,
  IndexStaggerBlock,
  DurationVariationBlock,
  DecayEnvelopeBlock,
  // Position/Spatial fields
  ExplosionOriginBlock,
  TopDropOriginBlock,
  GridPositionsBlock,
  CenterPointBlock,
  // Transform fields
  RotationFieldBlock,
  ScaleFieldBlock,
  OpacityFieldBlock,
  // Behavior/Motion fields
  WobbleParamsBlock,
  SpiralParamsBlock,
  WaveParamsBlock,
  JitterParamsBlock,
  // Easing fields
  EasingFieldBlock,
} from './fields';

// Time - phase and timing control
import { PhaseMachineBlock, EaseRampBlock, PhaseProgressBlock } from './time';

// Math - scalar operations
import {
  MathConstNumberBlock,
  MathAddScalarBlock,
  MathMulScalarBlock,
  MathSinScalarBlock,
} from './math';

// Compose - program composition
import {
  PerElementTransportBlock,
  DemoProgramBlock,
  PerElementProgressBlock,
  LerpPointsBlock,
} from './compose';

// Render - visual output processing
import {
  ParticleRendererBlock,
  CanvasBlock,
  GlowFilterBlock,
  CircleNodeBlock,
  GroupNodeBlock,
  RenderTreeAssembleBlock,
  PerElementCirclesBlock,
  // New render blocks
  PathRendererBlock,
  StrokeStyleBlock,
  GooFilterBlock,
  RGBSplitFilterBlock,
  MaskRevealBlock,
} from './render';

// Adapters - type conversions
import {
  SamplePointsBlock,
  SceneToTargetsBlock,
  FieldToSignalBlock,
  LiftScalarToFieldNumberBlock,
  ElementCountBlock,
} from './adapters';

// Sinks - output terminals
import { OutputProgramBlock, DebugOutputBlock } from './sinks';

// =============================================================================
// Registry
// =============================================================================

/**
 * Default block compiler registry.
 * Maps block type strings to their compiler implementations.
 */
export const DEFAULT_BLOCK_REGISTRY: BlockRegistry = {
  // Sources
  SVGPathSource: SVGPathSourceBlock,
  constNumber: ConstantNumberBlock,
  constVec2: ConstantVec2Block,
  TextSource: TextSourceBlock,

  // Fields - Basic
  RadialOrigin: RadialOriginBlock,
  LinearStagger: LinearStaggerBlock,
  addFieldNumber: AddFieldNumberBlock,
  mulFieldNumber: MulFieldNumberBlock,
  scaleFieldNumber: ScaleFieldNumberBlock,
  mapFieldNumber: MapFieldNumberBlock,
  staggerField: StaggerFieldBlock,
  noiseField: NoiseFieldBlock,
  regionField: RegionFieldBlock,
  constantFieldDuration: ConstantFieldDurationBlock,
  WaveStagger: WaveStaggerBlock,
  SizeVariation: SizeVariationBlock,
  ColorField: ColorFieldBlock,

  // Fields - Timing/Stagger
  RandomStagger: RandomStaggerBlock,
  IndexStagger: IndexStaggerBlock,
  DurationVariation: DurationVariationBlock,
  DecayEnvelope: DecayEnvelopeBlock,

  // Fields - Position/Spatial
  ExplosionOrigin: ExplosionOriginBlock,
  TopDropOrigin: TopDropOriginBlock,
  GridPositions: GridPositionsBlock,
  CenterPoint: CenterPointBlock,

  // Fields - Transform
  RotationField: RotationFieldBlock,
  ScaleField: ScaleFieldBlock,
  OpacityField: OpacityFieldBlock,

  // Fields - Behavior/Motion
  WobbleParams: WobbleParamsBlock,
  SpiralParams: SpiralParamsBlock,
  WaveParams: WaveParamsBlock,
  JitterParams: JitterParamsBlock,

  // Fields - Easing
  EasingField: EasingFieldBlock,

  // Time
  PhaseMachine: PhaseMachineBlock,
  EaseRamp: EaseRampBlock,
  phaseProgress: PhaseProgressBlock,

  // Math (Slice 2.5)
  'math.constNumber': MathConstNumberBlock,
  'math.addScalar': MathAddScalarBlock,
  'math.mulScalar': MathMulScalarBlock,
  'math.sinScalar': MathSinScalarBlock,

  // Compose
  PerElementTransport: PerElementTransportBlock,
  demoProgram: DemoProgramBlock,
  perElementProgress: PerElementProgressBlock,
  lerpPoints: LerpPointsBlock,

  // Render
  ParticleRenderer: ParticleRendererBlock,
  canvas: CanvasBlock,
  glowFilter: GlowFilterBlock,
  circleNode: CircleNodeBlock,
  groupNode: GroupNodeBlock,
  renderTreeAssemble: RenderTreeAssembleBlock,
  perElementCircles: PerElementCirclesBlock,
  PathRenderer: PathRendererBlock,
  StrokeStyle: StrokeStyleBlock,
  GooFilter: GooFilterBlock,
  RGBSplitFilter: RGBSplitFilterBlock,
  MaskReveal: MaskRevealBlock,

  // Adapters
  SamplePoints: SamplePointsBlock,
  SceneToTargets: SceneToTargetsBlock,
  FieldToSignal: FieldToSignalBlock,
  'lift.scalarToFieldNumber': LiftScalarToFieldNumberBlock,
  elementCount: ElementCountBlock,

  // Sinks
  outputProgram: OutputProgramBlock,
  debugOutput: DebugOutputBlock,
};

/**
 * Create a registry with additional custom blocks.
 */
export function createBlockRegistry(custom: BlockRegistry = {}): BlockRegistry {
  return { ...DEFAULT_BLOCK_REGISTRY, ...custom };
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

// Export individual blocks for testing
export * from './sources';
export * from './fields';
export * from './time';
export * from './math';
export * from './compose';
export * from './render';
export * from './adapters';
export * from './sinks';
export * from './helpers';
