/**
 * MorphingLineElement.test.ts - Tests for MorphingLineElement
 *
 * Tests behavior of path morphing element including:
 * - Element creation and configuration
 * - Animation track management
 * - SVG rendering with SMIL animations
 * - Update behavior
 */

import { describe, it, expect } from 'vitest';
import { MorphingLineElement } from '../elements/MorphingLineElement';

describe('MorphingLineElement - Creation', () => {
  it('creates element with required configuration', () => {
    const element = new MorphingLineElement({
      id: 'test-line',
      startPos: { x: -100, y: 100 },
      points: [
        { x: 40, y: 40 },
        { x: 40, y: 160 },
      ],
    });

    expect(element).toBeDefined();
    expect(element.id).toBe('test-line');
  });

  it('applies default styling when not specified', () => {
    const element = new MorphingLineElement({
      id: 'default-line',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const svg = element.toSVG();

    expect(svg.getAttribute('stroke')).toBe('#000000');
    expect(svg.getAttribute('stroke-width')).toBe('2');
    expect(svg.getAttribute('fill')).toBe('none');
  });

  it('applies custom styling when specified', () => {
    const element = new MorphingLineElement({
      id: 'styled-line',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
      stroke: '#ff0000',
      strokeWidth: 5,
      fill: '#00ff00',
    });

    const svg = element.toSVG();

    expect(svg.getAttribute('stroke')).toBe('#ff0000');
    expect(svg.getAttribute('stroke-width')).toBe('5');
    expect(svg.getAttribute('fill')).toBe('#00ff00');
  });

  it('sets stroke-linecap and stroke-linejoin to round', () => {
    const element = new MorphingLineElement({
      id: 'round-line',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const svg = element.toSVG();

    expect(svg.getAttribute('stroke-linecap')).toBe('round');
    expect(svg.getAttribute('stroke-linejoin')).toBe('round');
  });
});

describe('MorphingLineElement - Animation Tracks', () => {
  it('adds morph animation track', () => {
    const element = new MorphingLineElement({
      id: 'morph-test',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1000, 500, 'easeOutQuart');

    // Track should exist and be retrievable
    const values = element.getTrackValues(500); // At delay start
    expect(values).toBeDefined();
  });

  it('initializes morph progress to 0 when animation added', () => {
    const element = new MorphingLineElement({
      id: 'morph-init',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1000);

    const svg = element.toSVG();
    const pathD = svg.getAttribute('d');

    // At progress 0, path should start at startPos
    expect(pathD).toContain('M 0 0');
  });

  it('adds fade in animation track', () => {
    const element = new MorphingLineElement({
      id: 'fade-in-test',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addFadeIn(500, 0, 'linear');

    const svg = element.toSVG();

    // Should have opacity animation in SVG
    const animateElements = svg.querySelectorAll('animate');
    const opacityAnimate = Array.from(animateElements).find(
      el => el.getAttribute('attributeName') === 'opacity'
    );
    expect(opacityAnimate).toBeDefined();
  });

  it('adds fade out animation track', () => {
    const element = new MorphingLineElement({
      id: 'fade-out-test',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addFadeOut(500, 0, 'linear');

    const svg = element.toSVG();

    const animateElements = svg.querySelectorAll('animate');
    const opacityAnimate = Array.from(animateElements).find(
      el => el.getAttribute('attributeName') === 'opacity'
    );
    expect(opacityAnimate).toBeDefined();
  });

  it('supports multiple animation tracks', () => {
    const element = new MorphingLineElement({
      id: 'multi-track',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1000);
    element.addFadeIn(500);

    const svg = element.toSVG();
    const animateElements = svg.querySelectorAll('animate');

    // Should have at least 2 animations (morph + opacity)
    expect(animateElements.length).toBeGreaterThanOrEqual(2);
  });
});

describe('MorphingLineElement - Update', () => {
  it('updates morph progress based on elapsed time', () => {
    const element = new MorphingLineElement({
      id: 'update-test',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1000, 0);

    // Update at halfway point
    element.update(500);

    const values = element.getTrackValues(500);
    expect(values.morphProgress).toBeGreaterThan(0);
    expect(values.morphProgress).toBeLessThan(1);
  });

  it('updates opacity based on elapsed time', () => {
    const element = new MorphingLineElement({
      id: 'opacity-update',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addFadeIn(1000, 0);

    element.update(0);
    let values = element.getTrackValues(0);
    expect(values.opacity).toBe(0);

    element.update(1000);
    values = element.getTrackValues(1000);
    expect(values.opacity).toBe(1);
  });
});

describe('MorphingLineElement - SVG Rendering', () => {
  it('renders to SVG path element', () => {
    const element = new MorphingLineElement({
      id: 'svg-test',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const svg = element.toSVG();

    expect(svg.tagName.toLowerCase()).toBe('path');
    expect(svg.getAttribute('id')).toBe('svg-test');
  });

  it('includes path data in d attribute', () => {
    const element = new MorphingLineElement({
      id: 'path-data',
      startPos: { x: 0, y: 0 },
      points: [
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
    });

    const svg = element.toSVG();
    const pathD = svg.getAttribute('d');

    expect(pathD).toBeTruthy();
    expect(pathD).toMatch(/^M\s+[\d.-]+\s+[\d.-]+/);
  });

  it('throws error when rendering to non-SVG container', () => {
    const element = new MorphingLineElement({
      id: 'error-test',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const div = document.createElement('div');

    expect(() => {
      element.render(div as any);
    }).toThrow('can only render to SVG containers');
  });

  it('renders successfully to SVG container', () => {
    const element = new MorphingLineElement({
      id: 'render-test',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    expect(() => {
      element.render(svg);
    }).not.toThrow();

    expect(svg.children.length).toBe(1);
    expect(svg.children[0].tagName.toLowerCase()).toBe('path');
  });
});

describe('MorphingLineElement - SMIL Export', () => {
  it('exports morph animation as SMIL', () => {
    const element = new MorphingLineElement({
      id: 'smil-morph',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1000, 500);

    const svg = element.toSVG();
    const animateElements = svg.querySelectorAll('animate');

    // Should have SMIL animation for path morphing
    const pathAnimate = Array.from(animateElements).find(
      el => el.getAttribute('attributeName') === 'd'
    );
    expect(pathAnimate).toBeDefined();
    expect(pathAnimate?.getAttribute('values')).toBeTruthy();
  });

  it('includes timing attributes in SMIL animation', () => {
    const element = new MorphingLineElement({
      id: 'smil-timing',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1500, 250);

    const svg = element.toSVG();
    const animateElements = svg.querySelectorAll('animate');
    const pathAnimate = Array.from(animateElements).find(
      el => el.getAttribute('attributeName') === 'd'
    );

    expect(pathAnimate?.getAttribute('begin')).toBe('250ms');
    expect(pathAnimate?.getAttribute('dur')).toBe('1500ms');
  });

  it('exports opacity animation as SMIL', () => {
    const element = new MorphingLineElement({
      id: 'smil-opacity',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addFadeIn(500, 100);

    const svg = element.toSVG();
    const animateElements = svg.querySelectorAll('animate');

    const opacityAnimate = Array.from(animateElements).find(
      el => el.getAttribute('attributeName') === 'opacity'
    );
    expect(opacityAnimate).toBeDefined();
    expect(opacityAnimate?.getAttribute('begin')).toBeTruthy();
    expect(opacityAnimate?.getAttribute('dur')).toBeTruthy();
  });
});

describe('MorphingLineElement - Complex Paths', () => {
  it('handles quadratic bezier curves', () => {
    const element = new MorphingLineElement({
      id: 'bezier-test',
      startPos: { x: 0, y: 0 },
      points: [
        {
          x: 100,
          y: 100,
          type: 'Q',
          controlX: 50,
          controlY: 0,
        },
      ],
    });

    const svg = element.toSVG();
    const pathD = svg.getAttribute('d');

    expect(pathD).toBeTruthy();
    expect(pathD).toMatch(/M/);
  });

  it('handles arc paths', () => {
    const element = new MorphingLineElement({
      id: 'arc-test',
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
          sweep: true,
        },
      ],
    });

    const svg = element.toSVG();
    const pathD = svg.getAttribute('d');

    expect(pathD).toBeTruthy();
    expect(pathD).toMatch(/M/);
  });

  it('handles multi-segment paths', () => {
    const element = new MorphingLineElement({
      id: 'multi-segment',
      startPos: { x: -100, y: 100 },
      points: [
        { x: 40, y: 40 },
        { x: 40, y: 160 },
        { x: 100, y: 160 },
      ],
    });

    const svg = element.toSVG();
    const pathD = svg.getAttribute('d');

    expect(pathD).toBeTruthy();
    // Should contain multiple line segments
    const lineCommands = pathD?.match(/L/g);
    expect(lineCommands?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('MorphingLineElement - Edge Cases', () => {
  it('handles single point path', () => {
    const element = new MorphingLineElement({
      id: 'single-point',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const svg = element.toSVG();
    const pathD = svg.getAttribute('d');

    expect(pathD).toBeTruthy();
    expect(pathD).toMatch(/^M/);
  });

  it('handles negative coordinates', () => {
    const element = new MorphingLineElement({
      id: 'negative-coords',
      startPos: { x: -50, y: -50 },
      points: [{ x: -100, y: -100 }],
    });

    const svg = element.toSVG();
    const pathD = svg.getAttribute('d');

    expect(pathD).toBeTruthy();
    expect(pathD).toContain('-');
  });

  it('updates DOM element when rendered', () => {
    const element = new MorphingLineElement({
      id: 'dom-update',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    element.render(svg);

    element.addMorphAnimation(1000, 0);
    element.update(500);

    const path = svg.querySelector('path');
    expect(path).toBeDefined();
    expect(path?.getAttribute('d')).toBeTruthy();
  });
});
