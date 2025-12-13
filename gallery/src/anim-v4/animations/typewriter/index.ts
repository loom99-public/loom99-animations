/**
 * V4 Typewriter Animation - Public API
 *
 * Exports types, compiler, modes, and convenience functions.
 */

// Core types
export type {
  TypewriterScene,
  TypewriterFields,
  TypewriterParams,
  TypewriterState,
  TypewriterPhases,
  TypeSchedule,
  Color,
  Field,
} from './types';

// Compiler
export { compileTypewriter } from './compiler';
export type { Program } from './compiler';

// Schedule utilities
export { buildTypeSchedule, countRevealed, clamp01 } from './schedule';

// Renderer
export { createTypewriterRenderer } from './render';

// Modes
export {
  constantField,
  steadyMode,
  humanMode,
  fastMode,
  dramaticMode,
  caretOn,
  caretOff,
  caretFastBlink,
  inkFade,
  inkJitter,
  proceduralMode,
  variedMode,
  fastProceduralMode,
  dramaticProceduralMode,
  noCaretMode,
} from './modes';

// Re-export core types for convenience
export type { Seed, CompileCtx, Vec2, PhaseMachine } from '../../core/types';
export { PhaseMachines } from '../../core/types';
