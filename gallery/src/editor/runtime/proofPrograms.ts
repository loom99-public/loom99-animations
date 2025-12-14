/**
 * Proof Programs
 *
 * Hardcoded programs to validate the runtime works correctly.
 * These test: effects, composition, stable IDs, time-driven rendering.
 */

import type { Program, TimelineHint } from '../compiler/types';
import type { RenderTree, DrawNode } from './renderTree';
import { group, path, circle, withOpacity, withTransform2D } from './renderTree';

// =============================================================================
// Proof Program 1: Pulsing Line
// =============================================================================

/**
 * Simple pulsing line - tests opacity effect and time-driven rendering.
 * This is an infinite animation - it loops continuously.
 */
export const pulsingLineProgram: Program<RenderTree> = {
  signal(tMs) {
    const t = tMs / 1000;
    const opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2));

    return withOpacity('pulse', opacity,
      path('line', 'M 100 200 L 700 200', {
        stroke: '#4a9eff',
        strokeWidth: 4,
        strokeLinecap: 'round',
      })
    );
  },
  event() {
    return [];
  },
  timeline(): TimelineHint {
    // Pulsing is infinite, but we suggest a 3s preview window (one full pulse cycle)
    return {
      kind: 'infinite',
      recommendedLoop: 'loop',
      windowMs: 3141, // ~PI seconds for one full sine cycle
    };
  },
};

// =============================================================================
// Proof Program 2: Bouncing Circle
// =============================================================================

/**
 * Bouncing circle - tests transform2d effect.
 */
export const bouncingCircleProgram: Program<RenderTree> = {
  signal(tMs) {
    const t = tMs / 1000;
    const y = Math.sin(t * 3) * 100;
    const scale = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(t * 6));

    return withTransform2D(
      'bounce',
      {
        translate: { x: 400, y: 300 + y },
        scale,
      },
      circle('ball', 0, 0, 50, {
        fill: '#ff6b6b',
        stroke: '#fff',
        strokeWidth: 2,
      })
    );
  },
  event() {
    return [];
  },
};

// =============================================================================
// Proof Program 3: Composed Effects
// =============================================================================

/**
 * Multiple effects composed - tests effect composition law.
 * Parent opacity 0.5 * child opacity 0.5 = 0.25 effective opacity.
 */
export const composedEffectsProgram: Program<RenderTree> = {
  signal(tMs) {
    const t = tMs / 1000;
    const rotation = t * 30; // 30 degrees per second
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);

    return withOpacity(
      'outer-opacity',
      0.5,
      withTransform2D(
        'rotate',
        {
          rotate: rotation,
          origin: { x: 400, y: 300 },
        },
        group('shapes', [
          withOpacity(
            'inner-opacity',
            pulse,
            path('arm1', 'M 400 300 L 400 150', {
              stroke: '#4ecdc4',
              strokeWidth: 6,
              strokeLinecap: 'round',
            })
          ),
          path('arm2', 'M 400 300 L 550 300', {
            stroke: '#ff6b6b',
            strokeWidth: 6,
            strokeLinecap: 'round',
          }),
          circle('center', 400, 300, 20, {
            fill: '#ffd93d',
            stroke: '#fff',
            strokeWidth: 2,
          }),
        ])
      )
    );
  },
  event() {
    return [];
  },
};

// =============================================================================
// Proof Program 4: Line Drawing Animation
// =============================================================================

// Line drawing animation constants
const LINE_DRAWING_DURATION_MS = 3000; // 3 seconds for full draw
const LINE_DRAWING_HOLD_MS = 1500; // 1.5 second hold at end
const LINE_DRAWING_TOTAL_MS = LINE_DRAWING_DURATION_MS + LINE_DRAWING_HOLD_MS;

/**
 * Line drawing effect using stroke-dasharray/dashoffset.
 * Tests style animation over time.
 * This is a FINITE animation with entrance + hold phases.
 */
export const lineDrawingProgram: Program<RenderTree> = {
  signal(tMs) {
    const t = tMs / 1000;
    const duration = LINE_DRAWING_DURATION_MS / 1000;
    const progress = Math.min(1, t / duration);

    // Approximate path length
    const pathLength = 1000;

    // Multiple lines with staggered start
    const lines: DrawNode[] = [];
    const lineCount = 5;

    for (let i = 0; i < lineCount; i++) {
      const lineProgress = Math.max(0, Math.min(1, (progress * lineCount - i) / 1));
      const lineDashOffset = pathLength * (1 - lineProgress);
      const y = 150 + i * 80;

      lines.push(
        path(`line-${i}`, `M 100 ${y} Q 400 ${y - 50} 700 ${y}`, {
          stroke: `hsl(${200 + i * 30}, 70%, 60%)`,
          strokeWidth: 4,
          strokeLinecap: 'round',
          strokeDasharray: String(pathLength),
          strokeDashoffset: lineDashOffset,
        })
      );
    }

    return group('drawing', lines);
  },
  event() {
    return [];
  },
  timeline(): TimelineHint {
    return {
      kind: 'finite',
      durationMs: LINE_DRAWING_TOTAL_MS,
      recommendedLoop: 'loop',
      cuePoints: [
        { tMs: 0, label: 'Entrance Start', kind: 'phase' },
        { tMs: LINE_DRAWING_DURATION_MS, label: 'Hold', kind: 'phase' },
        { tMs: LINE_DRAWING_TOTAL_MS, label: 'End', kind: 'phase' },
      ],
    };
  },
};

// =============================================================================
// Proof Program 5: Particles
// =============================================================================

/**
 * Simple particle system - tests many elements with individual transforms.
 */
export const particlesProgram: Program<RenderTree> = {
  signal(tMs) {
    const t = tMs / 1000;
    const particleCount = 20;
    const particles: DrawNode[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Each particle has unique phase
      const phase = (i / particleCount) * Math.PI * 2;
      const speed = 0.5 + (i % 5) * 0.3;

      // Circular motion with varying radius
      const radius = 100 + Math.sin(t * speed + phase) * 50;
      const angle = t * speed + phase;
      const x = 400 + Math.cos(angle) * radius;
      const y = 300 + Math.sin(angle) * radius;

      // Size pulses
      const size = 5 + Math.sin(t * 2 + phase) * 3;

      // Opacity based on position
      const opacity = 0.5 + 0.5 * Math.sin(t + phase);

      particles.push(
        withOpacity(
          `particle-opacity-${i}`,
          opacity,
          circle(`particle-${i}`, x, y, size, {
            fill: `hsl(${(i * 18) % 360}, 70%, 60%)`,
            stroke: 'none',
          })
        )
      );
    }

    return group('particles', particles);
  },
  event() {
    return [];
  },
};

// =============================================================================
// All Proof Programs
// =============================================================================

export const PROOF_PROGRAMS = {
  pulsingLine: pulsingLineProgram,
  bouncingCircle: bouncingCircleProgram,
  composedEffects: composedEffectsProgram,
  lineDrawing: lineDrawingProgram,
  particles: particlesProgram,
} as const;

export type ProofProgramName = keyof typeof PROOF_PROGRAMS;
