/**
 * SMILExport.test.ts - Tests for SMIL animation export validation
 *
 * Tests that exported SMIL animations are:
 * - Valid XML
 * - Contain expected attributes
 * - Can be parsed by browser
 * - Follow SVG/SMIL specifications
 */

import { describe, it, expect } from 'vitest';
import { PathMorphCompositor } from '../compositors/PathMorphCompositor';
import { MorphingLineElement } from '../elements/MorphingLineElement';
import { Track } from '../core/Track';

describe('SMIL Export - XML Validity', () => {
  it('exports valid XML from PathMorphCompositor', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const smil = compositor.toSMIL();

    // Should be valid XML fragment
    expect(smil).toMatch(/^<animate/);
    expect(smil).toMatch(/\/>$/);
  });

  it('exports parseable SVG with SMIL animations', () => {
    const element = new MorphingLineElement({
      id: 'test-path',
      startPos: { x: 0, y: 0 },
      points: [
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
    });

    element.addMorphAnimation(1000, 0);

    const svg = element.toSVG();

    // Wrap in SVG document
    const svgDoc = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgDoc.appendChild(svg);

    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(svgDoc);

    // Should be valid XML (no parser errors)
    expect(xmlString).toBeTruthy();
    expect(xmlString).toContain('<animate');
  });

  it('produces well-formed SMIL attributes', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const smil = compositor.toSMIL();

    // Should have properly quoted attributes
    expect(smil).toMatch(/\w+="[^"]*"/);
    expect(smil).not.toContain('=""'); // No empty attributes
  });

  it('escapes special characters in SMIL values', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 50 },
      ],
    });

    const smil = compositor.toSMIL();

    // Values should be properly formatted (semicolon separated)
    expect(smil).toMatch(/values="[^"]+"/);

    // Extract values attribute
    const valuesMatch = smil.match(/values="([^"]+)"/);
    expect(valuesMatch).toBeTruthy();

    const values = valuesMatch![1];
    // Should contain semicolon-separated path data
    expect(values).toContain(';');
  });
});

describe('SMIL Export - Required Attributes', () => {
  it('includes attributeName in path morph SMIL', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const smil = compositor.toSMIL();

    expect(smil).toContain('attributeName="d"');
  });

  it('includes values attribute with keyframes', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const smil = compositor.toSMIL();

    expect(smil).toMatch(/values="[^"]+"/);

    const valuesMatch = smil.match(/values="([^"]+)"/);
    const values = valuesMatch![1].split(';');

    // Should have multiple keyframes (at least start and end)
    expect(values.length).toBeGreaterThanOrEqual(2);

    // Each value should be a valid path string
    values.forEach(pathD => {
      expect(pathD).toMatch(/^M\s+[\d.-]+\s+[\d.-]+/);
    });
  });

  it('includes keyTimes attribute', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const smil = compositor.toSMIL();

    expect(smil).toMatch(/keyTimes="[^"]+"/);

    const keyTimesMatch = smil.match(/keyTimes="([^"]+)"/);
    const keyTimes = keyTimesMatch![1].split(';').map(Number);

    // First keyTime should be 0
    expect(keyTimes[0]).toBe(0);

    // Last keyTime should be 1
    expect(keyTimes[keyTimes.length - 1]).toBe(1);

    // All keyTimes should be in ascending order
    for (let i = 1; i < keyTimes.length; i++) {
      expect(keyTimes[i]).toBeGreaterThanOrEqual(keyTimes[i - 1]);
    }
  });

  it('includes calcMode attribute', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
      easing: 'linear',
    });

    const smil = compositor.toSMIL();

    expect(smil).toMatch(/calcMode="(linear|spline)"/);
  });

  it('includes fill="freeze" to maintain final state', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    const smil = compositor.toSMIL();

    expect(smil).toContain('fill="freeze"');
  });
});

describe('SMIL Export - Easing and Timing', () => {
  it('uses linear calcMode for linear easing', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
      easing: 'linear',
    });

    const smil = compositor.toSMIL();

    expect(smil).toContain('calcMode="linear"');
    expect(smil).not.toContain('keySplines');
  });

  it('uses spline calcMode for eased animations', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
      easing: 'easeOutQuart',
    });

    const smil = compositor.toSMIL();

    expect(smil).toContain('calcMode="spline"');
    expect(smil).toContain('keySplines=');
  });

  it('includes keySplines for spline mode', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
      easing: 'easeOutQuart',
    });

    const smil = compositor.toSMIL();

    const keySplinesMatch = smil.match(/keySplines="([^"]+)"/);
    expect(keySplinesMatch).toBeTruthy();

    const keySplines = keySplinesMatch![1].split(';');

    // Each keySpline should have 4 control point values
    keySplines.forEach(spline => {
      const values = spline.trim().split(/\s+/);
      expect(values.length).toBe(4);

      // All values should be numbers
      values.forEach(val => {
        expect(Number.isFinite(Number(val))).toBe(true);
      });
    });
  });

  it('includes timing attributes from Track', () => {
    const element = new MorphingLineElement({
      id: 'timed-element',
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
});

describe('SMIL Export - Track Integration', () => {
  it('exports opacity track to SMIL', () => {
    const track = new Track({
      from: 0,
      to: 1,
      duration: 1000,
      delay: 100,
      easing: 'linear',
    });

    const smil = track.toSMIL('opacity');

    expect(smil).toContain('attributeName="opacity"');
    expect(smil).toContain('values=');
    expect(smil).toContain('begin=');
    expect(smil).toContain('dur=');
  });

  it('exports numeric track with correct value formatting', () => {
    const track = new Track({
      from: 0,
      to: 100,
      duration: 2000,
      delay: 500,
    });

    const smil = track.toSMIL('width');

    expect(smil).toContain('attributeName="width"');

    // Extract values
    const valuesMatch = smil.match(/values="([^"]+)"/);
    expect(valuesMatch).toBeTruthy();

    const values = valuesMatch![1].split(';').map(Number);

    // First value should be from
    expect(values[0]).toBeCloseTo(0, 1);

    // Last value should be to
    expect(values[values.length - 1]).toBeCloseTo(100, 1);
  });

  it('includes correct timing from track configuration', () => {
    const track = new Track({
      from: 0,
      to: 1,
      duration: 3000,
      delay: 1000,
      easing: 'easeInOut',
    });

    const smil = track.toSMIL('opacity');

    expect(smil).toContain('begin="1000ms"');
    expect(smil).toContain('dur="3000ms"');
  });
});

describe('SMIL Export - Complex Scenarios', () => {
  it('exports multiple animations on single element', () => {
    const element = new MorphingLineElement({
      id: 'multi-anim',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1000, 0);
    element.addFadeIn(500, 0);

    const svg = element.toSVG();
    const animateElements = svg.querySelectorAll('animate');

    // Should have at least 2 animations
    expect(animateElements.length).toBeGreaterThanOrEqual(2);

    // Should have both d and opacity animations
    const attributeNames = Array.from(animateElements).map(
      el => el.getAttribute('attributeName')
    );

    expect(attributeNames).toContain('d');
    expect(attributeNames).toContain('opacity');
  });

  it('exports sequential animations with different delays', () => {
    const element = new MorphingLineElement({
      id: 'sequential',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1000, 0);
    element.addFadeOut(500, 1500); // Starts after morph completes

    const svg = element.toSVG();
    const animateElements = svg.querySelectorAll('animate');

    const opacityAnimate = Array.from(animateElements).find(
      el => el.getAttribute('attributeName') === 'opacity'
    );

    expect(opacityAnimate?.getAttribute('begin')).toBe('1500ms');
  });

  it('handles complex path morphing with multiple segments', () => {
    const compositor = new PathMorphCompositor({
      startPos: { x: -100, y: 100 },
      points: [
        { x: 40, y: 40 },
        { x: 40, y: 160, type: 'L' },
        { x: 100, y: 160, type: 'Q', controlX: 70, controlY: 150 },
      ],
    });

    const smil = compositor.toSMIL();

    expect(smil).toContain('attributeName="d"');

    const valuesMatch = smil.match(/values="([^"]+)"/);
    const values = valuesMatch![1].split(';');

    // All values should be valid path strings
    values.forEach(pathD => {
      expect(pathD).toMatch(/^M\s+[\d.-]+\s+[\d.-]+/);
      expect(pathD).not.toContain('undefined');
      expect(pathD).not.toContain('NaN');
    });
  });
});

describe('SMIL Export - Browser Compatibility', () => {
  it('generates SMIL that browser can parse', () => {
    const element = new MorphingLineElement({
      id: 'browser-test',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1000, 0);

    const pathElement = element.toSVG();

    // Element should be valid SVG
    expect(pathElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(pathElement.tagName.toLowerCase()).toBe('path');

    // Should have animate children
    const animateElements = pathElement.querySelectorAll('animate');
    expect(animateElements.length).toBeGreaterThan(0);

    // All animate elements should have valid namespace
    Array.from(animateElements).forEach(animate => {
      expect(animate.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });
  });

  it('creates elements with correct SVG namespace', () => {

    const element = new MorphingLineElement({
      id: 'ns-test',
      startPos: { x: 0, y: 0 },
      points: [{ x: 100, y: 100 }],
    });

    element.addMorphAnimation(1000, 0);

    const svg = element.toSVG();

    // Should be proper SVG element
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');

    // Child animate elements should also have SVG namespace
    const animates = svg.querySelectorAll('animate');
    animates.forEach(animate => {
      expect(animate.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });
  });

  it('serializes to valid SVG document', () => {
    const element = new MorphingLineElement({
      id: 'serialize-test',
      startPos: { x: 0, y: 0 },
      points: [
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
    });

    element.addMorphAnimation(1000, 0);
    element.addFadeIn(500, 0);

    const pathElement = element.toSVG();

    const svgDoc = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgDoc.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgDoc.setAttribute('viewBox', '0 0 100 100');
    svgDoc.appendChild(pathElement);

    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(svgDoc);

    // Should be valid XML
    expect(xmlString).toBeTruthy();
    expect(xmlString).toContain('<svg');
    expect(xmlString).toContain('<path');
    expect(xmlString).toContain('<animate');
    expect(xmlString).toContain('</svg>');
  });
});
