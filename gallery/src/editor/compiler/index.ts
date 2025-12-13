/**
 * Compiler Module Exports
 */

// Core compile function
export { compilePatch, topoSortBlocks, isPortTypeAssignable } from './compile';

// Types
export type {
  // Kernel primitives
  Seed,
  Env,
  GeometryCache,
  CompileCtx,
  RuntimeCtx,
  KernelEvent,
  Program,
  Vec2,
  Bounds,
  NodeId,
  DrawNode,
  RenderTree,
  Field,

  // Port typing
  ValueKind,
  PortType,
  PortDef,

  // Patch graph
  BlockId,
  PortRef,
  CompilerConnection,
  BlockInstance,
  CompilerPatch,

  // Artifacts
  Artifact,
  CompiledOutputs,

  // Phase machine + scene
  PhaseSample,
  PhaseMachine,
  TargetScene,

  // Block compiler
  BlockCompiler,
  BlockRegistry,

  // Errors
  CompileErrorCode,
  CompileError,
  CompileResult,
} from './types';

// Block implementations
export {
  // Constants
  ConstantNumberBlock,
  ConstantVec2Block,
  // Field combinators
  AddFieldNumberBlock,
  MulFieldNumberBlock,
  ScaleFieldNumberBlock,
  MapFieldNumberBlock,
  StaggerFieldBlock,
  NoiseFieldBlock,
  // Math scalar blocks (Slice 2.5)
  MathConstNumberBlock,
  MathAddScalarBlock,
  MathMulScalarBlock,
  MathSinScalarBlock,
  // Lift blocks (Slice 2.5)
  LiftScalarToFieldNumberBlock,
  // Program blocks
  DemoProgramBlock,
  OutputProgramBlock,
  DebugOutputBlock,
  // Registry
  DEFAULT_BLOCK_REGISTRY,
  createBlockRegistry,
} from './blocks';

// Context utilities
export {
  SimpleGeometryCache,
  createCompileCtx,
  createRuntimeCtx,
} from './context';

// Integration with editor
export {
  editorToPatch,
  createCompilerService,
  setupAutoCompile,
  type CompilerService,
  type AutoCompileOptions,
  type Viewport,
} from './integration';

// Error decorations (Slice 2.5)
export {
  buildDecorations,
  hasBlockError,
  hasPortError,
  hasWireError,
  getBlockMessages,
  getPortMessages,
  emptyDecorations,
  type Severity,
  type BlockDecoration,
  type PortDecoration,
  type WireDecoration,
  type DecorationSet,
} from './error-decorations';
