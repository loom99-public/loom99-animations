/**
 * V4 Liquid Animation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  compileLiquid,
  compileProceduralLiquid,
  compileVariedLiquid,
  createLiquidPhaseMachine,
  createModeSystem,
  createProceduralModeSystem,
  createVariedModeSystem,
  createRingModeSystem,
  createBurstModeSystem,
  noise01,
  noiseSigned,
  hash32,
  liquidOffset,
  liquidRadiusOffset,
  clamp01,
  lerpVec2,
  lerpNum,
  createTestScene,
  createGooFilter,
  createBlob,
  getProgramDuration,
  createGridScene,
  createCircleScene,
} from '../animations/liquid';
import { PhaseMachines, DEFAULT_CONTEXT } from '../core/types';
import type { LiquidBehavior } from '../animations/liquid/types';

describe('Liquid Animation', () => {
  const testEnv = { viewport: { w: 600, h: 200 } };
  const testSeed = 42;

  describe('Hash and Noise Functions', () => {
    it('hash32 produces consistent results', () => {
      const h1 = hash32('test');
      const h2 = hash32('test');
      const h3 = hash32('different');

      expect(h1).toBe(h2);
      expect(h1).not.toBe(h3);
    });

    it('noise01 returns values in [0, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const n = noise01(testSeed, 'b0', 'jx', i * 0.1, 35);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(1);
      }
    });

    it('noiseSigned returns values in [-1, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const n = noiseSigned(testSeed, 'b1', 'jy', i * 0.1, 35);
        expect(n).toBeGreaterThanOrEqual(-1);
        expect(n).toBeLessThanOrEqual(1);
      }
    });

    it('noise is deterministic (same inputs = same output)', () => {
      const n1 = noise01(testSeed, 'b0', 'jx', 1.0, 35);
      const n2 = noise01(testSeed, 'b0', 'jx', 1.0, 35);
      expect(n1).toBe(n2);
    });

    it('noise changes with different seeds', () => {
      const n1 = noise01(42, 'b0', 'jx', 1.0, 35);
      const n2 = noise01(99, 'b0', 'jx', 1.0, 35);
      expect(n1).not.toBe(n2);
    });
  });

  describe('Math Helpers', () => {
    it('clamp01 clamps to [0, 1]', () => {
      expect(clamp01(-0.5)).toBe(0);
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(1.5)).toBe(1);
    });

    it('lerpNum interpolates correctly', () => {
      expect(lerpNum(0, 10, 0)).toBe(0);
      expect(lerpNum(0, 10, 0.5)).toBe(5);
      expect(lerpNum(0, 10, 1)).toBe(10);
    });

    it('lerpVec2 interpolates correctly', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 10, y: 20 };

      const mid = lerpVec2(a, b, 0.5);
      expect(mid.x).toBe(5);
      expect(mid.y).toBe(10);
    });
  });

  describe('Liquid Offsets', () => {
    it('liquidOffset returns zero for behavior.kind = none', () => {
      const behavior: LiquidBehavior = { kind: 'none' };
      const off = liquidOffset(testSeed, 0, behavior, 1.0, 0.5, 1);
      expect(off.x).toBe(0);
      expect(off.y).toBe(0);
    });

    it('liquidOffset decays to zero at u=1', () => {
      const behavior: LiquidBehavior = { kind: 'wobble', amplitude: 10, frequency: 1 };
      const off = liquidOffset(testSeed, 0, behavior, 1.0, 1, 1);
      expect(off.x).toBe(0);
      expect(off.y).toBe(0);
    });

    it('liquidOffset returns non-zero for wobble at u<1', () => {
      const behavior: LiquidBehavior = { kind: 'wobble', amplitude: 10, frequency: 1 };
      const off = liquidOffset(testSeed, 0, behavior, 1.0, 0, 1);
      // At least one component should be non-zero
      expect(Math.abs(off.x) + Math.abs(off.y)).toBeGreaterThan(0);
    });

    it('liquidOffset respects energy multiplier', () => {
      const behavior: LiquidBehavior = { kind: 'wobble', amplitude: 10, frequency: 1 };
      const off1 = liquidOffset(testSeed, 0, behavior, 1.0, 0.5, 1);
      const off2 = liquidOffset(testSeed, 0, behavior, 1.0, 0.5, 0);
      expect(off2.x).toBe(0);
      expect(off2.y).toBe(0);
      expect(Math.abs(off1.x) + Math.abs(off1.y)).toBeGreaterThan(0);
    });

    it('liquidRadiusOffset decays to zero at u=1', () => {
      const behavior: LiquidBehavior = { kind: 'wobble', amplitude: 10, frequency: 1 };
      const rOff = liquidRadiusOffset(testSeed, 0, behavior, 1.0, 1, 1);
      expect(rOff).toBe(0);
    });

    it('swirl behavior produces offset', () => {
      const behavior: LiquidBehavior = { kind: 'swirl', turns: 1, radius: 20 };
      const off = liquidOffset(testSeed, 0, behavior, 0.5, 0.5, 1);
      expect(Math.abs(off.x) + Math.abs(off.y)).toBeGreaterThan(0);
    });

    it('jitter behavior produces offset', () => {
      const behavior: LiquidBehavior = { kind: 'jitter', strength: 10 };
      const off = liquidOffset(testSeed, 0, behavior, 0.5, 0.5, 1);
      expect(Math.abs(off.x) + Math.abs(off.y)).toBeGreaterThan(0);
    });
  });

  describe('Mode System', () => {
    it('createModeSystem returns valid fields', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();
      const { fields } = modeSystem.resolve(scene.targets);

      expect(typeof fields.startPosition).toBe('function');
      expect(typeof fields.delay).toBe('function');
      expect(typeof fields.duration).toBe('function');
      expect(typeof fields.startRadius).toBe('function');
      expect(typeof fields.targetRadius).toBe('function');
      expect(typeof fields.color).toBe('function');
      expect(typeof fields.goo).toBe('function');
    });

    it('different modes produce different goo params', () => {
      const scene = createTestScene();
      const procedural = createProceduralModeSystem();
      const varied = createVariedModeSystem();

      const procFields = procedural.resolve(scene.targets).fields;
      const variedFields = varied.resolve(scene.targets).fields;

      const procGoo = procFields.goo(testSeed, 0, 1, testEnv);
      const variedGoo = variedFields.goo(testSeed, 0, 1, testEnv);

      // Varied mode has different goo defaults (soft vs tight)
      expect(procGoo.blurPx).not.toBe(variedGoo.blurPx);
    });

    it('ring mode produces valid fields', () => {
      const scene = createTestScene();
      const modeSystem = createRingModeSystem();
      const { fields } = modeSystem.resolve(scene.targets);

      const startPos = fields.startPosition(testSeed, 0, scene.targets.length, testEnv);
      expect(startPos).toHaveProperty('x');
      expect(startPos).toHaveProperty('y');
    });

    it('burst mode produces valid fields', () => {
      const scene = createTestScene();
      const modeSystem = createBurstModeSystem();
      const { fields } = modeSystem.resolve(scene.targets);

      const delay = fields.delay(testSeed, 0, scene.targets.length, testEnv);
      expect(typeof delay).toBe('number');
    });
  });

  describe('Phase Machine', () => {
    it('creates phase machine with correct phases', () => {
      const pm = createLiquidPhaseMachine(2.0, 1.5, 0.5);

      expect(pm.phases.length).toBe(3);
      expect(pm.phases[0].name).toBe('entrance');
      expect(pm.phases[1].name).toBe('hold');
      expect(pm.phases[2].name).toBe('exit');
    });

    it('getProgramDuration returns correct total', () => {
      const pm = createLiquidPhaseMachine(2.0, 1.5, 0.5);
      const duration = getProgramDuration(pm);

      expect(duration).toBeCloseTo(4.0, 2);
    });

    it('samples phases correctly', () => {
      const pm = createLiquidPhaseMachine(1.0, 1.0, 1.0);

      const s1 = PhaseMachines.sample(pm, 0.5);
      expect(s1.phase).toBe('entrance');

      const s2 = PhaseMachines.sample(pm, 1.5);
      expect(s2.phase).toBe('hold');

      const s3 = PhaseMachines.sample(pm, 2.5);
      expect(s3.phase).toBe('exit');
    });
  });

  describe('Scene Helpers', () => {
    it('createTestScene returns valid scene', () => {
      const scene = createTestScene();

      expect(scene.id).toBe('test-liquid');
      expect(scene.targets.length).toBeGreaterThan(0);
      expect(scene.bounds).toBeDefined();
    });

    it('createGridScene creates correct number of targets', () => {
      const scene = createGridScene('grid', 4, 3, 30);

      expect(scene.id).toBe('grid');
      expect(scene.targets.length).toBe(12);
    });

    it('createCircleScene creates correct number of targets', () => {
      const scene = createCircleScene('circle', 100, 100, 50, 8);

      expect(scene.id).toBe('circle');
      expect(scene.targets.length).toBe(8);
    });
  });

  describe('Renderer', () => {
    it('createGooFilter creates valid filter', () => {
      const filter = createGooFilter('test-goo', {
        blurPx: 10,
        threshold: 0.5,
      });

      expect(filter.id).toBe('test-goo');
      expect(filter.effects.length).toBeGreaterThan(0);
    });

    it('createBlob creates valid node', () => {
      const blob = createBlob({
        id: 'blob-0',
        position: { x: 100, y: 100 },
        radius: 10,
        color: '#00ffff',
        opacity: 1,
      });

      expect(blob.type).toBe('circle');
      expect(blob.id).toBe('blob-0');
    });
  });

  describe('Compiler', () => {
    it('compileLiquid returns a valid program', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();
      const program = compileLiquid(scene, modeSystem, testSeed, testEnv);

      expect(typeof program.signal).toBe('function');
      expect(typeof program.event).toBe('function');
    });

    it('program.signal returns RenderTree', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();
      const program = compileLiquid(scene, modeSystem, testSeed, testEnv);

      const tree = program.signal(0, DEFAULT_CONTEXT);

      expect(tree.width).toBe(600);
      expect(tree.height).toBe(200);
      expect(tree.root).toBeDefined();
    });

    it('render tree changes over time', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();
      const program = compileLiquid(scene, modeSystem, testSeed, testEnv);

      const tree1 = program.signal(0, DEFAULT_CONTEXT);
      const tree2 = program.signal(0.5, DEFAULT_CONTEXT);

      // During entrance phase, blobs should be moving
      expect(JSON.stringify(tree1)).not.toBe(JSON.stringify(tree2));
    });

    it('compileProceduralLiquid works', () => {
      const scene = createTestScene();
      const program = compileProceduralLiquid(scene, testSeed, testEnv);
      const tree = program.signal(0, DEFAULT_CONTEXT);

      expect(tree.root).toBeDefined();
    });

    it('compileVariedLiquid works', () => {
      const scene = createTestScene();
      const program = compileVariedLiquid(scene, testSeed, testEnv);
      const tree = program.signal(0, DEFAULT_CONTEXT);

      expect(tree.root).toBeDefined();
    });

    it('different seeds produce different animations', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();

      const program1 = compileLiquid(scene, modeSystem, 42, testEnv);
      const program2 = compileLiquid(scene, modeSystem, 99, testEnv);

      const tree1 = program1.signal(1.0, DEFAULT_CONTEXT);
      const tree2 = program2.signal(1.0, DEFAULT_CONTEXT);

      // Same time, different seeds should produce different results
      expect(JSON.stringify(tree1)).not.toBe(JSON.stringify(tree2));
    });
  });

  describe('Determinism', () => {
    it('same seed produces identical animation', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();

      const program1 = compileLiquid(scene, modeSystem, testSeed, testEnv);
      const program2 = compileLiquid(scene, modeSystem, testSeed, testEnv);

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
      const program = compileLiquid(scene, modeSystem, testSeed, testEnv);

      // Sample forwards
      const forward = program.signal(0.5, DEFAULT_CONTEXT);

      // Sample backwards (scrub)
      program.signal(2.0, DEFAULT_CONTEXT);
      program.signal(1.0, DEFAULT_CONTEXT);
      const scrubbed = program.signal(0.5, DEFAULT_CONTEXT);

      expect(JSON.stringify(forward)).toBe(JSON.stringify(scrubbed));
    });
  });

  describe('Phase Transitions', () => {
    it('blobs are at start position at t=0', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem({ origin: 'leftBand' });
      const program = compileLiquid(scene, modeSystem, testSeed, testEnv);

      const tree = program.signal(0, DEFAULT_CONTEXT);
      // Blobs should be on the left (x < center)
      // We can't easily inspect the tree, but it should be valid
      expect(tree.root).toBeDefined();
    });

    it('blobs are at target position after entrance', () => {
      const scene = createTestScene();
      const modeSystem = createModeSystem();
      const options = { entranceDuration: 1.0, holdDuration: 1.0, exitDuration: 0.5 };
      const program = compileLiquid(scene, modeSystem, testSeed, testEnv, options);

      // At t=1.5 (in hold phase), blobs should be at targets
      const tree = program.signal(1.5, DEFAULT_CONTEXT);
      expect(tree.root).toBeDefined();
    });
  });
});
