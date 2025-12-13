/**
 * V4 Path Morph Animation - Mode System
 *
 * Per ui_example_docs/03-morph.md:
 * - original: fixed timing, centered start shapes
 * - varied: randomized timing, varied shapes and colors
 * - procedural: aggressive variance, diverse shapes
 */

import type { Field, Color, StartShapeSpec, StartShapeKind, Env } from './types';
import type { Seed } from '../../core/types';
import { createPRNG } from '../../core/rand';
import { getPathBounds, defaultStartSizeFromBounds } from './geometry';

// =============================================================================
// Mode Fields Interface
// =============================================================================

export interface PathMorphModeFields {
  delay: Field<number>;
  duration: Field<number>;
  startShape: Field<StartShapeSpec>;
  color: Field<Color>;
  opacity: Field<number>;
}

// =============================================================================
// Mode System
// =============================================================================

export interface ModeSystem {
  resolve(): { fields: PathMorphModeFields };
}

// =============================================================================
// Original Mode
// =============================================================================

function createOriginalFields(): PathMorphModeFields {
  return {
    delay: (_seed, index, count) => {
      // Staggered delays: 0 to 0.5s spread over all paths
      return (index / count) * 0.5;
    },

    duration: () => 1.2,

    startShape: (_seed, index, _count, _env) => {
      // Circle at center, alternating between shapes by index
      const kinds: StartShapeKind[] = ['circle', 'square', 'triangle'];
      return {
        kind: kinds[index % kinds.length],
        center: { x: 0, y: 0 }, // Will be set to path center in compiler
        size: 0, // Will be computed from bounds
        rot: 0,
      };
    },

    color: (_seed, _index, _count, _env) => {
      // Default cyan color for original
      return { kind: 'hex', value: '#00d4ff' };
    },

    opacity: () => 1,
  };
}

// =============================================================================
// Varied Mode
// =============================================================================

function createVariedFields(): PathMorphModeFields {
  return {
    delay: (seed, index, count) => {
      const rng = createPRNG(seed + index * 1000);
      const baseDelay = (index / count) * 0.6;
      const variance = (rng.next() - 0.5) * 0.2;
      return Math.max(0, baseDelay + variance);
    },

    duration: (seed, index) => {
      const rng = createPRNG(seed + index * 2000);
      return 0.8 + rng.next() * 1.2; // 0.8 to 2.0 seconds
    },

    startShape: (seed, index, _count, _env) => {
      const rng = createPRNG(seed + index * 3000);
      const kinds: StartShapeKind[] = ['circle', 'square', 'triangle', 'star', 'polygon'];
      const kind = kinds[Math.floor(rng.next() * kinds.length)];

      return {
        kind,
        center: { x: 0, y: 0 }, // Will be set to path center
        size: 0, // Will be computed from bounds with variance
        sides: kind === 'polygon' ? 3 + Math.floor(rng.next() * 6) : undefined,
        rot: (rng.next() - 0.5) * Math.PI * 0.25,
      };
    },

    color: (seed, index, _count, _env) => {
      const rng = createPRNG(seed + index * 4000);
      // Varied palette with hue shifting
      const baseHue = [190, 270, 340][index % 3]; // cyan, purple, pink
      const hueShift = (rng.next() - 0.5) * 30;
      return {
        kind: 'hsl',
        h: (baseHue + hueShift + 360) % 360,
        s: 80 + rng.next() * 20,
        l: 50 + rng.next() * 10,
      };
    },

    opacity: (seed, index) => {
      const rng = createPRNG(seed + index * 5000);
      return 0.85 + rng.next() * 0.15;
    },
  };
}

// =============================================================================
// Procedural Mode
// =============================================================================

function createProceduralFields(): PathMorphModeFields {
  return {
    delay: (seed, index, count) => {
      const rng = createPRNG(seed + index * 1000);
      const baseDelay = (index / count) * 0.8;
      const variance = (rng.next() - 0.5) * 0.4;
      return Math.max(0, baseDelay + variance);
    },

    duration: (seed, index) => {
      const rng = createPRNG(seed + index * 2000);
      return 0.6 + rng.next() * 1.8; // 0.6 to 2.4 seconds
    },

    startShape: (seed, index, _count, _env) => {
      const rng = createPRNG(seed + index * 3000);
      const kinds: StartShapeKind[] = ['circle', 'square', 'triangle', 'star', 'polygon'];
      const kind = kinds[Math.floor(rng.next() * kinds.length)];

      return {
        kind,
        center: { x: 0, y: 0 }, // Will be set with offset
        size: 0, // Will be computed with variance
        sides: kind === 'polygon' ? 3 + Math.floor(rng.next() * 6) : undefined,
        rot: rng.next() * Math.PI * 2, // Full rotation range
      };
    },

    color: (seed, index, count, _env) => {
      const rng = createPRNG(seed + index * 4000);

      // Pick a palette based on seed
      const paletteRng = createPRNG(seed);
      const palettes = [
        [190, 210, 230], // Cool blues
        [260, 280, 300], // Purples
        [330, 350, 10],  // Pinks/reds
        [40, 60, 80],    // Warm yellows
        [150, 170, 190], // Teals
      ];
      const palette = palettes[Math.floor(paletteRng.next() * palettes.length)];

      const baseHue = palette[index % palette.length];
      const hueShift = (rng.next() - 0.5) * 40;

      return {
        kind: 'hsl',
        h: (baseHue + hueShift + 360) % 360,
        s: 70 + rng.next() * 30,
        l: 45 + rng.next() * 20,
      };
    },

    opacity: (seed, index) => {
      const rng = createPRNG(seed + index * 5000);
      return 0.7 + rng.next() * 0.3;
    },
  };
}

// =============================================================================
// Mode System Factory
// =============================================================================

export function createModeSystem(variant: 'original' | 'varied' | 'procedural'): ModeSystem {
  const fields = variant === 'original'
    ? createOriginalFields()
    : variant === 'varied'
      ? createVariedFields()
      : createProceduralFields();

  return {
    resolve: () => ({ fields }),
  };
}
