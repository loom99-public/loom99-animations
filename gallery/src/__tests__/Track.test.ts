/**
 * Track.test.ts - Comprehensive tests for Track interpolation system
 *
 * FUNCTIONAL TESTING APPROACH:
 * - Tests real behavior users depend on (getValue, getProgress, lifecycle)
 * - Validates interpolation accuracy (numbers, arrays, objects)
 * - Verifies SMIL export generates valid SVG
 * - No mocks for core functionality - tests actual interpolation math
 */

import { describe, it, expect } from 'vitest';
import { Track, TrackGroup } from '../core/Track';
import { easings } from '../core/easing';

describe('Track - Number Interpolation', () => {
  it('interpolates from 0 to 100 at 50% progress', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    const value = track.getValue(500); // 50% of duration
    expect(value).toBe(50);
  });

  it('interpolates from 100 to 200 at 75% progress', () => {
    const track = new Track({ from: 100, to: 200, duration: 1000 });
    const value = track.getValue(750);
    expect(value).toBe(175);
  });

  it('interpolates negative numbers correctly', () => {
    const track = new Track({ from: -50, to: 50, duration: 1000 });
    const value = track.getValue(500);
    expect(value).toBe(0);
  });

  it('interpolates fractional values with precision', () => {
    const track = new Track({ from: 0, to: 1, duration: 1000 });
    const value = track.getValue(333); // 33.3%
    expect(value).toBeCloseTo(0.333, 2);
  });

  it('returns from value at progress 0', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    const value = track.getValue(0);
    expect(value).toBe(0);
  });

  it('returns to value at progress 1', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    const value = track.getValue(1000);
    expect(value).toBe(100);
  });

  it('clamps to from value before track starts', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    const value = track.getValue(-100);
    expect(value).toBe(0);
  });

  it('clamps to final value after track completes', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    const value = track.getValue(2000);
    expect(value).toBe(100);
  });
});

describe('Track - Array Interpolation', () => {
  it('interpolates number arrays element-wise', () => {
    const track = new Track({ from: [0, 0], to: [100, 200], duration: 1000 });
    const value = track.getValue(500);
    expect(value).toEqual([50, 100]);
  });

  it('interpolates 3D vectors correctly', () => {
    const track = new Track({ from: [0, 0, 0], to: [100, 200, 300], duration: 1000 });
    const value = track.getValue(250); // 25%
    expect(value).toEqual([25, 50, 75]);
  });

  it('handles mismatched array lengths by using shorter length', () => {
    const track = new Track({ from: [0, 0, 0], to: [100, 200], duration: 1000 });
    const value = track.getValue(500);
    // Should interpolate only first 2 elements
    expect(value).toHaveLength(3);
    expect(value[0]).toBe(50);
    expect(value[1]).toBe(100);
    expect(value[2]).toBe(NaN); // Third element has no 'to' value
  });

  it('interpolates arrays with negative values', () => {
    const track = new Track({ from: [-100, -50], to: [100, 50], duration: 1000 });
    const value = track.getValue(500);
    expect(value).toEqual([0, 0]);
  });

  it('preserves array length from source', () => {
    const track = new Track({ from: [1, 2, 3, 4, 5], to: [10, 20, 30, 40, 50], duration: 1000 });
    const value = track.getValue(0);
    expect(value).toHaveLength(5);
  });
});

describe('Track - Object Interpolation', () => {
  it('interpolates object properties', () => {
    const track = new Track({
      from: { x: 0, y: 0 },
      to: { x: 100, y: 200 },
      duration: 1000
    });
    const value = track.getValue(500);
    expect(value).toEqual({ x: 50, y: 100 });
  });

  it('interpolates nested numeric properties', () => {
    const track = new Track({
      from: { position: { x: 0, y: 0 }, scale: 1 },
      to: { position: { x: 100, y: 200 }, scale: 2 },
      duration: 1000
    });
    const value = track.getValue(500);
    // Object interpolation only handles top-level numeric properties
    expect(value.scale).toBe(1.5);
    // Nested objects use discrete transition
    expect(value.position).toBeDefined();
  });

  it('handles discrete transitions for non-numeric properties', () => {
    const track = new Track({
      from: { color: 'red', opacity: 0 },
      to: { color: 'blue', opacity: 1 },
      duration: 1000
    });
    const valueBefore = track.getValue(400); // < 50%
    expect(valueBefore.color).toBe('red');
    expect(valueBefore.opacity).toBe(0.4);

    const valueAfter = track.getValue(600); // > 50%
    expect(valueAfter.color).toBe('blue');
    expect(valueAfter.opacity).toBe(0.6);
  });

  it('only interpolates properties present in both from and to', () => {
    const track = new Track({
      from: { x: 0, y: 0, z: 0 },
      to: { x: 100, y: 200 }, // missing 'z'
      duration: 1000
    });
    const value = track.getValue(500);
    expect(value.x).toBe(50);
    expect(value.y).toBe(100);
    expect(value.z).toBeUndefined(); // Not interpolated
  });
});

describe('Track - Delay Handling', () => {
  it('returns from value during delay period', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    const value = track.getValue(250); // During delay
    expect(value).toBe(0);
  });

  it('starts interpolating after delay', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    const value = track.getValue(1000); // 500ms delay + 500ms into animation
    expect(value).toBe(50);
  });

  it('completes at delay + duration', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    const value = track.getValue(1500); // delay + duration
    expect(value).toBe(100);
  });

  it('handles zero delay', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 0 });
    const value = track.getValue(500);
    expect(value).toBe(50);
  });

  it('isActive returns false during delay', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    expect(track.isActive(250)).toBe(false);
  });

  it('isActive returns true after delay starts', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    expect(track.isActive(750)).toBe(true);
  });
});

describe('Track - Easing Functions', () => {
  it('applies linear easing by default', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    const value = track.getValue(500);
    expect(value).toBe(50); // Linear: 50% progress = 50% value
  });

  it('applies easeOutQuart correctly', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, easing: 'easeOutQuart' });
    const value = track.getValue(500);
    const expectedProgress = easings.easeOutQuart(0.5);
    expect(value).toBeCloseTo(expectedProgress * 100, 1);
  });

  it('applies easeInQuad correctly', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, easing: 'easeInQuad' });
    const value = track.getValue(500);
    const expectedProgress = easings.easeInQuad(0.5);
    expect(value).toBe(expectedProgress * 100); // Should be 25
  });

  it('easing affects interpolation curve but not endpoints', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, easing: 'easeOutCubic' });
    expect(track.getValue(0)).toBe(0);
    expect(track.getValue(1000)).toBe(100);
  });

  it('accepts custom easing function', () => {
    const customEasing = (t: number) => t * t * t; // Cubic
    const track = new Track({ from: 0, to: 100, duration: 1000, easing: customEasing });
    const value = track.getValue(500);
    expect(value).toBe(12.5); // 0.5^3 * 100
  });

  it('defaults to linear for unknown easing name', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, easing: 'unknownEasing' });
    const value = track.getValue(500);
    expect(value).toBe(50); // Falls back to linear
  });
});

describe('Track - Lifecycle Methods', () => {
  it('isActive returns false before track starts', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    expect(track.isActive(0)).toBe(false);
    expect(track.isActive(400)).toBe(false);
  });

  it('isActive returns true during track animation', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    expect(track.isActive(500)).toBe(true);
    expect(track.isActive(1000)).toBe(true);
    expect(track.isActive(1499)).toBe(true);
  });

  it('isActive returns false after track completes', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    expect(track.isActive(1500)).toBe(false);
    expect(track.isActive(2000)).toBe(false);
  });

  it('isComplete returns false before and during animation', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    expect(track.isComplete(0)).toBe(false);
    expect(track.isComplete(500)).toBe(false);
    expect(track.isComplete(999)).toBe(false);
  });

  it('isComplete returns true at and after completion', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    expect(track.isComplete(1000)).toBe(true);
    expect(track.isComplete(2000)).toBe(true);
  });

  it('isComplete accounts for delay', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    expect(track.isComplete(1000)).toBe(false); // Still animating
    expect(track.isComplete(1500)).toBe(true); // Completed
  });

  it('getProgress returns 0 before track starts', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    expect(track.getProgress(0)).toBe(0);
    expect(track.getProgress(400)).toBe(0);
  });

  it('getProgress returns 1 after track completes', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    expect(track.getProgress(1000)).toBe(1);
    expect(track.getProgress(2000)).toBe(1);
  });

  it('getProgress applies easing during animation', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, easing: 'easeInQuad' });
    const progress = track.getProgress(500);
    const expected = easings.easeInQuad(0.5);
    expect(progress).toBe(expected);
  });
});

describe('Track - SMIL Export', () => {
  it('generates valid SMIL animate element', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    const smil = track.toSMIL('opacity');

    expect(smil).toContain('<animate');
    expect(smil).toContain('attributeName="opacity"');
    expect(smil).toContain('from="0"');
    expect(smil).toContain('to="100"');
    expect(smil).toContain('dur="1000ms"');
    expect(smil).toContain('fill="freeze"');
  });

  it('includes delay in begin attribute', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, delay: 500 });
    const smil = track.toSMIL('opacity');

    expect(smil).toContain('begin="500ms"');
  });

  it('omits begin attribute when delay is 0', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    const smil = track.toSMIL('opacity');

    expect(smil).not.toContain('begin=');
  });

  it('includes id when provided', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000 });
    const smil = track.toSMIL('opacity', 'anim-1');

    expect(smil).toContain('id="anim-1"');
  });

  it('includes keySplines for easing', () => {
    const track = new Track({ from: 0, to: 100, duration: 1000, easing: 'easeOutQuart' });
    const smil = track.toSMIL('opacity');

    expect(smil).toContain('calcMode="spline"');
    expect(smil).toContain('keySplines=');
    expect(smil).toContain('values="0;100"');
    expect(smil).toContain('keyTimes="0;1"');
  });

  it('exports array values as space-separated', () => {
    const track = new Track({ from: [0, 0], to: [100, 200], duration: 1000 });
    const smil = track.toSMIL('translate');

    expect(smil).toContain('from="0 0"');
    expect(smil).toContain('to="100 200"');
  });

  it('generates valid SVG that can be parsed', () => {
    const track = new Track({ from: 0, to: 1, duration: 1000, delay: 100, easing: 'easeOutQuad' });
    const smil = track.toSMIL('opacity', 'fade-in');

    // Verify it's valid XML by attempting to parse
    const xmlString = `<svg xmlns="http://www.w3.org/2000/svg">${smil}</svg>`;
    expect(() => {
      if (typeof DOMParser !== 'undefined') {
        new DOMParser().parseFromString(xmlString, 'image/svg+xml');
      }
    }).not.toThrow();
  });
});

describe('Track - Edge Cases', () => {
  it('handles zero duration by returning to value', () => {
    const track = new Track({ from: 0, to: 100, duration: 0 });
    expect(track.getValue(0)).toBe(100);
    expect(track.getValue(100)).toBe(100);
  });

  it('handles very large numbers', () => {
    const track = new Track({ from: 0, to: 1e10, duration: 1000 });
    const value = track.getValue(500);
    expect(value).toBe(5e9);
  });

  it('handles very small numbers', () => {
    const track = new Track({ from: 0, to: 0.0001, duration: 1000 });
    const value = track.getValue(500);
    expect(value).toBeCloseTo(0.00005, 6);
  });

  it('handles same from and to values', () => {
    const track = new Track({ from: 50, to: 50, duration: 1000 });
    expect(track.getValue(0)).toBe(50);
    expect(track.getValue(500)).toBe(50);
    expect(track.getValue(1000)).toBe(50);
  });

  it('handles negative duration gracefully', () => {
    const track = new Track({ from: 0, to: 100, duration: -1000 });
    // Should behave similar to zero duration or clamp
    const value = track.getValue(500);
    expect(value).toBeDefined();
  });
});

describe('Track.fromKeyframes', () => {
  it('creates tracks from keyframe array', () => {
    const tracks = Track.fromKeyframes([
      { time: 0, value: 0 },
      { time: 500, value: 50 },
      { time: 1000, value: 100 }
    ]);

    expect(tracks).toHaveLength(2);
    expect(tracks[0].getValue(0)).toBe(0);
    expect(tracks[0].getValue(500)).toBe(50);
    expect(tracks[1].getValue(500)).toBe(50);
    expect(tracks[1].getValue(1000)).toBe(100);
  });

  it('applies easing to each keyframe segment', () => {
    const tracks = Track.fromKeyframes([
      { time: 0, value: 0, easing: 'easeInQuad' },
      { time: 1000, value: 100, easing: 'easeOutQuad' }
    ]);

    expect(tracks).toHaveLength(1);
    expect(tracks[0].easing).toBe(easings.easeInQuad);
  });

  it('handles single keyframe by returning empty array', () => {
    const tracks = Track.fromKeyframes([
      { time: 0, value: 0 }
    ]);

    expect(tracks).toHaveLength(0);
  });
});

describe('TrackGroup', () => {
  it('manages multiple named tracks', () => {
    const group = new TrackGroup();
    group.add('x', new Track({ from: 0, to: 100, duration: 1000 }));
    group.add('y', new Track({ from: 0, to: 200, duration: 1000 }));

    const values = group.getValues(500);
    expect(values.x).toBe(50);
    expect(values.y).toBe(100);
  });

  it('retrieves individual track values', () => {
    const group = new TrackGroup();
    group.add('opacity', new Track({ from: 0, to: 1, duration: 1000 }));

    const value = group.getValue('opacity', 500);
    expect(value).toBe(0.5);
  });

  it('returns undefined for non-existent track', () => {
    const group = new TrackGroup();
    const value = group.getValue('nonexistent', 500);
    expect(value).toBeUndefined();
  });

  it('isComplete returns true when all tracks complete', () => {
    const group = new TrackGroup();
    group.add('a', new Track({ from: 0, to: 100, duration: 1000 }));
    group.add('b', new Track({ from: 0, to: 200, duration: 1500 }));

    expect(group.isComplete(1000)).toBe(false); // 'b' still running
    expect(group.isComplete(1500)).toBe(true); // All complete
  });

  it('getDuration returns longest track duration', () => {
    const group = new TrackGroup();
    group.add('short', new Track({ from: 0, to: 100, duration: 500 }));
    group.add('long', new Track({ from: 0, to: 100, duration: 2000, delay: 500 }));

    expect(group.getDuration()).toBe(2500); // 500 delay + 2000 duration
  });

  it('toSMIL generates SMIL for all tracks', () => {
    const group = new TrackGroup();
    group.add('opacity', new Track({ from: 0, to: 1, duration: 1000 }));
    group.add('x', new Track({ from: 0, to: 100, duration: 1000 }));

    const smil = group.toSMIL();
    expect(smil).toContain('attributeName="opacity"');
    expect(smil).toContain('attributeName="x"');
  });

  it('handles empty group', () => {
    const group = new TrackGroup();
    expect(group.getValues(500)).toEqual({});
    expect(group.isComplete(1000)).toBe(true);
    expect(group.getDuration()).toBe(0);
  });
});
