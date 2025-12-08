/**
 * Animation factory exports
 * Each factory creates animations for a specific technique
 */

export { createLineDrawingAnimation, createLineDrawingExit } from './LineDrawingAnimation';
export type { LineDefinition, LineDrawingConfig } from './LineDrawingAnimation';

export { createParticleAnimation, addParticleExit } from './ParticleAnimation';
export type { ParticlePoint, ParticleAnimationConfig } from './ParticleAnimation';

export { createLiquidAnimation, addLiquidExit } from './LiquidAnimation';
export type { BlobPoint, LiquidAnimationConfig } from './LiquidAnimation';

export type { VarianceLevel } from './LineDrawingAnimation';
