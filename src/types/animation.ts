/**
 * Type definitions for animation engines
 */

export type VarianceLevel = 'none' | 'moderate' | 'heavy';

export type AnimationState = 'entrance' | 'hold' | 'exit' | 'waiting';

export type EasingFunction = (t: number) => number;

// ============================================================================
// Line Drawing Engine Types
// ============================================================================

export interface LinePoint {
  x: number;
  y: number;
  type?: 'L' | 'Q' | 'A';
  // Quadratic curve control points
  cx?: number;
  cy?: number;
  // Arc parameters
  rx?: number;
  ry?: number;
  rotation?: number;
  largeArc?: number;
  sweep?: number;
}

export interface LineDefinition {
  startX: number;
  startY: number;
  points: LinePoint[];
  color: string;
  delay: number;
  duration?: number;
  foldDuration?: number;
  exitX?: number;
  exitY?: number;
}

export interface LineDrawingTimingConfig {
  enabled: boolean;
  duration: number;
  stagger: number;
  foldDuration: number;
  holdDuration: number;
  exitDuration: number;
  // Variance for procedural/varied modes
  durationVariance?: number;
  staggerVariance?: number;
}

export interface LineDrawingColorConfig {
  enabled: boolean;
  hueShift?: number;
  satShift?: number;
  lightShift?: number;
}

export interface LineDrawingMotionConfig {
  enabled: boolean;
  useMode?: boolean;
  randomStart?: boolean;
  mode?: 'converge' | 'cascade' | 'diagonal' | 'random';
}

export interface LineDrawingEffectsConfig {
  enabled: boolean;
  strokeWidth: number;
  strokeVariance?: number;
  glowRadius: number;
  glowVariance?: number;
}

export interface LineDrawingConfig {
  viewBox: { width: number; height: number };
  variance: VarianceLevel;
  timing: LineDrawingTimingConfig;
  colors: LineDrawingColorConfig;
  motion: LineDrawingMotionConfig;
  effects: LineDrawingEffectsConfig;
  lines: LineDefinition[];
  easingFunction?: EasingFunction;
  loop: boolean;
  prefersReducedMotion?: boolean;
}

// ============================================================================
// Particle Engine Types
// ============================================================================

export type ParticleFormation = 'center-explosion' | 'top-rain' | 'side-converge' | 'random';

export type ParticleBehavior = 'linear' | 'spiral' | 'wave' | 'bounce';

export interface ParticleDefinition {
  targetX: number;
  targetY: number;
  color: string;
}

export interface ParticleTimingConfig {
  enabled: boolean;
  duration: number;
  holdDuration: number;
  exitDuration: number;
  durationVariance?: number;
}

export interface ParticleColorConfig {
  enabled: boolean;
  hueShift?: number;
  satShift?: number;
  lightShift?: number;
}

export interface ParticleAppearanceConfig {
  enabled: boolean;
  baseSize: number;
  sizeRange?: [number, number];
  sizeVariance?: number;
  glowRadius: number;
  glowVariance?: number;
}

export interface ParticleMotionConfig {
  enabled: boolean;
  formation: ParticleFormation;
  behavior: ParticleBehavior;
  spacing: number;
  spacingVariance?: number;
  countMultiplier?: number;
}

export interface PathData {
  d: string;
  color: string;
}

export interface ParticleConfig {
  canvasWidth: number;
  canvasHeight: number;
  variance: VarianceLevel;
  timing: ParticleTimingConfig;
  colors: ParticleColorConfig;
  appearance: ParticleAppearanceConfig;
  motion: ParticleMotionConfig;
  paths: PathData[];
  easingFunction?: EasingFunction;
  loop: boolean;
  prefersReducedMotion?: boolean;
}

// ============================================================================
// Engine Lifecycle Hooks
// ============================================================================

export interface EngineHooks {
  onStateChange?: (state: AnimationState) => void;
  onEntranceComplete?: () => void;
  onExitComplete?: () => void;
  onRestart?: () => void;
  beforeUpdate?: (timestamp: number) => void;
  afterUpdate?: (timestamp: number) => void;
}

// ============================================================================
// Color Utilities
// ============================================================================

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface ColorPalette {
  cyan: string;
  purple: string;
  pink: string;
}
