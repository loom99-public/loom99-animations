/**
 * TransformCompositor.test.ts - Tests for CSS transform composition
 *
 * Tests kinetic animation transformations:
 * - Translate, rotate, scale interpolation
 * - CSS transform string generation
 * - SMIL animateTransform export
 * - Multi-transform composition
 */

import { describe, it, expect } from 'vitest';
import { TransformCompositor, type TransformState } from '../compositors/TransformCompositor';

describe('TransformCompositor - Translate', () => {
  it('interpolates translate from start to end', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0, translateY: 0 },
      to: { translateX: 100, translateY: 50 },
    });

    const transform0 = compositor.update(0);
    expect(transform0).toBe('none'); // At 0,0 no transform needed

    const transform50 = compositor.update(0.5);
    expect(transform50).toContain('translate(50px, 25px)');

    const transform100 = compositor.update(1);
    expect(transform100).toContain('translate(100px, 50px)');
  });

  it('handles negative translation', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 100, translateY: 100 },
      to: { translateX: -100, translateY: -50 },
    });

    const transform = compositor.update(0.5);
    // At halfway point, should be at (0, 25)
    expect(transform).toContain('translate(0px, 25px)');
  });

  it('handles X-only translation', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 200 },
    });

    const transform = compositor.update(0.5);
    expect(transform).toContain('translate(100px, 0px)');
  });

  it('handles Y-only translation', () => {
    const compositor = new TransformCompositor({
      from: { translateY: 0 },
      to: { translateY: 150 },
    });

    const transform = compositor.update(0.5);
    expect(transform).toContain('translate(0px, 75px)');
  });

  it('returns none when translation is zero', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0, translateY: 0 },
      to: { translateX: 0, translateY: 0 },
    });

    const transform = compositor.update(0.5);
    expect(transform).toBe('none');
  });
});

describe('TransformCompositor - Rotate', () => {
  it('interpolates rotation angle', () => {
    const compositor = new TransformCompositor({
      from: { rotate: 0 },
      to: { rotate: 360 },
    });

    const transform0 = compositor.update(0);
    expect(transform0).toBe('none'); // 0 degrees = no transform

    const transform50 = compositor.update(0.5);
    expect(transform50).toContain('rotate(180deg)');

    const transform100 = compositor.update(1);
    expect(transform100).toContain('rotate(360deg)');
  });

  it('handles negative rotation', () => {
    const compositor = new TransformCompositor({
      from: { rotate: 0 },
      to: { rotate: -180 },
    });

    const transform = compositor.update(0.5);
    expect(transform).toContain('rotate(-90deg)');
  });

  it('handles full rotation (720 degrees)', () => {
    const compositor = new TransformCompositor({
      from: { rotate: 0 },
      to: { rotate: 720 },
    });

    const transform = compositor.update(0.25);
    expect(transform).toContain('rotate(180deg)');
  });
});

describe('TransformCompositor - Scale', () => {
  it('interpolates uniform scale', () => {
    const compositor = new TransformCompositor({
      from: { scale: 0 },
      to: { scale: 1 },
    });

    const transform0 = compositor.update(0);
    expect(transform0).toContain('scale(0)');

    const transform50 = compositor.update(0.5);
    expect(transform50).toContain('scale(0.5)');

    const transform100 = compositor.update(1);
    expect(transform100).toBe('none'); // scale(1) is identity
  });

  it('interpolates independent scaleX and scaleY', () => {
    const compositor = new TransformCompositor({
      from: { scaleX: 0, scaleY: 1 },
      to: { scaleX: 1, scaleY: 2 },
    });

    const transform = compositor.update(0.5);
    expect(transform).toContain('scale(0.5, 1.5)');
  });

  it('uses single scale value when scaleX equals scaleY', () => {
    const compositor = new TransformCompositor({
      from: { scaleX: 0.5, scaleY: 0.5 },
      to: { scaleX: 2, scaleY: 2 },
    });

    const transform = compositor.update(0.5);
    // Should use scale(1.25) instead of scale(1.25, 1.25)
    expect(transform).toContain('scale(1.25)');
  });

  it('handles scale greater than 1', () => {
    const compositor = new TransformCompositor({
      from: { scale: 1 },
      to: { scale: 3 },
    });

    const transform = compositor.update(0.5);
    expect(transform).toContain('scale(2)');
  });

  it('handles fractional scales', () => {
    const compositor = new TransformCompositor({
      from: { scale: 0.25 },
      to: { scale: 0.75 },
    });

    const transform = compositor.update(0.5);
    expect(transform).toContain('scale(0.5)');
  });
});

describe('TransformCompositor - Multi-Transform Composition', () => {
  it('combines translate and rotate', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0, translateY: 0, rotate: 0 },
      to: { translateX: 100, translateY: 50, rotate: 45 },
    });

    const transform = compositor.update(0.5);

    expect(transform).toContain('translate(50px, 25px)');
    expect(transform).toContain('rotate(22.5deg)');
  });

  it('combines translate and scale', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0, translateY: 0, scale: 0 },
      to: { translateX: 100, translateY: 100, scale: 1 },
    });

    const transform = compositor.update(0.5);

    expect(transform).toContain('translate(50px, 50px)');
    expect(transform).toContain('scale(0.5)');
  });

  it('combines rotate and scale', () => {
    const compositor = new TransformCompositor({
      from: { rotate: 0, scale: 0 },
      to: { rotate: 180, scale: 2 },
    });

    const transform = compositor.update(0.5);

    expect(transform).toContain('rotate(90deg)');
  });

  it('combines all three transforms', () => {
    const compositor = new TransformCompositor({
      from: { translateX: -100, translateY: -100, rotate: -180, scale: 0 },
      to: { translateX: 100, translateY: 100, rotate: 180, scale: 2 },
    });

    const transform = compositor.update(0.5);

    // At 0.5 progress:
    // translateX: -100 + (100 - (-100)) * 0.5 = 0
    // translateY: -100 + (100 - (-100)) * 0.5 = 0
    // rotate: -180 + (180 - (-180)) * 0.5 = 0
    // scale: 0 + (2 - 0) * 0.5 = 1

    // translate(0,0), rotate(0), and scale(1) are identity transforms
    // and should be omitted, resulting in "none"
    expect(transform).toBe('none');
  });

  it('orders transforms correctly: translate, rotate, scale', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0, rotate: 0, scale: 0.5 },
      to: { translateX: 100, rotate: 90, scale: 1.5 },
    });

    const transform = compositor.update(0.5);

    // Transform order matters for correct visual results
    // At 0.5: translate(50px, 0px) rotate(45deg) scale(1)
    // scale(1) is identity so won't be included
    const translateIndex = transform.indexOf('translate');
    const rotateIndex = transform.indexOf('rotate');

    expect(translateIndex).toBeGreaterThan(-1);
    expect(rotateIndex).toBeGreaterThan(-1);
    expect(translateIndex).toBeLessThan(rotateIndex);
  });
});

describe('TransformCompositor - Progress Clamping', () => {
  it('clamps progress below 0 to 0', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 100 },
    });

    const transform = compositor.update(-0.5);
    expect(transform).toBe('none'); // Should be at start state
  });

  it('clamps progress above 1 to 1', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 100 },
    });

    const transform = compositor.update(1.5);
    expect(transform).toContain('translate(100px, 0px)'); // Should be at end state
  });
});

describe('TransformCompositor - SMIL Export', () => {
  it('exports translate as SMIL animateTransform', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0, translateY: 0 },
      to: { translateX: 100, translateY: 50 },
    });

    const smilList = compositor.toSMIL();

    expect(smilList.length).toBeGreaterThan(0);

    const translateSmil = smilList.find(s => s.includes('type="translate"'));
    expect(translateSmil).toBeTruthy();
    expect(translateSmil).toContain('attributeName="transform"');
    expect(translateSmil).toContain('values=');
    expect(translateSmil).toContain('keyTimes=');
  });

  it('exports rotate as SMIL animateTransform', () => {
    const compositor = new TransformCompositor({
      from: { rotate: 0 },
      to: { rotate: 360 },
    });

    const smilList = compositor.toSMIL();

    const rotateSmil = smilList.find(s => s.includes('type="rotate"'));
    expect(rotateSmil).toBeTruthy();
    expect(rotateSmil).toContain('attributeName="transform"');
  });

  it('exports scale as SMIL animateTransform', () => {
    const compositor = new TransformCompositor({
      from: { scale: 0 },
      to: { scale: 2 },
    });

    const smilList = compositor.toSMIL();

    const scaleSmil = smilList.find(s => s.includes('type="scale"'));
    expect(scaleSmil).toBeTruthy();
    expect(scaleSmil).toContain('attributeName="transform"');
  });

  it('exports multiple transforms separately', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0, rotate: 0, scale: 0 },
      to: { translateX: 100, rotate: 180, scale: 2 },
    });

    const smilList = compositor.toSMIL();

    // Should have 3 separate animateTransform elements
    expect(smilList.length).toBe(3);

    expect(smilList.some(s => s.includes('type="translate"'))).toBe(true);
    expect(smilList.some(s => s.includes('type="rotate"'))).toBe(true);
    expect(smilList.some(s => s.includes('type="scale"'))).toBe(true);
  });

  it('includes additive="sum" for transform combination', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 100 },
    });

    const smilList = compositor.toSMIL();

    smilList.forEach(smil => {
      expect(smil).toContain('additive="sum"');
    });
  });

  it('includes fill="freeze" to maintain final state', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 100 },
    });

    const smilList = compositor.toSMIL();

    smilList.forEach(smil => {
      expect(smil).toContain('fill="freeze"');
    });
  });

  it('generates correct translate values format', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0, translateY: 0 },
      to: { translateX: 100, translateY: 50 },
    });

    const smilList = compositor.toSMIL();
    const translateSmil = smilList.find(s => s.includes('type="translate"'));

    const valuesMatch = translateSmil?.match(/values="([^"]+)"/);
    expect(valuesMatch).toBeTruthy();

    const values = valuesMatch![1].split(';');
    expect(values.length).toBeGreaterThanOrEqual(2);

    // First value should be "0 0"
    expect(values[0]).toMatch(/^0\s+0$/);

    // Last value should be "100 50"
    expect(values[values.length - 1]).toMatch(/^100\s+50$/);
  });

  it('generates correct rotate values format', () => {
    const compositor = new TransformCompositor({
      from: { rotate: 0 },
      to: { rotate: 360 },
    });

    const smilList = compositor.toSMIL();
    const rotateSmil = smilList.find(s => s.includes('type="rotate"'));

    const valuesMatch = rotateSmil?.match(/values="([^"]+)"/);
    expect(valuesMatch).toBeTruthy();

    const values = valuesMatch![1].split(';');

    // First value should be 0
    expect(Number(values[0])).toBe(0);

    // Last value should be 360
    expect(Number(values[values.length - 1])).toBe(360);
  });

  it('generates correct scale values format', () => {
    const compositor = new TransformCompositor({
      from: { scaleX: 0, scaleY: 0 },
      to: { scaleX: 2, scaleY: 1 },
    });

    const smilList = compositor.toSMIL();
    const scaleSmil = smilList.find(s => s.includes('type="scale"'));

    const valuesMatch = scaleSmil?.match(/values="([^"]+)"/);
    expect(valuesMatch).toBeTruthy();

    const values = valuesMatch![1].split(';');

    // First value should be "0 0"
    expect(values[0]).toMatch(/^0\s+0$/);

    // Last value should be "2 1"
    expect(values[values.length - 1]).toMatch(/^2\s+1$/);
  });
});

describe('TransformCompositor - SMIL Easing', () => {
  it('uses linear calcMode for linear easing', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 100 },
      easing: 'linear',
    });

    const smilList = compositor.toSMIL();

    smilList.forEach(smil => {
      expect(smil).toContain('calcMode="linear"');
      expect(smil).not.toContain('keySplines');
    });
  });

  it('uses spline calcMode for eased animations', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 100 },
      easing: 'easeOutQuart',
    });

    const smilList = compositor.toSMIL();

    smilList.forEach(smil => {
      expect(smil).toContain('calcMode="spline"');
      expect(smil).toContain('keySplines=');
    });
  });

  it('includes keySplines for easeOutQuart', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 100 },
      easing: 'easeOutQuart',
    });

    const smilList = compositor.toSMIL();
    const translateSmil = smilList.find(s => s.includes('type="translate"'));

    expect(translateSmil).toContain('keySplines="0.25 1 0.5 1');
  });

  it('includes keySplines for easeInCubic', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 100 },
      easing: 'easeInCubic',
    });

    const smilList = compositor.toSMIL();
    const translateSmil = smilList.find(s => s.includes('type="translate"'));

    expect(translateSmil).toContain('keySplines="0.32 0 0.67 0');
  });

  it('includes keySplines for easeOutBack', () => {
    const compositor = new TransformCompositor({
      from: { rotate: 0 },
      to: { rotate: 360 },
      easing: 'easeOutBack',
    });

    const smilList = compositor.toSMIL();
    const rotateSmil = smilList.find(s => s.includes('type="rotate"'));

    expect(rotateSmil).toContain('keySplines="0.34 1.56 0.64 1');
  });
});

describe('TransformCompositor - State Queries', () => {
  it('returns current transform state at progress', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0, translateY: 0, rotate: 0, scale: 0 },
      to: { translateX: 100, translateY: 50, rotate: 180, scale: 2 },
    });

    const state = compositor.getState(0.5);

    expect(state.translateX).toBeCloseTo(50, 1);
    expect(state.translateY).toBeCloseTo(25, 1);
    expect(state.rotate).toBeCloseTo(90, 1);
    expect(state.scaleX).toBeCloseTo(1, 1);
    expect(state.scaleY).toBeCloseTo(1, 1);
  });

  it('returns start state at progress 0', () => {
    const compositor = new TransformCompositor({
      from: { translateX: -50, rotate: -90, scale: 0.5 },
      to: { translateX: 50, rotate: 90, scale: 1.5 },
    });

    const state = compositor.getState(0);

    expect(state.translateX).toBe(-50);
    expect(state.rotate).toBe(-90);
    expect(state.scaleX).toBe(0.5);
  });

  it('returns end state at progress 1', () => {
    const compositor = new TransformCompositor({
      from: { translateX: -50, rotate: -90, scale: 0.5 },
      to: { translateX: 50, rotate: 90, scale: 1.5 },
    });

    const state = compositor.getState(1);

    expect(state.translateX).toBe(50);
    expect(state.rotate).toBe(90);
    expect(state.scaleX).toBe(1.5);
  });
});

describe('TransformCompositor - Edge Cases', () => {
  it('handles empty transform (no changes)', () => {
    const compositor = new TransformCompositor({
      from: {},
      to: {},
    });

    const transform = compositor.update(0.5);
    expect(transform).toBe('none');
  });

  it('handles partial transforms', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 100 },
      to: { rotate: 45 },
    });

    const transform = compositor.update(0.5);

    // Should interpolate translateX from 100 to 0 (default)
    // And rotate from 0 (default) to 45
    expect(transform).toContain('translate');
    expect(transform).toContain('rotate');
  });

  it('handles very small values', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0.001, rotate: 0.001 },
      to: { translateX: 0.002, rotate: 0.002 },
    });

    const transform = compositor.update(0.5);
    expect(transform).toBeTruthy();
  });

  it('handles very large values', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 0 },
      to: { translateX: 10000 },
    });

    const transform = compositor.update(0.5);
    expect(transform).toContain('5000');
  });

  it('does not export SMIL for unchanged transforms', () => {
    const compositor = new TransformCompositor({
      from: { translateX: 100, translateY: 100 },
      to: { translateX: 100, translateY: 100 },
    });

    const smilList = compositor.toSMIL();

    // Should not generate translate animation if values don't change
    const translateSmil = smilList.find(s => s.includes('type="translate"'));
    expect(translateSmil).toBeUndefined();
  });
});
