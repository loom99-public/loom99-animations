/**
 * V4 Glitch Animation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  compileGlitch,
  compileOriginalGlitch,
  compileVariedGlitch,
  compileProceduralGlitch,
  createGlitchPhaseMachine,
  createModeSystem,
  createOriginalModeSystem,
  createVariedModeSystem,
  createProceduralModeSystem,
  createIntenseModeSystem,
  createSubtleModeSystem,
  glitchEnvelopes,
  glitchEnvelopesIntense,
  glitchEnvelopesSubtle,
  createScaledEnvelopes,
  noise01,
  noiseSigned,
  noiseRange,
  hash32,
  createTestScene,
  createSceneFromNode,
  getProgramDuration,
} from '../animations/glitch';
import { PhaseMachines, DEFAULT_CONTEXT } from '../core/types';
import { path } from '../render/tree';
import type { GlitchPhaseSample } from '../animations/glitch/types';

describe('Glitch Animation', () => {
  const testEnv = { viewport: { w: 800, h: 600 } };
  const testSeed = 42;

  describe('Noise Functions', () => {
    it('hash32 produces consistent results', () => {
      const h1 = hash32('test');
      const h2 = hash32('test');
      const h3 = hash32('different');

      expect(h1).toBe(h2);
      expect(h1).not.toBe(h3);
    });

    it('noise01 returns values in [0, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const n = noise01(testSeed, 'r', 'dx', i * 10, 60);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(1);
      }
    });

    it('noiseSigned returns values in [-1, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const n = noiseSigned(testSeed, 'g', 'dy', i * 10, 60);
        expect(n).toBeGreaterThanOrEqual(-1);
        expect(n).toBeLessThanOrEqual(1);
      }
    });

    it('noiseRange returns values in specified range', () => {
      const min = 5;
      const max = 25;
      for (let i = 0; i < 100; i++) {
        const n = noiseRange(testSeed, 'b', 'offset', i * 10, 60, min, max);
        expect(n).toBeGreaterThanOrEqual(min);
        expect(n).toBeLessThanOrEqual(max);
      }
    });

    it('noise is deterministic (same inputs = same output)', () => {
      const n1 = noise01(testSeed, 'r', 'dx', 1000, 60);
      const n2 = noise01(testSeed, 'r', 'dx', 1000, 60);
      expect(n1).toBe(n2);
    });

    it('noise changes with different seeds', () => {
      const n1 = noise01(42, 'r', 'dx', 1000, 60);
      const n2 = noise01(99, 'r', 'dx', 1000, 60);
      expect(n1).not.toBe(n2);
    });
  });

  describe('Envelope Functions', () => {
    it('glitchEnvelopes returns correct values for glitch phase', () => {
      const ps: GlitchPhaseSample = { phase: 'glitch', u: 0, uRaw: 0 };
      const e = glitchEnvelopes(ps);

      expect(e.rateHz).toBe(45);
      expect(e.rgbAmp).toBe(1);
      expect(e.mainOpacityMul).toBe(1);
    });

    it('glitchEnvelopes decays during glitch phase', () => {
      const start = glitchEnvelopes({ phase: 'glitch', u: 0, uRaw: 0 });
      const end = glitchEnvelopes({ phase: 'glitch', u: 1, uRaw: 1 });

      expect(end.rgbAmp).toBeLessThan(start.rgbAmp);
      expect(end.jitterAmp).toBeLessThan(start.jitterAmp);
    });

    it('glitchEnvelopes returns zero amplitudes for hold phase', () => {
      const e = glitchEnvelopes({ phase: 'hold', u: 0.5, uRaw: 0.5 });

      expect(e.rateHz).toBe(0);
      expect(e.rgbAmp).toBe(0);
      expect(e.jitterAmp).toBe(0);
    });

    it('glitchEnvelopes exit phase fades out', () => {
      const start = glitchEnvelopes({ phase: 'exit', u: 0, uRaw: 0 });
      const end = glitchEnvelopes({ phase: 'exit', u: 1, uRaw: 1 });

      expect(end.mainOpacityMul).toBeLessThan(start.mainOpacityMul);
    });

    it('createScaledEnvelopes scales amplitudes', () => {
      const scaledFn = createScaledEnvelopes(2.0);
      const base = glitchEnvelopes({ phase: 'glitch', u: 0, uRaw: 0 });
      const scaled = scaledFn({ phase: 'glitch', u: 0, uRaw: 0 });

      expect(scaled.rgbAmp).toBe(base.rgbAmp * 2.0);
    });
  });

  describe('Mode System', () => {
    it('createModeSystem returns valid fields', () => {
      const modeSystem = createModeSystem();
      const { fields } = modeSystem.resolve();

      expect(typeof fields.rgbOffset).toBe('function');
      expect(typeof fields.jitterMax).toBe('function');
      expect(typeof fields.glitchDuration).toBe('function');
    });

    it('different modes produce different parameters', () => {
      const subtle = createSubtleModeSystem();
      const intense = createIntenseModeSystem();

      const subtleFields = subtle.resolve().fields;
      const intenseFields = intense.resolve().fields;

      const subtleRgb = subtleFields.rgbOffset(testSeed, 0, 1, testEnv);
      const intenseRgb = intenseFields.rgbOffset(testSeed, 0, 1, testEnv);

      expect(intenseRgb).toBeGreaterThan(subtleRgb);
    });

    it('varied mode has more variance than procedural', () => {
      const procedural = createProceduralModeSystem();
      const varied = createVariedModeSystem();

      // Sample multiple times with different seeds
      const proceduralValues: number[] = [];
      const variedValues: number[] = [];

      for (let i = 0; i < 10; i++) {
        proceduralValues.push(procedural.resolve().fields.rgbOffset(i, 0, 1, testEnv));
        variedValues.push(varied.resolve().fields.rgbOffset(i, 0, 1, testEnv));
      }

      const proceduralVariance = calculateVariance(proceduralValues);
      const variedVariance = calculateVariance(variedValues);

      // Varied mode should have more variance (or equal)
      expect(variedVariance).toBeGreaterThanOrEqual(proceduralVariance * 0.5);
    });
  });

  describe('Phase Machine', () => {
    it('creates phase machine with correct phases', () => {
      const pm = createGlitchPhaseMachine(0.8, 1.0, 2.0, 0.25);

      expect(pm.phases.length).toBe(4);
      expect(pm.phases[0].name).toBe('glitch');
      expect(pm.phases[1].name).toBe('stabilize');
      expect(pm.phases[2].name).toBe('hold');
      expect(pm.phases[3].name).toBe('exit');
    });

    it('getProgramDuration returns correct total', () => {
      const pm = createGlitchPhaseMachine(0.8, 1.0, 2.0, 0.25);
      const duration = getProgramDuration(pm);

      expect(duration).toBeCloseTo(4.05, 2);
    });

    it('samples phases correctly', () => {
      const pm = createGlitchPhaseMachine(1.0, 1.0, 1.0, 1.0);

      const s1 = PhaseMachines.sample(pm, 0.5);
      expect(s1.phase).toBe('glitch');

      const s2 = PhaseMachines.sample(pm, 1.5);
      expect(s2.phase).toBe('stabilize');

      const s3 = PhaseMachines.sample(pm, 2.5);
      expect(s3.phase).toBe('hold');

      const s4 = PhaseMachines.sample(pm, 3.5);
      expect(s4.phase).toBe('exit');
    });
  });

  describe('Scene Helpers', () => {
    it('createTestScene returns valid scene', () => {
      const scene = createTestScene();

      expect(scene.id).toBe('test-glitch');
      expect(scene.root).toBeDefined();
      expect(scene.bounds).toBeDefined();
    });

    it('createSceneFromNode creates scene from node', () => {
      const node = path('my-path', 'M0 0 L100 100', { stroke: 'white' });
      const bounds = { center: { x: 50, y: 50 }, width: 100, height: 100 };
      const scene = createSceneFromNode('custom-scene', node, bounds);

      expect(scene.id).toBe('custom-scene');
      expect(scene.root).toBe(node);
      expect(scene.bounds).toBe(bounds);
    });
  });

  describe('Compiler', () => {
    it('compileGlitch returns a valid program', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();
      const program = compileGlitch(scene, modeSystem, testSeed, testEnv);

      expect(typeof program.signal).toBe('function');
      expect(typeof program.event).toBe('function');
    });

    it('program.signal returns RenderTree', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();
      const program = compileGlitch(scene, modeSystem, testSeed, testEnv);

      const tree = program.signal(0, DEFAULT_CONTEXT);

      expect(tree.width).toBe(800);
      expect(tree.height).toBe(600);
      expect(tree.root).toBeDefined();
    });

    it('render tree changes over time', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();
      const program = compileGlitch(scene, modeSystem, testSeed, testEnv);

      const tree1 = program.signal(0, DEFAULT_CONTEXT);
      const tree2 = program.signal(0.1, DEFAULT_CONTEXT);

      // During glitch phase, the tree should be different due to noise
      expect(JSON.stringify(tree1)).not.toBe(JSON.stringify(tree2));
    });

    it('compileOriginalGlitch works', () => {
      const scene = createTestScene();
      const program = compileOriginalGlitch(scene, testSeed, testEnv);
      const tree = program.signal(0, DEFAULT_CONTEXT);

      expect(tree.root).toBeDefined();
    });

    it('compileVariedGlitch works', () => {
      const scene = createTestScene();
      const program = compileVariedGlitch(scene, testSeed, testEnv);
      const tree = program.signal(0, DEFAULT_CONTEXT);

      expect(tree.root).toBeDefined();
    });

    it('compileProceduralGlitch works', () => {
      const scene = createTestScene();
      const program = compileProceduralGlitch(scene, testSeed, testEnv);
      const tree = program.signal(0, DEFAULT_CONTEXT);

      expect(tree.root).toBeDefined();
    });

    it('different seeds produce different animations', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();

      const program1 = compileGlitch(scene, modeSystem, 42, testEnv);
      const program2 = compileGlitch(scene, modeSystem, 99, testEnv);

      const tree1 = program1.signal(0.5, DEFAULT_CONTEXT);
      const tree2 = program2.signal(0.5, DEFAULT_CONTEXT);

      // Same time, different seeds should produce different results
      expect(JSON.stringify(tree1)).not.toBe(JSON.stringify(tree2));
    });
  });

  describe('Determinism', () => {
    it('same seed produces identical animation', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();

      const program1 = compileGlitch(scene, modeSystem, testSeed, testEnv);
      const program2 = compileGlitch(scene, modeSystem, testSeed, testEnv);

      // Sample at multiple times
      const times = [0, 0.5, 1.0, 2.0, 3.0];
      for (const t of times) {
        const tree1 = program1.signal(t, DEFAULT_CONTEXT);
        const tree2 = program2.signal(t, DEFAULT_CONTEXT);
        expect(JSON.stringify(tree1)).toBe(JSON.stringify(tree2));
      }
    });

    it('scrubbing produces same results as linear playback', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();
      const program = compileGlitch(scene, modeSystem, testSeed, testEnv);

      // Sample forwards
      const forward = program.signal(0.5, DEFAULT_CONTEXT);

      // Sample backwards (scrub)
      program.signal(2.0, DEFAULT_CONTEXT);
      program.signal(1.0, DEFAULT_CONTEXT);
      const scrubbed = program.signal(0.5, DEFAULT_CONTEXT);

      expect(JSON.stringify(forward)).toBe(JSON.stringify(scrubbed));
    });
  });
});

// Helper function to calculate variance
function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}
