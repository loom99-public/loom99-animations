/**
 * Animation.export.test.ts - SVG export tests for Animation
 *
 * Tests SVG/SMIL export functionality:
 * - SVG generation with all elements
 * - Blob export for download
 * - Valid SVG parsing
 */

import { describe, it, expect, afterEach } from 'vitest';
import { Animation } from '../core/Animation';
import { BaseElement } from '../core/Element';
import { Track } from '../core/Track';

/**
 * Mock element for testing
 */
class MockElement extends BaseElement {
  public updateCount = 0;
  public lastElapsed = 0;

  constructor(id: string, duration: number = 1000) {
    super({ id });
    this.addTrack('opacity', new Track({
      from: 0,
      to: 1,
      duration
    }));
  }

  update(elapsed: number): void {
    this.updateCount++;
    this.lastElapsed = elapsed;
  }

  render(_container: SVGElement | HTMLCanvasElement): void {
    // Mock render
  }

  toSVG(): SVGElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', this.id);
    return rect;
  }
}

afterEach(() => {
  // Clean up any animations created (Node.js specific)
  const gc = (globalThis as Record<string, unknown>).gc;
  if (typeof gc === 'function') {
    gc();
  }
});

describe('Animation - SVG Export', () => {
  it('generates SVG with all elements', () => {
    const elements = [
      new MockElement('rect-1', 500),
      new MockElement('rect-2', 500)
    ];
    const animation = new Animation({ elements });

    const svg = animation.toSVG();

    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('id="rect-1"');
    expect(svg).toContain('id="rect-2"');
  });

  it('exports as downloadable blob', () => {
    const element = new MockElement('test-1', 500);
    const animation = new Animation({ elements: [element] });

    const blob = animation.exportSVG();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/svg+xml');
  });

  it('generates valid SVG that can be parsed', () => {
    const element = new MockElement('test-1', 500);
    const animation = new Animation({ elements: [element] });

    const svg = animation.toSVG();

    expect(() => {
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const errors = doc.getElementsByTagName('parsererror');
        expect(errors.length).toBe(0);
      }
    }).not.toThrow();
  });
});
