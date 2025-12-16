/**
 * V4 Transform3D Animation - Mode System
 *
 * Per ui_example_docs/07-3d-transform.md spec section 10.
 *
 * Modes control:
 * - Entry pose: tilt direction, depth, rotation (tiltLeft, scatter3D, etc.)
 * - Timing: delay/duration patterns (staggered3D, scatter)
 * - Depth feel: how far forward/back (deep, shallow)
 * - Exit: exit direction and spin (shatter, sink)
 * - Variance: procedural (coherent) vs varied (chaotic)
 */

import type { Vec2 } from '../../core/types';
import { createPRNG } from '../../core/rand';
import type { Transform3DFields } from './types';

// =============================================================================
// Mode Types
// =============================================================================

export type EntryPoseMode = 'tiltLeft' | 'tiltRight' | 'flipTop' | 'scatter3D';
export type TimingMode = 'staggered3D' | 'scatterDelay';
export type DepthMode = 'deep' | 'shallow';
export type ExitMode = 'shatter' | 'sink';
export type VarianceMode = 'procedural' | 'varied';

export interface Transform3DModeConfig {
  entryPose: EntryPoseMode;
  timing: TimingMode;
  depth: DepthMode;
  exit: ExitMode;
  variance: VarianceMode;
}

// =============================================================================
// Entry Pose Presets
// =============================================================================

interface EntryPosePreset {
  getTranslate: (rng: ReturnType<typeof createPRNG>, deep: boolean) => Vec2;
  getZ: (rng: ReturnType<typeof createPRNG>, deep: boolean) => number;
  getRotX: (rng: ReturnType<typeof createPRNG>, varied: boolean) => number;
  getRotY: (rng: ReturnType<typeof createPRNG>, varied: boolean) => number;
  getRotZ: (rng: ReturnType<typeof createPRNG>) => number;
  getScale: (rng: ReturnType<typeof createPRNG>) => number;
}

const ENTRY_POSE_PRESETS: Record<EntryPoseMode, EntryPosePreset> = {
  tiltLeft: {
    getTranslate: (rng, _deep) => ({
      x: rng.range(-300, -150),
      y: rng.range(-50, 50),
    }),
    getZ: (rng, _deep) => rng.range(100, 200),
    getRotX: (rng, _varied) => rng.range(-20, 20),
    getRotY: (rng, _varied) => rng.range(-40, -30),
    getRotZ: (rng) => rng.range(-30, 30),
    getScale: (rng) => rng.range(0.6, 0.9),
  },
  tiltRight: {
    getTranslate: (rng, _deep) => ({
      x: rng.range(150, 300),
      y: rng.range(-50, 50),
    }),
    getZ: (rng, _deep) => rng.range(100, 200),
    getRotX: (rng, _varied) => rng.range(-20, 20),
    getRotY: (rng, _varied) => rng.range(30, 40),
    getRotZ: (rng) => rng.range(-30, 30),
    getScale: (rng) => rng.range(0.6, 0.9),
  },
  flipTop: {
    getTranslate: (rng, _deep) => ({
      x: rng.range(-50, 50),
      y: rng.range(-300, -150),
    }),
    getZ: (rng, _deep) => rng.range(80, 180),
    getRotX: (rng, _varied) => rng.range(-40, -30),
    getRotY: (rng, _varied) => rng.range(-15, 15),
    getRotZ: (rng) => rng.range(-20, 20),
    getScale: (rng) => rng.range(0.7, 1.0),
  },
  scatter3D: {
    getTranslate: (rng, _deep) => ({
      x: rng.range(-400, 400),
      y: rng.range(-400, 400),
    }),
    getZ: (rng, _deep) => rng.range(50, 250),
    getRotX: (rng, _varied) => rng.range(-90, 90),
    getRotY: (rng, _varied) => rng.range(-90, 90),
    getRotZ: (rng) => rng.range(-180, 180),
    getScale: (rng) => rng.range(0.4, 1.1),
  },
};

// =============================================================================
// Timing Presets
// =============================================================================

interface TimingPreset {
  delayBase: number;
  delayStagger: number;
  delayJitter: number;
  durationBase: number;
  durationVariance: number;
}

const TIMING_PRESETS: Record<TimingMode, TimingPreset> = {
  staggered3D: {
    delayBase: 0,
    delayStagger: 0.08,    // 80ms between parts
    delayJitter: 0.03,     // ±30ms jitter
    durationBase: 2.5,
    durationVariance: 0.5,
  },
  scatterDelay: {
    delayBase: 0,
    delayStagger: 0,
    delayJitter: 0.8,      // Random 0-800ms
    durationBase: 3.0,
    durationVariance: 1.0,
  },
};

// =============================================================================
// Exit Presets
// =============================================================================

interface ExitPreset {
  getTranslate: (rng: ReturnType<typeof createPRNG>) => Vec2;
  getZ: (rng: ReturnType<typeof createPRNG>) => number;
  getRotX: (rng: ReturnType<typeof createPRNG>) => number;
  getRotY: (rng: ReturnType<typeof createPRNG>) => number;
  getRotZ: (rng: ReturnType<typeof createPRNG>) => number;
}

const EXIT_PRESETS: Record<ExitMode, ExitPreset> = {
  shatter: {
    getTranslate: (rng) => ({
      x: rng.range(-200, 200),
      y: rng.range(-200, 200),
    }),
    getZ: (rng) => rng.range(300, 600),
    getRotX: (rng) => rng.range(-180, 180),
    getRotY: (rng) => rng.range(-180, 180),
    getRotZ: (rng) => rng.range(-360, 360),
  },
  sink: {
    getTranslate: (rng) => ({
      x: rng.range(-30, 30),
      y: rng.range(50, 150),
    }),
    getZ: (rng) => rng.range(-400, -200),
    getRotX: (rng) => rng.range(-30, 30),
    getRotY: (rng) => rng.range(-30, 30),
    getRotZ: (rng) => rng.range(-45, 45),
  },
};

// =============================================================================
// Mode System
// =============================================================================

/**
 * Create Transform3DFields from mode configuration.
 */
export function createTransform3DFields(config: Transform3DModeConfig): Transform3DFields {
  const entryPreset = ENTRY_POSE_PRESETS[config.entryPose];
  const timingPreset = TIMING_PRESETS[config.timing];
  const exitPreset = EXIT_PRESETS[config.exit];
  const isDeep = config.depth === 'deep';
  const isVaried = config.variance === 'varied';

  return {
    delay: (seed, n, _ctx) => {
      const rng = createPRNG(seed);
      return Array.from({ length: n }, (_, i) => {
        const stagger = timingPreset.delayStagger * i;
        const jitter = rng.range(-timingPreset.delayJitter, timingPreset.delayJitter);
        return timingPreset.delayBase + stagger + jitter;
      });
    },

    duration: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 1);
      return Array.from({ length: n }, () =>
        rng.range(
          timingPreset.durationBase - timingPreset.durationVariance,
          timingPreset.durationBase + timingPreset.durationVariance
        )
      );
    },

    entryTranslate: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 2);
      return Array.from({ length: n }, () => entryPreset.getTranslate(rng, isDeep));
    },

    entryZ: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 3);
      return Array.from({ length: n }, () => entryPreset.getZ(rng, isDeep));
    },

    entryRotXDeg: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 4);
      return Array.from({ length: n }, () => entryPreset.getRotX(rng, isVaried));
    },

    entryRotYDeg: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 5);
      return Array.from({ length: n }, () => entryPreset.getRotY(rng, isVaried));
    },

    entryRotZDeg: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 6);
      return Array.from({ length: n }, () => entryPreset.getRotZ(rng));
    },

    entryScale: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 7);
      return Array.from({ length: n }, () => entryPreset.getScale(rng));
    },

    ease: (_seed, n, _ctx) => {
      return Array(n).fill(isVaried ? 'easeOutQuint' : 'easeOutCubic');
    },

    overshoot: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 8);
      return Array.from({ length: n }, () =>
        isVaried ? rng.range(1.2, 2.0) : 1.6
      );
    },

    opacity: (_seed, n, _ctx) => {
      return Array(n).fill(1);
    },

    exitTranslate: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 9);
      return Array.from({ length: n }, () => exitPreset.getTranslate(rng));
    },

    exitZ: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 10);
      return Array.from({ length: n }, () => exitPreset.getZ(rng));
    },

    exitRotXDeg: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 11);
      return Array.from({ length: n }, () => exitPreset.getRotX(rng));
    },

    exitRotYDeg: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 12);
      return Array.from({ length: n }, () => exitPreset.getRotY(rng));
    },

    exitRotZDeg: (seed, n, _ctx) => {
      const rng = createPRNG(seed + 13);
      return Array.from({ length: n }, () => exitPreset.getRotZ(rng));
    },
  };
}

/**
 * Procedural mode: coherent direction, bounded tilt.
 */
export function createProceduralMode(): Transform3DModeConfig {
  return {
    entryPose: 'tiltLeft',
    timing: 'staggered3D',
    depth: 'shallow',
    exit: 'shatter',
    variance: 'procedural',
  };
}

/**
 * Varied mode: per-part direction changes, wider tilt/z envelopes.
 */
export function createVariedMode(): Transform3DModeConfig {
  return {
    entryPose: 'scatter3D',
    timing: 'scatterDelay',
    depth: 'deep',
    exit: 'shatter',
    variance: 'varied',
  };
}
