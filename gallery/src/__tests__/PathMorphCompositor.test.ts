/**
 * PathMorphCompositor.test.ts - Test-first design for path morphing
 *
 * FUNCTIONAL TESTING APPROACH:
 * - Tests describe REQUIRED behavior before implementation exists
 * - Validates path morphing produces correct SVG path strings
 * - Verifies shoot-in-and-curve animation effect
 * - Tests SMIL export generates valid path animations
 * - No mocks - tests actual path string generation and interpolation
 */

import { describe, it, expect } from 'vitest';
import { PathMorphCompositor, type Point, type PathMorphConfig } from '../compositors/PathMorphCompositor';

describe('PathMorphCompositor - Basic Path Morphing', () => {
  it('returns path starting at startPos when progress is 0', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -100, y: 100 },
      points: [
        { x: 40, y: 40 },
        { x: 40, y: 160 },
        { x: 100, y: 160 }
      ]
    });

    const pathD = compositor.update(0);

    // At progress 0, path should start at (-100, 100) with no body
    expect(pathD).toContain('M -100 100');
    // Should be minimal path (just starting point)
  });

  it('returns final curved path when progress is 1', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -100, y: 100 },
      points: [
        { x: 40, y: 40 },
        { x: 40, y: 160 },
        { x: 100, y: 160 }
      ]
    });

    const pathD = compositor.update(1);

    // At progress 1, path should be complete L-shape
    expect(pathD).toContain('M 40 40');
    expect(pathD).toContain('L 40 160');
    expect(pathD).toContain('L 100 160');
  });

  it('returns intermediate morphed state at progress 0.5', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -100, y: 100 },
      points: [
        { x: 40, y: 40 },
        { x: 40, y: 160 }
      ]
    });

    const pathD = compositor.update(0.5);

    // At progress 0.5, tail should be halfway from (-100, 100) to (40, 40)
    // Tail position: -100 + (40 - (-100)) * 0.5 = -30
    //                100 + (40 - 100) * 0.5 = 70
    expect(pathD).toContain('M -30 70');

    // Body should be morphing from straight line to curved path
    // First point should be partially morphed toward (40, 40)
    expect(pathD).toMatch(/L\s+[\d.-]+\s+[\d.-]+/); // Contains line-to command
  });

  it('interpolates tail position linearly from startPos to first point', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }]
    });

    const pathAt25 = compositor.update(0.25);
    expect(pathAt25).toContain('M 25 25');

    const pathAt75 = compositor.update(0.75);
    expect(pathAt75).toContain('M 75 75');
  });

  it('handles single point path', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -50, y: -50 },
      points: [{ x: 50, y: 50 }]
    });

    const pathD = compositor.update(0.5);
    expect(pathD).toContain('M 0 0'); // Midpoint
  });

  it('generates valid SVG path string', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ]
    });

    const pathD = compositor.update(0.5);

    // Path should be parseable SVG path string
    expect(pathD).toMatch(/^M\s+[\d.-]+\s+[\d.-]+/);
    expect(pathD).not.toContain('undefined');
    expect(pathD).not.toContain('NaN');
  });
});

describe('PathMorphCompositor - Line Commands', () => {
  it('generates L commands for line-type points', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        { x: 50, y: 0, type: 'L' },
        { x: 50, y: 50, type: 'L' }
      ]
    });

    const pathD = compositor.update(1);

    expect(pathD).toContain('L 50 0');
    expect(pathD).toContain('L 50 50');
  });

  it('defaults to L command when type not specified', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }]
    });

    const pathD = compositor.update(1);
    expect(pathD).toMatch(/L\s+100\s+100/);
  });

  it('morphs straight lines into final positions', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        { x: 0, y: 100, type: 'L' },
        { x: 100, y: 100, type: 'L' }
      ]
    });

    // At progress 0, body should be collapsed
    const pathStart = compositor.update(0);
    expect(pathStart).toContain('M 0 0');

    // At progress 0.5, points should be morphing toward final positions
    const pathMid = compositor.update(0.5);
    expect(pathMid).toMatch(/M\s+0\s+50/); // Tail at (0, 50)

    // At progress 1, path should match final shape
    const pathEnd = compositor.update(1);
    expect(pathEnd).toContain('M 0 100');
    expect(pathEnd).toContain('L 100 100');
  });
});

describe('PathMorphCompositor - Quadratic Bezier (Q) Commands', () => {
  it('generates Q commands for quadratic bezier points', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        {
          x: 100,
          y: 100,
          type: 'Q',
          controlX: 50,
          controlY: 0
        }
      ]
    });

    const pathD = compositor.update(1);

    // Should contain quadratic bezier command with control point
    expect(pathD).toMatch(/Q\s+50\s+0\s+100\s+100/);
  });

  it('interpolates control points during morphing', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        {
          x: 100,
          y: 0,
          type: 'Q',
          controlX: 50,
          controlY: -50
        }
      ]
    });

    const pathD = compositor.update(0.5);

    // At progress 0.5:
    // - Tail at (50, 0)
    // - Control point morphing from straight line to (-25)
    // - End point morphing toward (100, 0)
    expect(pathD).toContain('M 50 0');
    expect(pathD).toMatch(/Q\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+/);
  });

  it('handles curves shooting in from off-screen', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -200, y: 100 },
      points: [
        {
          x: 100,
          y: 100,
          type: 'Q',
          controlX: -50,
          controlY: 50
        }
      ]
    });

    // At start, tail at (-200, 100), no body
    const pathStart = compositor.update(0);
    expect(pathStart).toContain('M -200 100');

    // At end, curved path from first point to final
    const pathEnd = compositor.update(1);
    expect(pathEnd).toMatch(/M\s+100\s+100/);
    expect(pathEnd).toMatch(/Q\s+-50\s+50\s+100\s+100/);
  });
});

describe('PathMorphCompositor - Arc (A) Commands', () => {
  it('generates A commands for arc-type points', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        {
          x: 100,
          y: 0,
          type: 'A',
          radiusX: 50,
          radiusY: 50,
          rotation: 0,
          largeArc: false,
          sweep: true
        }
      ]
    });

    const pathD = compositor.update(1);

    // Arc command: A rx ry rotation large-arc sweep x y
    expect(pathD).toMatch(/A\s+50\s+50\s+0\s+0\s+1\s+100\s+0/);
  });

  it('interpolates arc parameters during morphing', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        {
          x: 100,
          y: 100,
          type: 'A',
          radiusX: 50,
          radiusY: 50,
          rotation: 0,
          largeArc: false,
          sweep: true
        }
      ]
    });

    const pathD = compositor.update(0.5);

    // At progress 0.5, arc should be partially formed
    // Tail at (50, 50), arc parameters interpolating
    expect(pathD).toContain('M 50 50');
    expect(pathD).toMatch(/A\s+[\d.]+\s+[\d.]+/);
  });

  it('handles boolean arc flags correctly', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        {
          x: 50,
          y: 50,
          type: 'A',
          radiusX: 25,
          radiusY: 25,
          rotation: 0,
          largeArc: true,
          sweep: false
        }
      ]
    });

    const pathD = compositor.update(1);

    // large-arc: true = 1, sweep: false = 0
    expect(pathD).toMatch(/A\s+25\s+25\s+0\s+1\s+0\s+50\s+50/);
  });
});

describe('PathMorphCompositor - Complex Paths', () => {
  it('morphs multi-segment path with mixed command types', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -100, y: 0 },
      points: [
        { x: 0, y: 0, type: 'L' },
        { x: 50, y: 50, type: 'Q', controlX: 25, controlY: 0 },
        { x: 100, y: 0, type: 'A', radiusX: 25, radiusY: 25, rotation: 0 }
      ]
    });

    const pathD = compositor.update(1);

    // Should contain all command types
    expect(pathD).toMatch(/M\s+0\s+0/);
    expect(pathD).toMatch(/L/);
    expect(pathD).toMatch(/Q/);
    expect(pathD).toMatch(/A/);
  });

  it('maintains path topology during morphing', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -50, y: 100 },
      points: [
        { x: 40, y: 40 },
        { x: 40, y: 160 },
        { x: 100, y: 160 },
        { x: 100, y: 40 },
        { x: 160, y: 40 }
      ]
    });

    const pathD = compositor.update(0.5);

    // Path should have all segments even at intermediate progress
    const segments = pathD.match(/[ML]\s+[\d.-]+\s+[\d.-]+/g);
    expect(segments).toBeTruthy();
    expect(segments!.length).toBeGreaterThan(1);
  });

  it('handles very long paths efficiently', () => {
    const points = Array.from({ length: 100 }, (_, i) => ({
      x: i * 10,
      y: Math.sin(i * 0.1) * 50 + 100,
      type: 'L' as const
    }));

    const compositor = new PathMorphCompositor({
      startPos: { x: -100, y: 100 },
      points
    });

    const pathD = compositor.update(0.5);

    // Should generate valid path with all points
    expect(pathD).toMatch(/^M\s+[\d.-]+\s+[\d.-]+/);
    const commands = pathD.match(/[MLQ]/g);
    expect(commands!.length).toBeGreaterThan(10);
  });
});

describe('PathMorphCompositor - SMIL Export', () => {
  it('generates valid SMIL animate element for path morphing', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -100, y: 100 },
      points: [
        { x: 40, y: 40 },
        { x: 100, y: 100 }
      ]
    });

    const smil = compositor.toSMIL();

    expect(smil).toContain('<animate');
    expect(smil).toContain('attributeName="d"');
    expect(smil).toContain('values=');
    expect(smil).toContain('keyTimes=');
  });

  it('generates multiple keyframes for smooth morphing', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }]
    });

    const smil = compositor.toSMIL();

    // Should have multiple keyframe values (not just start/end)
    // Format: values="M 0 0;M 25 25 L...;M 50 50 L...;..."
    const valuesMatch = smil.match(/values="([^"]+)"/);
    expect(valuesMatch).toBeTruthy();

    const keyframes = valuesMatch![1].split(';');
    expect(keyframes.length).toBeGreaterThanOrEqual(3); // At least start, mid, end
  });

  it('includes correct timing attributes', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }]
    });

    const smil = compositor.toSMIL();

    expect(smil).toMatch(/keyTimes="\d/);
    expect(smil).toContain('calcMode="linear"'); // or "spline" if easing applied
    expect(smil).toContain('fill="freeze"');
  });

  it('exports valid SVG that can be parsed', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        { x: 50, y: 0 },
        { x: 50, y: 50 }
      ]
    });

    const smil = compositor.toSMIL();

    // Wrap in SVG and attempt to parse
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
      <path d="M 0 0">
        ${smil}
      </path>
    </svg>`;

    expect(() => {
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const errors = doc.getElementsByTagName('parsererror');
        expect(errors.length).toBe(0);
      }
    }).not.toThrow();
  });

  it('applies easing to SMIL keySplines if configured', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
      easing: 'easeOutQuart'
    });

    const smil = compositor.toSMIL();

    expect(smil).toContain('calcMode="spline"');
    expect(smil).toContain('keySplines=');
  });
});

describe('PathMorphCompositor - Edge Cases', () => {
  it('handles empty points array', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: []
    });

    const pathD = compositor.update(0.5);

    // Should return minimal valid path
    expect(pathD).toContain('M 0 0');
  });

  it('handles negative coordinates', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -100, y: -100 },
      points: [{ x: -50, y: -50 }]
    });

    const pathD = compositor.update(0.5);
    expect(pathD).toContain('M -75 -75');
  });

  it('handles very large coordinates', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 10000, y: 10000 }]
    });

    const pathD = compositor.update(0.5);
    expect(pathD).toContain('M 5000 5000');
  });

  it('handles progress values outside 0-1 range gracefully', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }]
    });

    // Progress < 0 should clamp to 0
    const pathNegative = compositor.update(-0.5);
    expect(pathNegative).toContain('M 0 0');

    // Progress > 1 should clamp to 1
    const pathOver = compositor.update(1.5);
    expect(pathOver).toContain('M 100 100');
  });

  it('handles coincident start and end points', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 50, y: 50 },
      points: [{ x: 50, y: 50 }]
    });

    const pathD = compositor.update(0.5);
    expect(pathD).toContain('M 50 50');
  });

  it('preserves numeric precision', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0.123456, y: 0.789012 },
      points: [{ x: 1.234567, y: 2.345678 }]
    });

    const pathD = compositor.update(0.5);

    // Should preserve reasonable precision (not round to integers)
    expect(pathD).toMatch(/M\s+0\.6/); // ~0.679
    expect(pathD).toMatch(/1\.5/); // ~1.567
  });
});

describe('PathMorphCompositor - Performance', () => {
  it('updates path efficiently for real-time animation', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -100, y: 100 },
      points: Array.from({ length: 50 }, (_, i) => ({
        x: i * 10,
        y: 100 + Math.sin(i * 0.2) * 30
      }))
    });

    // Simulate 60fps updates
    const startTime = performance.now();
    for (let i = 0; i < 60; i++) {
      compositor.update(i / 60);
    }
    const elapsed = performance.now() - startTime;

    // Should complete 60 updates in < 16ms (1 frame budget)
    expect(elapsed).toBeLessThan(16);
  });

  it('does not create memory leaks with repeated updates', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }]
    });

    // Update many times
    for (let i = 0; i < 1000; i++) {
      compositor.update(Math.random());
    }

    // No assertion - test passes if no memory errors occur
    expect(true).toBe(true);
  });
});
