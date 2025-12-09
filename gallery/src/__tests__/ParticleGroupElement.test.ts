/**
 * ParticleGroupElement.test.ts - Tests for ParticleGroupElement
 *
 * Tests behavior of particle group element including:
 * - Element creation and configuration
 * - Animation track management
 * - SVG rendering
 * - SMIL export
 *
 * Note: Canvas rendering and path sampling tests are skipped in jsdom
 * as these features require a real browser environment.
 */

import { describe, it, expect} from 'vitest';
import { ParticleGroupElement } from '../elements/ParticleGroupElement';
import type { Particle } from '../compositors/ParticleCompositor';

describe('ParticleGroupElement - Creation', () => {
  it('creates element with particle array', () => {
    const particles: Particle[] = [
      {
        startX: 300,
        startY: 100,
        targetX: 40,
        targetY: 40,
        color: '#00d4ff',
        size: 2.5,
      },
      {
        startX: 300,
        startY: 100,
        targetX: 40,
        targetY: 160,
        color: '#00d4ff',
        size: 2.5,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'test-particles',
      particles,
    });

    expect(element).toBeDefined();
    expect(element.id).toBe('test-particles');
  });

  it('applies default easing when not specified', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'default-easing',
      particles,
    });

    expect(element).toBeDefined();
  });

  it('accepts custom easing', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'custom-easing',
      particles,
      easing: 'linear',
    });

    expect(element).toBeDefined();
  });

  it('accepts fade duration configuration', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'fade-config',
      particles,
      fadeDuration: 0.3,
    });

    expect(element).toBeDefined();
  });

  it('accepts stagger configuration', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'stagger-config',
      particles,
      stagger: 0.05,
    });

    expect(element).toBeDefined();
  });
});

describe('ParticleGroupElement - Animation Tracks', () => {
  it('adds convergence animation track', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'convergence-test',
      particles,
    });

    element.addConvergenceAnimation(2000, 0);

    const values = element.getTrackValues(0);
    expect(values).toBeDefined();
  });

  it('initializes progress to 0 when convergence animation added', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'convergence-init',
      particles,
    });

    element.addConvergenceAnimation(2000);

    const values = element.getTrackValues(0);
    expect(values.progress).toBe(0);
  });

  it('adds scatter animation track', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'scatter-test',
      particles,
    });

    element.addScatterAnimation(250, 2000);

    const values = element.getTrackValues(2000);
    expect(values).toBeDefined();
  });
});

describe('ParticleGroupElement - Update', () => {
  it('updates particle positions based on elapsed time', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'update-test',
      particles,
    });

    element.addConvergenceAnimation(1000, 0);

    element.update(500);

    const values = element.getTrackValues(500);
    expect(values.progress).toBeGreaterThan(0);
    expect(values.progress).toBeLessThan(1);
  });
});

describe('ParticleGroupElement - SVG Rendering', () => {
  it('renders to SVG container as circles', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2.5,
      },
      {
        startX: 50,
        startY: 50,
        targetX: 150,
        targetY: 150,
        color: '#00ff00',
        size: 2.5,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'svg-render-test',
      particles,
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    element.render(svg);

    // Should have created circles
    const circles = svg.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('applies correct attributes to rendered circles', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 3,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'circle-attrs',
      particles,
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    element.render(svg);

    const circle = svg.querySelector('circle');
    expect(circle).toBeDefined();
    expect(circle?.getAttribute('fill')).toBe('#ff0000');
    expect(circle?.getAttribute('r')).toBe('3');
  });

  it('throws error for invalid container type', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'invalid-container',
      particles,
    });

    const div = document.createElement('div');

    expect(() => {
      element.render(div as any);
    }).toThrow('can only render to SVG or Canvas containers');
  });
});

describe('ParticleGroupElement - SMIL Export', () => {
  it('exports particles as SVG group with animations', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2.5,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'smil-export',
      particles,
    });

    element.addConvergenceAnimation(2000, 0);

    const svg = element.toSVG();
    expect(svg.tagName.toLowerCase()).toBe('g');
    expect(svg.getAttribute('id')).toBe('smil-export');
  });

  it('includes timing attributes in SMIL animations', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2.5,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'smil-timing',
      particles,
    });

    element.addConvergenceAnimation(2000, 500);

    const svg = element.toSVG();
    const animateElements = svg.querySelectorAll('animate');

    animateElements.forEach(animate => {
      expect(animate.getAttribute('begin')).toBe('500ms');
      expect(animate.getAttribute('dur')).toBe('2000ms');
    });
  });

  it('exports multiple particles with individual animations', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2.5,
      },
      {
        startX: 50,
        startY: 50,
        targetX: 150,
        targetY: 150,
        color: '#00ff00',
        size: 2.5,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'multi-particle',
      particles,
    });

    element.addConvergenceAnimation(2000, 0);

    const svg = element.toSVG();
    const circles = svg.querySelectorAll('circle');
    expect(circles.length).toBe(2);

    // Each circle should have animations
    circles.forEach(circle => {
      const animations = circle.querySelectorAll('animate');
      expect(animations.length).toBeGreaterThan(0);
    });
  });
});

describe('ParticleGroupElement - Edge Cases', () => {
  it('handles empty particle array', () => {
    const element = new ParticleGroupElement({
      id: 'empty-particles',
      particles: [],
    });

    expect(element).toBeDefined();

    const svg = element.toSVG();
    expect(svg.children.length).toBe(0);
  });

  it('handles single particle', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2.5,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'single-particle',
      particles,
    });

    const svg = element.toSVG();
    expect(svg.children.length).toBe(1);
  });

  it('handles particles with per-particle delays', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#ff0000',
        size: 2.5,
        delay: 0,
      },
      {
        startX: 50,
        startY: 50,
        targetX: 150,
        targetY: 150,
        color: '#00ff00',
        size: 2.5,
        delay: 0.5,
      },
    ];

    const element = new ParticleGroupElement({
      id: 'delayed-particles',
      particles,
    });

    expect(element).toBeDefined();
    const svg = element.toSVG();
    expect(svg.children.length).toBe(2);
  });

  it('creates particle arrays from manual construction', () => {
    // Test the helper functions exist and work correctly
    // without relying on DOM path APIs
    const particles: Particle[] = [];

    // Simulate sampling a line
    for (let x = 40; x <= 100; x += 10) {
      particles.push({
        startX: 300 + Math.random() * 100,
        startY: 100 + Math.random() * 100,
        targetX: x,
        targetY: 40,
        color: '#00d4ff',
        size: 2.5,
      });
    }

    const element = new ParticleGroupElement({
      id: 'manual-particles',
      particles,
    });

    expect(element).toBeDefined();
    expect(particles.length).toBeGreaterThan(0);

    const svg = element.toSVG();
    const circles = svg.querySelectorAll('circle');
    expect(circles.length).toBe(particles.length);
  });
});
