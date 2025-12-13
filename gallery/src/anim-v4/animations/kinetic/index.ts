/**
 * V4 Kinetic Animation - Public API
 *
 * Per ui_example_docs/06-kinetic.md spec.
 *
 * Kinetic animation: logo parts fly in from offscreen with transforms,
 * settle into place with easeOutBack bounce, hold, then fly out radially.
 */

// Types
export type {
  KineticScene,
  KineticPartDef,
  KineticFields,
  KineticPhases,
  KineticPhaseSample,
  KineticPhase,
  KineticRenderer,
  KineticSpec,
  CompiledPartParams,
  Transform2D,
  Bounds,
  Env,
  Field,
  Program,
} from './types';

// Compiler
export {
  compileKinetic,
  compileProceduralKinetic,
  compileVariedKinetic,
  createKineticPhaseMachine,
  getProgramDuration,
  createTestScene,
  createSceneFromParts,
} from './compiler';
export type { KineticCompilerOptions } from './compiler';

// Mode System
export {
  createModeSystem,
  createProceduralModeSystem,
  createVariedModeSystem,
  createLeftSweepModeSystem,
  createSpiralModeSystem,
  createBouncyModeSystem,
} from './modes';
export type {
  ModeSystem,
  KineticModeConfig,
  KineticModeFields,
  EntryOriginMode,
  TimingMode,
  FeelMode,
  ExitMode,
  VarianceMode,
} from './modes';

// Renderer
export {
  createSVGKineticRenderer,
  createCanvasKineticRenderer,
} from './render';
