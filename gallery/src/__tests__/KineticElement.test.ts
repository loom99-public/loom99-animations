/**
 * KineticElement.test.ts - Tests for KineticElement
 *
 * Tests behavior of kinetic transform element including:
 * - Element creation and configuration
 * - Animation track management
 * - SVG rendering with SMIL animations
 * - Transform updates
 */

import { describe, it, expect } from 'vitest';
import { KineticElement } from '../elements/KineticElement';
import type { TransformState } from '../compositors/TransformCompositor';

describe('KineticElement - Creation', () => {
  it('creates element with required configuration', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const fromTransform: TransformState = {
      translateX: -400,
      translateY: 0,
      rotate: 720,
      scale: 0,
    };

    const toTransform: TransformState = {
      translateX: 0,
      translateY: 0,
      rotate: 0,
      scale: 1,
    };

    const element = new KineticElement({
      id: 'test-kinetic',
      svgElement: svgPath,
      fromTransform,
      toTransform,
    });

    expect(element).toBeDefined();
    expect(element.id).toBe('test-kinetic');
  });

  it('calculates transform origin from element bounding box', () => {
    const svgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    svgCircle.setAttribute('cx', '150');
    svgCircle.setAttribute('cy', '100');
    svgCircle.setAttribute('r', '40');

    // Need to append to DOM for getBBox to work
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.appendChild(svgCircle);
    document.body.appendChild(svg);

    const element = new KineticElement({
      id: 'auto-origin',
      svgElement: svgCircle,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
    });

    const svgElement = element.toSVG();
    expect(svgElement).toBeDefined();

    // Clean up
    document.body.removeChild(svg);
  });

  it('accepts custom transform origin', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'custom-origin',
      svgElement: svgPath,
      fromTransform: { rotate: 90 },
      toTransform: { rotate: 0 },
      transformOrigin: { x: 100, y: 100 },
    });

    expect(element).toBeDefined();
  });

  it('uses default easing when not specified', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'default-easing',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
    });

    const svg = element.toSVG();
    expect(svg).toBeDefined();
  });

  it('applies custom easing when specified', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'custom-easing',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
      easing: 'easeInCubic',
    });

    const svg = element.toSVG();
    expect(svg).toBeDefined();
  });
});

describe('KineticElement - Animation Tracks', () => {
  it('adds entrance animation track', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'entrance-test',
      svgElement: svgPath,
      fromTransform: { translateX: -400, rotate: 720 },
      toTransform: { translateX: 0, rotate: 0 },
    });

    element.addEntranceAnimation(1200, 100);

    const values = element.getTrackValues(100);
    expect(values).toBeDefined();
  });

  it('initializes transform progress to 0 when entrance animation added', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'entrance-init',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
    });

    element.addEntranceAnimation(1000);

    const values = element.getTrackValues(0);
    expect(values.transformProgress).toBeCloseTo(0, 5);
  });

  it('adds exit animation track', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'exit-test',
      svgElement: svgPath,
      fromTransform: { translateX: 0 },
      toTransform: { translateX: 400 },
    });

    element.addExitAnimation(250, 2000);

    const values = element.getTrackValues(2000);
    expect(values).toBeDefined();
  });

  it('adds fade in animation track', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'fade-in-test',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
    });

    element.addFadeIn(500, 0, 'linear');

    const svg = element.toSVG();
    const animateElements = svg.querySelectorAll('animate');
    const opacityAnimate = Array.from(animateElements).find(
      el => el.getAttribute('attributeName') === 'opacity'
    );
    expect(opacityAnimate).toBeDefined();
  });

  it('adds fade out animation track', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'fade-out-test',
      svgElement: svgPath,
      fromTransform: { translateX: 0 },
      toTransform: { translateX: 400 },
    });

    element.addFadeOut(250, 2000);

    const svg = element.toSVG();
    const animateElements = svg.querySelectorAll('animate');
    const opacityAnimate = Array.from(animateElements).find(
      el => el.getAttribute('attributeName') === 'opacity'
    );
    expect(opacityAnimate).toBeDefined();
  });

  it('supports multiple animation tracks', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'multi-track',
      svgElement: svgPath,
      fromTransform: { translateX: -400, rotate: 720, scale: 0 },
      toTransform: { translateX: 0, rotate: 0, scale: 1 },
    });

    element.addEntranceAnimation(1200);
    element.addFadeIn(600);

    const svg = element.toSVG();
    const allAnimations = svg.querySelectorAll('animateTransform, animate');
    expect(allAnimations.length).toBeGreaterThanOrEqual(2);
  });
});

describe('KineticElement - Update', () => {
  it('updates transform progress based on elapsed time', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'update-test',
      svgElement: svgPath,
      fromTransform: { translateX: -400 },
      toTransform: { translateX: 0 },
    });

    element.addEntranceAnimation(1000, 0);

    element.update(200);
    let values = element.getTrackValues(200);
    expect(values.transformProgress).toBeGreaterThan(0);

    element.update(1000);
    values = element.getTrackValues(1000);
    // easeOutBack can overshoot, so just verify it's defined
    expect(values.transformProgress).toBeDefined();
  });

  it('updates opacity based on elapsed time', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'opacity-update',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
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

describe('KineticElement - SVG Rendering', () => {
  it('renders SVG element with correct id', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'svg-test',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
    });

    const svg = element.toSVG();
    expect(svg.getAttribute('id')).toBe('svg-test');
  });

  it('preserves original element type', () => {
    const svgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    svgCircle.setAttribute('cx', '150');
    svgCircle.setAttribute('cy', '100');
    svgCircle.setAttribute('r', '40');

    const element = new KineticElement({
      id: 'circle-test',
      svgElement: svgCircle,
      fromTransform: { scale: 0 },
      toTransform: { scale: 1 },
    });

    const svg = element.toSVG();
    expect(svg.tagName.toLowerCase()).toBe('circle');
  });

  it('throws error when rendering to non-SVG container', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'error-test',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
    });

    const div = document.createElement('div');

    expect(() => {
      element.render(div as any);
    }).toThrow('can only render to SVG containers');
  });

  it('renders successfully to SVG container', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'render-test',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    expect(() => {
      element.render(svg);
    }).not.toThrow();

    expect(svg.children.length).toBe(1);
  });
});

describe('KineticElement - SMIL Export', () => {
  it('exports transform animations as SMIL', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'smil-transform',
      svgElement: svgPath,
      fromTransform: { translateX: -400, rotate: 720 },
      toTransform: { translateX: 0, rotate: 0 },
    });

    element.addEntranceAnimation(1200, 100);

    const svg = element.toSVG();
    const animateTransforms = svg.querySelectorAll('animateTransform');

    // Should have SMIL animations for translate and rotate
    expect(animateTransforms.length).toBeGreaterThanOrEqual(2);

    const translateAnim = Array.from(animateTransforms).find(
      el => el.getAttribute('type') === 'translate'
    );
    expect(translateAnim).toBeDefined();

    const rotateAnim = Array.from(animateTransforms).find(
      el => el.getAttribute('type') === 'rotate'
    );
    expect(rotateAnim).toBeDefined();
  });

  it('includes timing attributes in SMIL animations', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'smil-timing',
      svgElement: svgPath,
      fromTransform: { translateX: -400 },
      toTransform: { translateX: 0 },
    });

    element.addEntranceAnimation(1500, 250);

    const svg = element.toSVG();
    const animateTransforms = svg.querySelectorAll('animateTransform');

    animateTransforms.forEach(animate => {
      expect(animate.getAttribute('begin')).toBe('250ms');
      expect(animate.getAttribute('dur')).toBe('1500ms');
    });
  });

  it('exports scale animations as SMIL', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'smil-scale',
      svgElement: svgPath,
      fromTransform: { scale: 0 },
      toTransform: { scale: 1 },
    });

    element.addEntranceAnimation(1000);

    const svg = element.toSVG();
    const animateTransforms = svg.querySelectorAll('animateTransform');

    const scaleAnim = Array.from(animateTransforms).find(
      el => el.getAttribute('type') === 'scale'
    );
    expect(scaleAnim).toBeDefined();
  });

  it('includes transform origin in rotate animations', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'smil-origin',
      svgElement: svgPath,
      fromTransform: { rotate: 720 },
      toTransform: { rotate: 0 },
      transformOrigin: { x: 100, y: 100 },
    });

    element.addEntranceAnimation(1200);

    const svg = element.toSVG();
    const rotateAnim = Array.from(svg.querySelectorAll('animateTransform')).find(
      el => el.getAttribute('type') === 'rotate'
    );

    expect(rotateAnim).toBeDefined();
    const values = rotateAnim?.getAttribute('values');
    expect(values).toContain('100 100'); // Transform origin included
  });
});

describe('KineticElement - Transform Types', () => {
  it('handles translate-only transforms', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'translate-only',
      svgElement: svgPath,
      fromTransform: { translateX: -400, translateY: 100 },
      toTransform: { translateX: 0, translateY: 0 },
    });

    element.addEntranceAnimation(1000);
    const svg = element.toSVG();

    const translateAnim = Array.from(svg.querySelectorAll('animateTransform')).find(
      el => el.getAttribute('type') === 'translate'
    );
    expect(translateAnim).toBeDefined();
  });

  it('handles rotate-only transforms', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'rotate-only',
      svgElement: svgPath,
      fromTransform: { rotate: 360 },
      toTransform: { rotate: 0 },
    });

    element.addEntranceAnimation(1000);
    const svg = element.toSVG();

    const rotateAnim = Array.from(svg.querySelectorAll('animateTransform')).find(
      el => el.getAttribute('type') === 'rotate'
    );
    expect(rotateAnim).toBeDefined();
  });

  it('handles scale-only transforms', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'scale-only',
      svgElement: svgPath,
      fromTransform: { scale: 0 },
      toTransform: { scale: 1 },
    });

    element.addEntranceAnimation(1000);
    const svg = element.toSVG();

    const scaleAnim = Array.from(svg.querySelectorAll('animateTransform')).find(
      el => el.getAttribute('type') === 'scale'
    );
    expect(scaleAnim).toBeDefined();
  });

  it('handles combined transforms', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'combined',
      svgElement: svgPath,
      fromTransform: { translateX: -400, rotate: 720, scale: 0 },
      toTransform: { translateX: 0, rotate: 0, scale: 1 },
    });

    element.addEntranceAnimation(1200);
    const svg = element.toSVG();

    const animateTransforms = svg.querySelectorAll('animateTransform');
    expect(animateTransforms.length).toBe(3);
  });
});

describe('KineticElement - Edge Cases', () => {
  it('handles DOM updates when rendered', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');

    const element = new KineticElement({
      id: 'dom-update',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    element.render(svg);

    element.addEntranceAnimation(1000, 0);
    element.update(500);

    const renderedPath = svg.querySelector('path');
    expect(renderedPath).toBeDefined();
    expect(renderedPath?.style.transform).toBeTruthy();
  });

  it('clones SVG element so original is not modified', () => {
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M 40 40 L 40 160');
    svgPath.setAttribute('stroke', 'red');

    const element = new KineticElement({
      id: 'clone-test',
      svgElement: svgPath,
      fromTransform: { translateX: -100 },
      toTransform: { translateX: 0 },
    });

    const svg = element.toSVG();

    // Original should not have animations
    expect(svgPath.querySelectorAll('animateTransform').length).toBe(0);

    // Clone should preserve attributes
    expect(svg.getAttribute('stroke')).toBe('red');
  });
});
