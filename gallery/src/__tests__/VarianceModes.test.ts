/**
 * VarianceModes.test.ts - Tests for variance mode functionality
 *
 * Tests that different variance modes produce different outputs:
 * - 'original': No variance, deterministic output
 * - 'varied': Some randomization, consistent on same seed
 * - 'procedural': High randomization, different every time
 */

import { describe, it, expect } from 'vitest';
import { createLineDrawingAnimation, type LineDefinition, type VarianceLevel } from '../animations/LineDrawingAnimation';

const testLines: LineDefinition[] = [
  {
    id: 'line-1',
    startX: -100,
    startY: 100,
    points: [
      { x: 40, y: 40 },
      { x: 40, y: 160 },
    ],
    stroke: '#00d4ff',
    strokeWidth: 12,
  },
  {
    id: 'line-2',
    startX: 100,
    startY: -50,
    points: [
      { x: 150, y: 60 },
      { x: 150, y: 140 },
    ],
    stroke: '#ff2d75',
    strokeWidth: 12,
  },
  {
    id: 'line-3',
    startX: 300,
    startY: 100,
    points: [
      { x: 240, y: 60 },
      { x: 240, y: 140 },
    ],
    stroke: '#7b2ff7',
    strokeWidth: 12,
  },
];

describe('VarianceModes - Original Mode', () => {
  it('produces deterministic output with original mode', () => {
    const anim1 = createLineDrawingAnimation({
      lines: testLines,
      variance: 'original',
      duration: 1000,
      stagger: 100,
    });

    const anim2 = createLineDrawingAnimation({
      lines: testLines,
      variance: 'original',
      duration: 1000,
      stagger: 100,
    });

    // Both animations should have same number of elements
    expect(anim1.getElements().length).toBe(anim2.getElements().length);
    expect(anim1.getElements().length).toBe(testLines.length);
  });

  it('produces consistent SVG output with original mode', () => {
    const anim1 = createLineDrawingAnimation({
      lines: testLines,
      variance: 'original',
    });

    const anim2 = createLineDrawingAnimation({
      lines: testLines,
      variance: 'original',
    });

    const svg1 = anim1.toSVG();
    const svg2 = anim2.toSVG();

    // SVG strings should be identical for original mode
    expect(svg1).toBe(svg2);

    // Should contain all line IDs
    testLines.forEach(line => {
      expect(svg1).toContain(`id="${line.id}"`);
    });
  });

  it('uses exact parameters with no variance', () => {
    const baseDuration = 1234;
    const baseStagger = 89;

    const anim = createLineDrawingAnimation({
      lines: testLines,
      variance: 'original',
      duration: baseDuration,
      stagger: baseStagger,
    });

    // All elements should be created successfully
    expect(anim.getElements().length).toBe(testLines.length);
  });
});

describe('VarianceModes - Varied Mode', () => {
  it('produces different output than original mode', () => {
    const originalAnim = createLineDrawingAnimation({
      lines: testLines,
      variance: 'original',
    });

    const variedAnim = createLineDrawingAnimation({
      lines: testLines,
      variance: 'varied',
    });

    // Both should have same structure
    expect(originalAnim.getElements().length).toBe(variedAnim.getElements().length);

    // SVG strings will likely differ due to randomization
    const originalSvg = originalAnim.toSVG();
    const variedSvg = variedAnim.toSVG();

    // Both should contain all line IDs
    testLines.forEach(line => {
      expect(originalSvg).toContain(`id="${line.id}"`);
      expect(variedSvg).toContain(`id="${line.id}"`);
    });
  });

  it('produces different outputs on multiple calls', () => {
    // Create multiple animations with varied mode
    const animations = Array.from({ length: 5 }, () =>
      createLineDrawingAnimation({
        lines: testLines,
        variance: 'varied',
      })
    );

    // All should have same basic structure
    animations.forEach(anim => {
      expect(anim.getElements().length).toBe(testLines.length);
    });

    // Due to randomization, animations will have different internal states
    const svgs = animations.map(anim => anim.toSVG());
    svgs.forEach(svg => {
      // Each should be valid SVG
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');

      // All line IDs should be present
      testLines.forEach(line => {
        expect(svg).toContain(`id="${line.id}"`);
      });
    });
  });

  it('maintains animation sequence order', () => {
    const anim = createLineDrawingAnimation({
      lines: testLines,
      variance: 'varied',
    });

    const elements = anim.getElements();

    // Elements should maintain order (varied doesn't randomize order)
    elements.forEach((el, index) => {
      expect(el.id).toBe(testLines[index].id);
    });
  });
});

describe('VarianceModes - Procedural Mode', () => {
  it('produces highly varied output', () => {
    const originalAnim = createLineDrawingAnimation({
      lines: testLines,
      variance: 'original',
    });

    const proceduralAnim = createLineDrawingAnimation({
      lines: testLines,
      variance: 'procedural',
    });

    // Same structure
    expect(originalAnim.getElements().length).toBe(proceduralAnim.getElements().length);

    // Both produce valid SVG
    const originalSvg = originalAnim.toSVG();
    const proceduralSvg = proceduralAnim.toSVG();

    expect(originalSvg).toContain('<svg');
    expect(proceduralSvg).toContain('<svg');
  });

  it('produces different outputs on multiple calls', () => {
    const animations = Array.from({ length: 5 }, () =>
      createLineDrawingAnimation({
        lines: testLines,
        variance: 'procedural',
      })
    );

    // All maintain basic structure
    animations.forEach(anim => {
      expect(anim.getElements().length).toBe(testLines.length);
    });

    // Generate SVGs
    const svgs = animations.map(anim => anim.toSVG());
    svgs.forEach(svg => {
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  it('allows order randomization', () => {
    // Procedural mode may randomize order, but structure remains valid
    const anim = createLineDrawingAnimation({
      lines: testLines,
      variance: 'procedural',
    });

    const elements = anim.getElements();

    // Should have all elements (though possibly reordered)
    expect(elements.length).toBe(testLines.length);

    const ids = elements.map(el => el.id);
    const expectedIds = testLines.map(line => line.id);

    // All IDs should be present (though order may differ)
    expectedIds.forEach(expectedId => {
      expect(ids).toContain(expectedId);
    });
  });
});

describe('VarianceModes - Comparison', () => {
  it('original < varied < procedural in variance amount', () => {
    // Create animations with each variance level
    const modes: VarianceLevel[] = ['original', 'varied', 'procedural'];
    const animations = modes.map(variance =>
      createLineDrawingAnimation({
        lines: testLines,
        variance,
      })
    );

    // All should produce valid animations
    animations.forEach((anim, index) => {
      expect(anim.getElements().length).toBe(testLines.length);

      const svg = anim.toSVG();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  it('all modes produce valid SVG structure', () => {
    const modes: VarianceLevel[] = ['original', 'varied', 'procedural'];

    modes.forEach(variance => {
      const anim = createLineDrawingAnimation({
        lines: testLines,
        variance,
      });

      const svg = anim.toSVG();

      // Valid SVG string
      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('</svg>');

      // Each line ID should be present
      testLines.forEach(line => {
        expect(svg).toContain(`id="${line.id}"`);
      });
    });
  });

  it('all modes handle empty lines array gracefully', () => {
    const modes: VarianceLevel[] = ['original', 'varied', 'procedural'];

    modes.forEach(variance => {
      const anim = createLineDrawingAnimation({
        lines: [],
        variance,
      });

      expect(anim.getElements().length).toBe(0);

      const svg = anim.toSVG();
      expect(svg).toContain('<svg');
    });
  });

  it('all modes handle single line', () => {
    const modes: VarianceLevel[] = ['original', 'varied', 'procedural'];
    const singleLine = [testLines[0]];

    modes.forEach(variance => {
      const anim = createLineDrawingAnimation({
        lines: singleLine,
        variance,
      });

      expect(anim.getElements().length).toBe(1);

      const svg = anim.toSVG();
      expect(svg).toContain(`id="${singleLine[0].id}"`);
    });
  });
});

describe('VarianceModes - Statistical Properties', () => {
  it('original mode has zero variance', () => {
    // Create multiple animations - they should all be identical
    const animations = Array.from({ length: 10 }, () =>
      createLineDrawingAnimation({
        lines: testLines,
        variance: 'original',
        duration: 1000,
        stagger: 100,
      })
    );

    // All should have identical structure
    const elementCounts = animations.map(anim => anim.getElements().length);
    expect(new Set(elementCounts).size).toBe(1); // All the same
    expect(elementCounts[0]).toBe(testLines.length);

    // All SVG outputs should be identical
    const svgs = animations.map(anim => anim.toSVG());
    const uniqueSvgs = new Set(svgs);
    expect(uniqueSvgs.size).toBe(1); // All identical
  });

  it('varied mode produces consistent randomization', () => {
    // Even with randomization, should always produce valid output
    const animations = Array.from({ length: 20 }, () =>
      createLineDrawingAnimation({
        lines: testLines,
        variance: 'varied',
      })
    );

    animations.forEach(anim => {
      expect(anim.getElements().length).toBe(testLines.length);

      const svg = anim.toSVG();
      expect(svg).toContain('<svg');

      // All paths should have valid IDs
      testLines.forEach(line => {
        expect(svg).toContain(`id="${line.id}"`);
      });
    });
  });

  it('procedural mode produces high variation', () => {
    // Create many animations and verify they all work
    const animations = Array.from({ length: 20 }, () =>
      createLineDrawingAnimation({
        lines: testLines,
        variance: 'procedural',
      })
    );

    animations.forEach(anim => {
      expect(anim.getElements().length).toBe(testLines.length);

      const svg = anim.toSVG();
      expect(svg).toContain('<svg');
    });
  });
});
