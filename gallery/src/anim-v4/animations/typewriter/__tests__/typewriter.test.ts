/**
 * V4 Typewriter Animation - Tests
 *
 * Smoke tests for typewriter compiler, schedule, and rendering.
 */

import { describe, it, expect } from 'vitest';
import { compileTypewriter } from '../compiler';
import {
  proceduralMode,
  variedMode,
  steadyMode,
  humanMode,
  constantField,
} from '../modes';
import { createTypewriterRenderer } from '../render';
import { buildTypeSchedule, countRevealed } from '../schedule';
import type { TypewriterScene, TypewriterPhases } from '../types';
import { PhaseMachines, DEFAULT_CONTEXT } from '../../../core/types';
import { easeOutCubic, easeInCubic } from '../../../core/time';

// =============================================================================
// Test Data
// =============================================================================

const testScene: TypewriterScene = {
  id: 'test-typewriter',
  text: 'Hello World',
  layout: {
    fontFamily: 'monospace',
    fontSizePx: 24,
    origin: { x: 100, y: 100 },
  },
};

const testCtx = {
  viewport: { width: 800, height: 600 },
  elementCount: 11, // Length of "Hello World"
};

const testPhases: TypewriterPhases = {
  machine: PhaseMachines.of([
    { name: 'typing', duration: 2.0, ease: easeOutCubic },
    { name: 'hold', duration: 1.0 },
    { name: 'exit', duration: 0.5, ease: easeInCubic },
  ]),
};

// =============================================================================
// Schedule Tests
// =============================================================================

describe('TypeSchedule', () => {
  it('builds monotonically increasing schedule', () => {
    const schedule = buildTypeSchedule({
      seed: 42,
      N: 11,
      startDelay: 0,
      charIntervals: Array(11).fill(80),
      intervalJitters: Array(11).fill(0),
      burstChances: Array(11).fill(0),
      burstSizes: Array(11).fill(0),
    });

    expect(schedule.timesMs).toHaveLength(11);

    // Verify monotonically increasing
    for (let i = 1; i < schedule.timesMs.length; i++) {
      expect(schedule.timesMs[i]).toBeGreaterThanOrEqual(schedule.timesMs[i - 1]!);
    }
  });

  it('countRevealed returns correct visible count', () => {
    const times = [0, 100, 200, 300, 400];

    expect(countRevealed(times, -10)).toBe(0);
    expect(countRevealed(times, 0)).toBe(1);
    expect(countRevealed(times, 150)).toBe(2);
    expect(countRevealed(times, 300)).toBe(4);
    expect(countRevealed(times, 500)).toBe(5);
  });

  it('handles bursts correctly', () => {
    const schedule = buildTypeSchedule({
      seed: 42,
      N: 10,
      startDelay: 0,
      charIntervals: Array(10).fill(100),
      intervalJitters: Array(10).fill(0),
      burstChances: Array(10).fill(1.0), // Always burst
      burstSizes: Array(10).fill(3),
    });

    // With bursts, some chars should be much closer together
    const gaps = schedule.timesMs.map((t, i) =>
      i > 0 ? t - schedule.timesMs[i - 1]! : 0
    );

    // Should have some small gaps (burst intervals)
    const smallGaps = gaps.filter(g => g > 0 && g < 50);
    expect(smallGaps.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Compiler Tests
// =============================================================================

describe('Typewriter Compiler', () => {
  it('compiles without error with procedural mode', () => {
    const renderer = createTypewriterRenderer();
    const program = compileTypewriter(
      testScene,
      proceduralMode(),
      testPhases,
      42,
      testCtx,
      renderer.render.bind(renderer)
    );

    expect(program).toBeDefined();
    expect(program.signal).toBeTypeOf('function');
    expect(program.event).toBeTypeOf('function');
  });

  it('compiles without error with varied mode', () => {
    const renderer = createTypewriterRenderer();
    const program = compileTypewriter(
      testScene,
      variedMode(),
      testPhases,
      42,
      testCtx,
      renderer.render.bind(renderer)
    );

    expect(program).toBeDefined();
  });

  it('samples at entrance phase', () => {
    const renderer = createTypewriterRenderer();
    const program = compileTypewriter(
      testScene,
      proceduralMode(),
      testPhases,
      42,
      testCtx,
      renderer.render.bind(renderer)
    );

    const tree = program.signal(0.5, DEFAULT_CONTEXT);

    expect(tree).toBeDefined();
    expect(tree.width).toBe(800);
    expect(tree.height).toBe(600);
    expect(tree.root.type).toBe('group');
  });

  it('reveals all characters at hold phase', () => {
    const renderer = createTypewriterRenderer();
    const program = compileTypewriter(
      testScene,
      proceduralMode(),
      testPhases,
      42,
      testCtx,
      renderer.render.bind(renderer)
    );

    // Sample at hold phase (after 2s typing phase)
    const tree = program.signal(2.5, DEFAULT_CONTEXT);

    // Should have group with children
    expect(tree.root.type).toBe('group');
    if (tree.root.type === 'group') {
      // Should have at least some char nodes
      expect(tree.root.children.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic with same seed', () => {
    const renderer = createTypewriterRenderer();
    const prog1 = compileTypewriter(
      testScene,
      proceduralMode(),
      testPhases,
      42,
      testCtx,
      renderer.render.bind(renderer)
    );
    const prog2 = compileTypewriter(
      testScene,
      proceduralMode(),
      testPhases,
      42,
      testCtx,
      renderer.render.bind(renderer)
    );

    const tree1 = prog1.signal(1.0, DEFAULT_CONTEXT);
    const tree2 = prog2.signal(1.0, DEFAULT_CONTEXT);

    // Trees should be deeply equal
    expect(tree1).toEqual(tree2);
  });

  it('varies with different seed', () => {
    const renderer = createTypewriterRenderer();
    const prog1 = compileTypewriter(
      testScene,
      variedMode(),
      testPhases,
      42,
      testCtx,
      renderer.render.bind(renderer)
    );
    const prog2 = compileTypewriter(
      testScene,
      variedMode(),
      testPhases,
      999,
      testCtx,
      renderer.render.bind(renderer)
    );

    const tree1 = prog1.signal(0.5, DEFAULT_CONTEXT);
    const tree2 = prog2.signal(0.5, DEFAULT_CONTEXT);

    // Trees should differ due to different random schedule
    expect(tree1).not.toEqual(tree2);
  });

  it('handles empty text', () => {
    const renderer = createTypewriterRenderer();
    const emptyScene: TypewriterScene = {
      ...testScene,
      text: '',
    };

    const program = compileTypewriter(
      emptyScene,
      proceduralMode(),
      testPhases,
      42,
      testCtx,
      renderer.render.bind(renderer)
    );

    const tree = program.signal(1.0, DEFAULT_CONTEXT);
    expect(tree).toBeDefined();
    expect(tree.root.type).toBe('group');
  });

  it('handles single character', () => {
    const renderer = createTypewriterRenderer();
    const singleScene: TypewriterScene = {
      ...testScene,
      text: 'A',
    };

    const program = compileTypewriter(
      singleScene,
      proceduralMode(),
      testPhases,
      42,
      { ...testCtx, elementCount: 1 },
      renderer.render.bind(renderer)
    );

    const tree = program.signal(1.0, DEFAULT_CONTEXT);
    expect(tree).toBeDefined();
  });
});

// =============================================================================
// Mode Tests
// =============================================================================

describe('Modes', () => {
  it('constantField produces same value for all elements', () => {
    const field = constantField(100);
    const values = field(42, 10, testCtx);

    expect(values).toHaveLength(10);
    expect(values.every(v => v === 100)).toBe(true);
  });

  it('steadyMode has no jitter or bursts', () => {
    const mode = steadyMode();

    expect(mode.intervalJitter).toBeDefined();
    expect(mode.burstChance).toBeDefined();

    const jitters = mode.intervalJitter!(42, 10, testCtx);
    const bursts = mode.burstChance!(42, 10, testCtx);

    expect(jitters.every(j => j === 0)).toBe(true);
    expect(bursts.every(b => b === 0)).toBe(true);
  });

  it('humanMode has variability', () => {
    const mode = humanMode();

    expect(mode.charInterval).toBeDefined();
    expect(mode.intervalJitter).toBeDefined();
    expect(mode.burstChance).toBeDefined();

    const intervals = mode.charInterval!(42, 10, testCtx);
    const jitters = mode.intervalJitter!(42, 10, testCtx);
    const bursts = mode.burstChance!(42, 10, testCtx);

    // Intervals should vary
    const uniqueIntervals = new Set(intervals);
    expect(uniqueIntervals.size).toBeGreaterThan(1);

    // Bursts should be non-zero
    expect(bursts.some(b => b > 0)).toBe(true);
  });

  it('proceduralMode combines steady + caret', () => {
    const mode = proceduralMode();

    // Should have all required fields
    expect(mode.startDelay).toBeDefined();
    expect(mode.charInterval).toBeDefined();
    expect(mode.color).toBeDefined();
    expect(mode.caretEnabled).toBeDefined();
  });

  it('variedMode combines human + caret + ink', () => {
    const mode = variedMode();

    // Should have all required fields including ink fade
    expect(mode.perCharFadeMs).toBeDefined();
    expect(mode.caretEnabled).toBeDefined();
  });
});

// =============================================================================
// Renderer Tests
// =============================================================================

describe('Renderer', () => {
  it('creates valid RenderTree', () => {
    const renderer = createTypewriterRenderer();
    const tree = renderer.render({
      scene: testScene,
      params: {
        text: testScene.text,
        tokens: Array.from(testScene.text),
        startDelay: 0,
        charIntervals: Array(11).fill(80),
        intervalJitters: Array(11).fill(0),
        burstChances: Array(11).fill(0),
        burstSizes: Array(11).fill(0),
        baseOpacity: 1,
        colors: Array(11).fill('#00ffff'),
        perCharFadeDurations: Array(11).fill(0),
        perCharJitters: Array(11).fill(0),
        caretEnabled: true,
        caretBlinkHz: 2,
        caretWidthPx: 3,
        caretHeightPx: 18,
        schedule: { timesMs: Array(11).fill(0).map((_, i) => i * 80) },
      },
      state: {
        visibleCount: 5,
        opacity: 1,
      },
      viewport: { width: 800, height: 600 },
    });

    expect(tree.width).toBe(800);
    expect(tree.height).toBe(600);
    expect(tree.root.type).toBe('group');
  });
});
