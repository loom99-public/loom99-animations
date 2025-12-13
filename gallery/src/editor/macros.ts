/**
 * Macro Expansion System
 *
 * Macros are "recipe starters" that expand into multiple primitive blocks
 * with pre-wired connections. When a macro is dropped, the user sees all
 * the individual blocks - nothing is hidden.
 *
 * Think of it like a modular synth preset: you load it and see all the
 * modules and patch cables, ready to tweak.
 */

import type { LaneKind } from './types';

/**
 * A block placement in a macro expansion.
 */
export interface MacroBlock {
  /** Temporary ID for wiring (not the final block ID) */
  ref: string;
  /** Block type to create */
  type: string;
  /** Which lane kind to place in */
  laneKind: LaneKind;
  /** Optional custom label */
  label?: string;
  /** Optional params override */
  params?: Record<string, unknown>;
}

/**
 * A connection in a macro expansion.
 * Uses ref IDs that map to MacroBlock.ref
 */
export interface MacroConnection {
  fromRef: string;
  fromSlot: string;
  toRef: string;
  toSlot: string;
}

/**
 * A macro expansion definition.
 */
export interface MacroExpansion {
  /** Blocks to create */
  blocks: MacroBlock[];
  /** Connections to wire */
  connections: MacroConnection[];
}

/**
 * Registry of macro expansions.
 * Key is the block type that triggers expansion.
 */
export const MACRO_REGISTRY: Record<string, MacroExpansion> = {
  // Line Drawing macro - animates particles from random positions to scene targets
  'macro:lineDrawing': {
    blocks: [
      // Scene
      { ref: 'scene', type: 'SVGPathSource', laneKind: 'Scene', label: 'SVG Paths' },
      { ref: 'targets', type: 'SceneToTargets', laneKind: 'Scene', label: 'Sample Targets' },
      { ref: 'count', type: 'elementCount', laneKind: 'Scene', label: 'Element Count' },

      // Fields
      { ref: 'origins', type: 'regionField', laneKind: 'Fields', label: 'Start Positions', params: { x: 0, y: 0, width: 400, height: 300 } },
      { ref: 'delays', type: 'LinearStagger', laneKind: 'Fields', label: 'Stagger Delays', params: { baseStagger: 0.05, jitter: 0.2 } },
      { ref: 'durations', type: 'constantFieldDuration', laneKind: 'Fields', label: 'Durations', params: { duration: 0.8 } },

      // Phase
      { ref: 'phase', type: 'PhaseMachine', laneKind: 'Phase', label: 'Animation Phases', params: { entranceDuration: 2.5, holdDuration: 1.5, exitDuration: 0.5 } },

      // Compose
      { ref: 'progress', type: 'perElementProgress', laneKind: 'Spec', label: 'Per-Element Progress' },
      { ref: 'lerp', type: 'lerpPoints', laneKind: 'Spec', label: 'Lerp Positions' },

      // Render
      { ref: 'glow', type: 'glowFilter', laneKind: 'Program', label: 'Glow Effect', params: { color: '#ffffff', blur: 10, intensity: 2 } },
      { ref: 'circles', type: 'perElementCircles', laneKind: 'Program', label: 'Render Circles', params: { radius: 3, fill: '#ffffff', opacity: 1 } },

      // Output
      { ref: 'canvas', type: 'canvas', laneKind: 'Output', label: 'Canvas', params: { width: 400, height: 300, background: '#1a1a1a' } },
    ],
    connections: [
      // Scene flow
      { fromRef: 'scene', fromSlot: 'scene', toRef: 'targets', toSlot: 'scene' },
      { fromRef: 'targets', fromSlot: 'targets', toRef: 'count', toSlot: 'targets' },
      { fromRef: 'targets', fromSlot: 'targets', toRef: 'lerp', toSlot: 'ends' },

      // Fields to compose
      { fromRef: 'origins', fromSlot: 'positions', toRef: 'lerp', toSlot: 'starts' },
      { fromRef: 'delays', fromSlot: 'delays', toRef: 'progress', toSlot: 'delays' },
      { fromRef: 'durations', fromSlot: 'durations', toRef: 'progress', toSlot: 'durations' },

      // Phase to compose
      { fromRef: 'phase', fromSlot: 'phase', toRef: 'progress', toSlot: 'phase' },

      // Compose chain
      { fromRef: 'progress', fromSlot: 'progress', toRef: 'lerp', toSlot: 'progress' },

      // Render chain
      { fromRef: 'lerp', fromSlot: 'positions', toRef: 'circles', toSlot: 'positions' },
      { fromRef: 'count', fromSlot: 'count', toRef: 'circles', toSlot: 'count' },
      { fromRef: 'glow', fromSlot: 'filter', toRef: 'circles', toSlot: 'filter' },
      { fromRef: 'circles', fromSlot: 'tree', toRef: 'canvas', toSlot: 'render' },
    ],
  },

  // Particles macro - similar to lineDrawing but with different styling
  'macro:particles': {
    blocks: [
      // Scene
      { ref: 'scene', type: 'SVGPathSource', laneKind: 'Scene', label: 'SVG Paths' },
      { ref: 'targets', type: 'SceneToTargets', laneKind: 'Scene', label: 'Sample Targets' },
      { ref: 'count', type: 'elementCount', laneKind: 'Scene', label: 'Element Count' },

      // Fields
      { ref: 'origins', type: 'regionField', laneKind: 'Fields', label: 'Spawn Region', params: { x: -50, y: -50, width: 500, height: 400 } },
      { ref: 'delays', type: 'LinearStagger', laneKind: 'Fields', label: 'Stagger', params: { baseStagger: 0.02, jitter: 0.3 } },
      { ref: 'durations', type: 'constantFieldDuration', laneKind: 'Fields', label: 'Travel Time', params: { duration: 1.2 } },

      // Phase
      { ref: 'phase', type: 'PhaseMachine', laneKind: 'Phase', label: 'Phases', params: { entranceDuration: 3.0, holdDuration: 2.0, exitDuration: 0.8 } },

      // Compose
      { ref: 'progress', type: 'perElementProgress', laneKind: 'Spec', label: 'Particle Progress' },
      { ref: 'lerp', type: 'lerpPoints', laneKind: 'Spec', label: 'Particle Motion' },

      // Render
      { ref: 'glow', type: 'glowFilter', laneKind: 'Program', label: 'Particle Glow', params: { color: '#00ffff', blur: 15, intensity: 3 } },
      { ref: 'circles', type: 'perElementCircles', laneKind: 'Program', label: 'Particles', params: { radius: 2.5, fill: '#00ffff', opacity: 0.9 } },

      // Output
      { ref: 'canvas', type: 'canvas', laneKind: 'Output', label: 'Canvas', params: { width: 400, height: 300, background: '#0a0a0a' } },
    ],
    connections: [
      { fromRef: 'scene', fromSlot: 'scene', toRef: 'targets', toSlot: 'scene' },
      { fromRef: 'targets', fromSlot: 'targets', toRef: 'count', toSlot: 'targets' },
      { fromRef: 'targets', fromSlot: 'targets', toRef: 'lerp', toSlot: 'ends' },
      { fromRef: 'origins', fromSlot: 'positions', toRef: 'lerp', toSlot: 'starts' },
      { fromRef: 'delays', fromSlot: 'delays', toRef: 'progress', toSlot: 'delays' },
      { fromRef: 'durations', fromSlot: 'durations', toRef: 'progress', toSlot: 'durations' },
      { fromRef: 'phase', fromSlot: 'phase', toRef: 'progress', toSlot: 'phase' },
      { fromRef: 'progress', fromSlot: 'progress', toRef: 'lerp', toSlot: 'progress' },
      { fromRef: 'lerp', fromSlot: 'positions', toRef: 'circles', toSlot: 'positions' },
      { fromRef: 'count', fromSlot: 'count', toRef: 'circles', toSlot: 'count' },
      { fromRef: 'glow', fromSlot: 'filter', toRef: 'circles', toSlot: 'filter' },
      { fromRef: 'circles', fromSlot: 'tree', toRef: 'canvas', toSlot: 'render' },
    ],
  },

  // Bouncing Circle macro - simple oscillating circle
  'macro:bouncingCircle': {
    blocks: [
      { ref: 'phase', type: 'PhaseMachine', laneKind: 'Phase', label: 'Timing', params: { entranceDuration: 5.0, holdDuration: 0, exitDuration: 0 } },
      { ref: 'progress', type: 'phaseProgress', laneKind: 'Phase', label: 'Progress' },
      { ref: 'glow', type: 'glowFilter', laneKind: 'Program', label: 'Glow', params: { color: '#ff6600', blur: 20, intensity: 2.5 } },
      { ref: 'canvas', type: 'canvas', laneKind: 'Output', label: 'Canvas', params: { width: 400, height: 300, background: '#1a1a1a' } },
    ],
    connections: [
      { fromRef: 'phase', fromSlot: 'phase', toRef: 'progress', toSlot: 'phase' },
    ],
  },

  // Oscillator macro - math-driven animation
  'macro:oscillator': {
    blocks: [
      { ref: 'speed', type: 'math.constNumber', laneKind: 'Scalars', label: 'Speed', params: { value: 2 } },
      { ref: 'amp', type: 'math.constNumber', laneKind: 'Scalars', label: 'Amplitude', params: { value: 50 } },
      { ref: 'phase', type: 'PhaseMachine', laneKind: 'Phase', label: 'Timing', params: { entranceDuration: 5.0, holdDuration: 0, exitDuration: 0 } },
      { ref: 'progress', type: 'phaseProgress', laneKind: 'Phase', label: 'Progress' },
      { ref: 'glow', type: 'glowFilter', laneKind: 'Program', label: 'Glow', params: { color: '#00ff00', blur: 15, intensity: 2 } },
      { ref: 'canvas', type: 'canvas', laneKind: 'Output', label: 'Canvas', params: { width: 400, height: 300, background: '#0a0a0a' } },
    ],
    connections: [
      { fromRef: 'phase', fromSlot: 'phase', toRef: 'progress', toSlot: 'phase' },
    ],
  },

  // =============================================================================
  // Animation Style Macros (Using PerElementTransport)
  // =============================================================================

  // Radial Burst - particles explode from center, then converge to form shape
  'macro:radialBurst': {
    blocks: [
      // Scene
      { ref: 'scene', type: 'SVGPathSource', laneKind: 'Scene', label: 'Logo Paths', params: { target: 'logo' } },

      // Fields - radial origin from center
      { ref: 'positions', type: 'RadialOrigin', laneKind: 'Fields', label: 'Radial Start',
        params: { centerX: 200, centerY: 150, minRadius: 50, maxRadius: 100, spread: 0.3 } },
      { ref: 'delays', type: 'LinearStagger', laneKind: 'Fields', label: 'Burst Stagger',
        params: { baseStagger: 0.01, jitter: 0.1 } },

      // Phase - fast entrance, medium hold, quick exit
      { ref: 'phase', type: 'PhaseMachine', laneKind: 'Phase', label: 'Burst Timing',
        params: { entranceDuration: 1.8, holdDuration: 2.0, exitDuration: 0.6 } },

      // Compose - per-element transport
      { ref: 'transport', type: 'PerElementTransport', laneKind: 'Spec', label: 'Particle Transport' },

      // Output
      { ref: 'output', type: 'outputProgram', laneKind: 'Output', label: 'Output' },
    ],
    connections: [
      { fromRef: 'scene', fromSlot: 'scene', toRef: 'transport', toSlot: 'targets' },
      { fromRef: 'positions', fromSlot: 'positions', toRef: 'transport', toSlot: 'positions' },
      { fromRef: 'delays', fromSlot: 'delays', toRef: 'transport', toSlot: 'delays' },
      { fromRef: 'phase', fromSlot: 'phase', toRef: 'transport', toSlot: 'phase' },
      { fromRef: 'transport', fromSlot: 'program', toRef: 'output', toSlot: 'program' },
    ],
  },

  // Cascade - particles fall from top like waterfall
  'macro:cascade': {
    blocks: [
      // Scene
      { ref: 'scene', type: 'SVGPathSource', laneKind: 'Scene', label: 'Text Paths', params: { target: 'text' } },

      // Fields - particles start from top of screen
      { ref: 'positions', type: 'regionField', laneKind: 'Fields', label: 'Top Spawn',
        params: { x: 0, y: -100, width: 800, height: 50 } },
      { ref: 'delays', type: 'LinearStagger', laneKind: 'Fields', label: 'Cascade Delay',
        params: { baseStagger: 0.015, jitter: 0.25 } },

      // Phase - longer entrance for cascade effect
      { ref: 'phase', type: 'PhaseMachine', laneKind: 'Phase', label: 'Cascade Timing',
        params: { entranceDuration: 3.5, holdDuration: 1.5, exitDuration: 0.8 } },

      // Compose
      { ref: 'transport', type: 'PerElementTransport', laneKind: 'Spec', label: 'Cascade Motion' },

      // Output
      { ref: 'output', type: 'outputProgram', laneKind: 'Output', label: 'Output' },
    ],
    connections: [
      { fromRef: 'scene', fromSlot: 'scene', toRef: 'transport', toSlot: 'targets' },
      { fromRef: 'positions', fromSlot: 'positions', toRef: 'transport', toSlot: 'positions' },
      { fromRef: 'delays', fromSlot: 'delays', toRef: 'transport', toSlot: 'delays' },
      { fromRef: 'phase', fromSlot: 'phase', toRef: 'transport', toSlot: 'phase' },
      { fromRef: 'transport', fromSlot: 'program', toRef: 'output', toSlot: 'program' },
    ],
  },

  // Scatter - particles start scattered across screen, slow convergence
  'macro:scatter': {
    blocks: [
      // Scene
      { ref: 'scene', type: 'SVGPathSource', laneKind: 'Scene', label: 'Logo Paths', params: { target: 'logo' } },

      // Fields - wide random scatter
      { ref: 'positions', type: 'regionField', laneKind: 'Fields', label: 'Scattered Start',
        params: { x: -100, y: -100, width: 1000, height: 800 } },
      { ref: 'delays', type: 'LinearStagger', laneKind: 'Fields', label: 'Random Stagger',
        params: { baseStagger: 0.008, jitter: 0.6 } },

      // Phase - slow, dreamy entrance
      { ref: 'phase', type: 'PhaseMachine', laneKind: 'Phase', label: 'Slow Timing',
        params: { entranceDuration: 4.0, holdDuration: 2.5, exitDuration: 1.0 } },

      // Compose
      { ref: 'transport', type: 'PerElementTransport', laneKind: 'Spec', label: 'Gather Motion' },

      // Output
      { ref: 'output', type: 'outputProgram', laneKind: 'Output', label: 'Output' },
    ],
    connections: [
      { fromRef: 'scene', fromSlot: 'scene', toRef: 'transport', toSlot: 'targets' },
      { fromRef: 'positions', fromSlot: 'positions', toRef: 'transport', toSlot: 'positions' },
      { fromRef: 'delays', fromSlot: 'delays', toRef: 'transport', toSlot: 'delays' },
      { fromRef: 'phase', fromSlot: 'phase', toRef: 'transport', toSlot: 'phase' },
      { fromRef: 'transport', fromSlot: 'program', toRef: 'output', toSlot: 'program' },
    ],
  },

  // Implosion - particles start far away on all sides, converge to center
  'macro:implosion': {
    blocks: [
      // Scene
      { ref: 'scene', type: 'SVGPathSource', laneKind: 'Scene', label: 'Logo Paths', params: { target: 'logo' } },

      // Fields - radial origin with large radius
      { ref: 'positions', type: 'RadialOrigin', laneKind: 'Fields', label: 'Outer Ring',
        params: { centerX: 200, centerY: 150, minRadius: 300, maxRadius: 500, spread: 1.0 } },
      { ref: 'delays', type: 'LinearStagger', laneKind: 'Fields', label: 'Wave Stagger',
        params: { baseStagger: 0.02, jitter: 0.15 } },

      // Phase - dramatic entrance
      { ref: 'phase', type: 'PhaseMachine', laneKind: 'Phase', label: 'Implosion Timing',
        params: { entranceDuration: 2.0, holdDuration: 2.0, exitDuration: 0.5 } },

      // Compose
      { ref: 'transport', type: 'PerElementTransport', laneKind: 'Spec', label: 'Implosion' },

      // Output
      { ref: 'output', type: 'outputProgram', laneKind: 'Output', label: 'Output' },
    ],
    connections: [
      { fromRef: 'scene', fromSlot: 'scene', toRef: 'transport', toSlot: 'targets' },
      { fromRef: 'positions', fromSlot: 'positions', toRef: 'transport', toSlot: 'positions' },
      { fromRef: 'delays', fromSlot: 'delays', toRef: 'transport', toSlot: 'delays' },
      { fromRef: 'phase', fromSlot: 'phase', toRef: 'transport', toSlot: 'phase' },
      { fromRef: 'transport', fromSlot: 'program', toRef: 'output', toSlot: 'program' },
    ],
  },

  // Swarm - particles emerge from bottom corners, swarm to form shape
  'macro:swarm': {
    blocks: [
      // Scene
      { ref: 'scene', type: 'SVGPathSource', laneKind: 'Scene', label: 'Text Paths', params: { target: 'text' } },

      // Fields - bottom corners spawn area
      { ref: 'positions', type: 'regionField', laneKind: 'Fields', label: 'Corner Spawn',
        params: { x: -50, y: 350, width: 900, height: 150 } },
      { ref: 'delays', type: 'LinearStagger', laneKind: 'Fields', label: 'Swarm Delay',
        params: { baseStagger: 0.005, jitter: 0.4 } },

      // Phase - quick swarm
      { ref: 'phase', type: 'PhaseMachine', laneKind: 'Phase', label: 'Swarm Timing',
        params: { entranceDuration: 2.2, holdDuration: 1.8, exitDuration: 0.6 } },

      // Compose
      { ref: 'transport', type: 'PerElementTransport', laneKind: 'Spec', label: 'Swarm Motion' },

      // Output
      { ref: 'output', type: 'outputProgram', laneKind: 'Output', label: 'Output' },
    ],
    connections: [
      { fromRef: 'scene', fromSlot: 'scene', toRef: 'transport', toSlot: 'targets' },
      { fromRef: 'positions', fromSlot: 'positions', toRef: 'transport', toSlot: 'positions' },
      { fromRef: 'delays', fromSlot: 'delays', toRef: 'transport', toSlot: 'delays' },
      { fromRef: 'phase', fromSlot: 'phase', toRef: 'transport', toSlot: 'phase' },
      { fromRef: 'transport', fromSlot: 'program', toRef: 'output', toSlot: 'program' },
    ],
  },
};

/**
 * Check if a block type with given params should trigger macro expansion.
 * Returns the macro key if expansion should happen, null otherwise.
 *
 * Handles both:
 * - `macro:*` types from the block palette
 * - `demoProgram` with variant param from the demo menu
 */
export function getMacroKey(blockType: string, params?: Record<string, unknown>): string | null {
  // Direct macro type from palette (e.g., 'macro:lineDrawing')
  if (blockType.startsWith('macro:')) {
    if (blockType in MACRO_REGISTRY) {
      return blockType;
    }
  }

  // Legacy demoProgram with variant param (from demo menu)
  if (blockType === 'demoProgram') {
    const variant = params?.variant as string ?? 'lineDrawing';
    const key = `macro:${variant}`;
    if (key in MACRO_REGISTRY) {
      return key;
    }
  }

  return null;
}

/**
 * Get macro expansion for a given key.
 */
export function getMacroExpansion(key: string): MacroExpansion | null {
  return MACRO_REGISTRY[key] ?? null;
}
