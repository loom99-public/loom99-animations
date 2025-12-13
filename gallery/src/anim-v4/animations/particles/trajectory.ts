/**
 * V4 Particles Animation - Trajectory
 *
 * Pure geometry math for particle motion.
 * Based on ui_example_docs/particle.md
 *
 * Key properties:
 * - No timing
 * - No randomness
 * - No phase logic
 * - Pure geometry math only
 * - position(u=1) === target (guaranteed convergence)
 */

import type { Vec2 } from '../../core/types';
import type { ParticleBehavior } from './types';

// =============================================================================
// Vector Utilities
// =============================================================================

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v: Vec2): Vec2 {
  const len = length(v);
  return len > 0 ? scale(v, 1 / len) : { x: 0, y: 0 };
}

/**
 * Perpendicular vector (rotate 90 degrees CCW)
 */
function perp(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

/**
 * Rotate a vector by angle (radians)
 */
function rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

// =============================================================================
// Behavior Offset Functions
// =============================================================================

/**
 * Compute offset for no behavior (baseline).
 */
function offsetNone(): Vec2 {
  return { x: 0, y: 0 };
}

/**
 * Compute offset for spiral behavior.
 * Particles arc gracefully into place.
 *
 * angle(u) = 2π * turns * (1 - u)
 * radius(u) = maxRadius * (1 - u)
 */
function offsetSpiral(
  u: number,
  start: Vec2,
  target: Vec2,
  turns: number,
  maxRadius: number
): Vec2 {
  const dir = sub(target, start);
  const perpDir = normalize(perp(dir));

  const angle = 2 * Math.PI * turns * (1 - u);
  const radius = maxRadius * (1 - u);

  const rotated = rotate(perpDir, angle);
  return scale(rotated, radius);
}

/**
 * Compute offset for wave behavior.
 * Particles wobble as they travel.
 *
 * offset = normal * amplitude * sin(2π * frequency * u + phase) * (1 - u)
 */
function offsetWave(
  u: number,
  start: Vec2,
  target: Vec2,
  amplitude: number,
  frequency: number,
  index: number
): Vec2 {
  const dir = sub(target, start);
  const perpDir = normalize(perp(dir));

  // Index-based phase prevents clumping
  const phaseStride = 0.1;
  const phase = index * phaseStride;

  const wave = Math.sin(2 * Math.PI * frequency * u + phase);
  const decay = 1 - u;

  return scale(perpDir, amplitude * wave * decay);
}

/**
 * Compute offset for jitter behavior.
 * Subtle life, not chaos.
 *
 * Direction is seeded from index (deterministic).
 */
function offsetJitter(
  u: number,
  strength: number,
  index: number
): Vec2 {
  // Deterministic direction from index
  const angle = (index * 2.399963) % (2 * Math.PI); // Golden angle
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };

  const decay = 1 - u;
  return scale(dir, strength * decay);
}

// =============================================================================
// Trajectory Interface
// =============================================================================

export interface ParticleTrajectory {
  /**
   * Compute particle position at normalized progress u ∈ [0,1]
   * u is already eased and phase-adjusted
   */
  position(
    u: number,
    start: Vec2,
    target: Vec2,
    behavior: ParticleBehavior,
    index: number
  ): Vec2;

  /**
   * Compute opacity at progress u
   */
  opacity(
    u: number,
    baseOpacity: number
  ): number;
}

// =============================================================================
// Canonical Trajectory Implementation
// =============================================================================

/**
 * The canonical particle trajectory.
 * All motion is built on: base(u) = lerp(start, target, u)
 * Behaviors add bounded, converging offsets.
 */
export const canonicalTrajectory: ParticleTrajectory = {
  position(
    u: number,
    start: Vec2,
    target: Vec2,
    behavior: ParticleBehavior,
    index: number
  ): Vec2 {
    // Base trajectory (invariant spine)
    const base = lerp(start, target, u);

    // Compute behavior offset
    let offset: Vec2;
    switch (behavior.kind) {
      case 'none':
        offset = offsetNone();
        break;
      case 'spiral':
        offset = offsetSpiral(u, start, target, behavior.turns, behavior.radius);
        break;
      case 'wave':
        offset = offsetWave(u, start, target, behavior.amplitude, behavior.frequency, index);
        break;
      case 'jitter':
        offset = offsetJitter(u, behavior.strength, index);
        break;
      default:
        offset = offsetNone();
    }

    return add(base, offset);
  },

  opacity(u: number, baseOpacity: number): number {
    // Fade in during first 20% of progress
    const fadeIn = Math.min(1, u * 5);
    return fadeIn * baseOpacity;
  },
};

// =============================================================================
// Exit Trajectory (reverse motion)
// =============================================================================

/**
 * Trajectory for exit phase - particles scatter outward.
 */
export function exitPosition(
  u: number,
  target: Vec2,
  exitTarget: Vec2
): Vec2 {
  return lerp(target, exitTarget, u);
}

/**
 * Opacity during exit - fade out.
 */
export function exitOpacity(u: number, baseOpacity: number): number {
  return baseOpacity * (1 - u);
}
