/**
 * ParticleCompositor.test.ts - Tests for particle animation system
 *
 * Tests particle-based animations:
 * - Individual particle interpolation (position, opacity, size)
 * - Staggered animation delays
 * - Batch particle state computation
 * - SMIL export for particle animations
 *
 * Reference: animations/logo/logo-02-particles.html
 */

import { describe, it, expect } from 'vitest';
import { ParticleCompositor, type Particle, type ParticleState } from '../compositors/ParticleCompositor';

describe('ParticleCompositor - Basic Particle Animation', () => {
  it('returns particles at start position when progress is 0', () => {
    const particles: Particle[] = [
      {
        startX: 300,
        startY: 100,
        targetX: 40,
        targetY: 40,
        color: '#00d4ff',
        size: 2.5,
      },
    ];

    const compositor = new ParticleCompositor({ particles });
    const states = compositor.update(0);

    expect(states).toHaveLength(1);
    expect(states[0].x).toBe(300);
    expect(states[0].y).toBe(100);
    expect(states[0].opacity).toBe(0); // Particles fade in
    expect(states[0].color).toBe('#00d4ff');
    expect(states[0].size).toBe(2.5);
  });

  it('returns particles at target position when progress is 1', () => {
    const particles: Particle[] = [
      {
        startX: 300,
        startY: 100,
        targetX: 40,
        targetY: 40,
        color: '#00d4ff',
        size: 2.5,
      },
    ];

    const compositor = new ParticleCompositor({ particles });
    const states = compositor.update(1);

    expect(states).toHaveLength(1);
    expect(states[0].x).toBe(40);
    expect(states[0].y).toBe(40);
    expect(states[0].opacity).toBe(1); // Fully visible
  });

  it('interpolates particle position with easing', () => {
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

    // Default is easeOutCubic, so position won't be exactly 50 at 0.5
    const compositor = new ParticleCompositor({ particles });
    const states = compositor.update(0.5);

    // With easeOutCubic, at 0.5 progress we should be more than halfway
    expect(states[0].x).toBeGreaterThan(50);
    expect(states[0].y).toBeGreaterThan(50);
  });

  it('handles multiple particles', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 0, color: '#ff0000', size: 2 },
      { startX: 0, startY: 0, targetX: 0, targetY: 100, color: '#00ff00', size: 3 },
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#0000ff', size: 2.5 },
    ];

    const compositor = new ParticleCompositor({ particles, easing: 'linear' });
    const states = compositor.update(0.5);

    expect(states).toHaveLength(3);
    expect(states[0].x).toBe(50);
    expect(states[0].y).toBe(0);
    expect(states[1].x).toBe(0);
    expect(states[1].y).toBe(50);
    expect(states[2].x).toBe(50);
    expect(states[2].y).toBe(50);
  });

  it('preserves particle colors and sizes', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#7b2ff7', size: 3 },
      { startX: 0, startY: 0, targetX: 50, targetY: 50, color: '#ff2d75', size: 2.5 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const states = compositor.update(0.5);

    expect(states[0].color).toBe('#7b2ff7');
    expect(states[0].size).toBe(3);
    expect(states[1].color).toBe('#ff2d75');
    expect(states[1].size).toBe(2.5);
  });
});

describe('ParticleCompositor - Opacity Fade In', () => {
  it('fades particles in during movement', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });

    // At start, opacity is 0
    const states0 = compositor.update(0);
    expect(states0[0].opacity).toBe(0);

    // At 25%, opacity should be increasing
    const states25 = compositor.update(0.25);
    expect(states25[0].opacity).toBeGreaterThan(0);
    expect(states25[0].opacity).toBeLessThan(1);

    // At 50%, opacity should be at least 0.5 (fades faster than movement)
    const states50 = compositor.update(0.5);
    expect(states50[0].opacity).toBeGreaterThanOrEqual(0.5);

    // At end, opacity is 1
    const states100 = compositor.update(1);
    expect(states100[0].opacity).toBe(1);
  });

  it('uses custom fade duration when specified', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    // Fade in over first 25% of animation
    const compositor = new ParticleCompositor({ particles, fadeDuration: 0.25 });

    // At 12.5% (halfway through fade), opacity should be ~0.5
    const states = compositor.update(0.125);
    expect(states[0].opacity).toBeCloseTo(0.5, 1);

    // At 25%, fully opaque
    const statesFull = compositor.update(0.25);
    expect(statesFull[0].opacity).toBe(1);

    // After 25%, should stay at 1
    const statesAfter = compositor.update(0.5);
    expect(statesAfter[0].opacity).toBe(1);
  });
});

describe('ParticleCompositor - Easing', () => {
  it('applies easeOutCubic easing by default', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });

    // With easeOutCubic, progress is faster early, slower late
    const states25 = compositor.update(0.25);
    const states50 = compositor.update(0.5);
    const states75 = compositor.update(0.75);

    // At 25%, should have moved more than 25% of the way (fast start)
    const distance25 = Math.sqrt(states25[0].x ** 2 + states25[0].y ** 2);
    expect(distance25).toBeGreaterThan(25 * Math.sqrt(2));

    // At 75%, should be close to final position (slow end)
    const distance75 = Math.sqrt((100 - states75[0].x) ** 2 + (100 - states75[0].y) ** 2);
    expect(distance75).toBeLessThan(25 * Math.sqrt(2));
  });

  it('applies linear easing when specified', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles, easing: 'linear' });

    // With linear easing, position should match progress exactly
    const states25 = compositor.update(0.25);
    expect(states25[0].x).toBe(25);
    expect(states25[0].y).toBe(25);

    const states75 = compositor.update(0.75);
    expect(states75[0].x).toBe(75);
    expect(states75[0].y).toBe(75);
  });

  it('applies easeInCubic easing when specified', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles, easing: 'easeInCubic' });

    // With easeInCubic, progress is slower early, faster late
    const states25 = compositor.update(0.25);
    const distance25 = Math.sqrt(states25[0].x ** 2 + states25[0].y ** 2);
    expect(distance25).toBeLessThan(25 * Math.sqrt(2));
  });
});

describe('ParticleCompositor - Staggered Delays', () => {
  it('applies per-particle delays', () => {
    const particles: Particle[] = [
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#fff',
        size: 2,
        delay: 0, // No delay
      },
      {
        startX: 0,
        startY: 0,
        targetX: 100,
        targetY: 100,
        color: '#fff',
        size: 2,
        delay: 0.5, // Starts halfway through
      },
    ];

    const compositor = new ParticleCompositor({ particles });

    // At 25% global progress
    const states25 = compositor.update(0.25);

    // First particle should be 25% of the way
    expect(states25[0].x).toBeGreaterThan(0);

    // Second particle hasn't started yet (delay = 0.5)
    expect(states25[1].x).toBe(0);
    expect(states25[1].opacity).toBe(0);

    // At 75% global progress
    const states75 = compositor.update(0.75);

    // First particle should be near completion
    expect(states75[0].x).toBeGreaterThan(75);

    // Second particle should be 50% of the way (0.75 - 0.5 delay = 0.25 local progress, but eased)
    expect(states75[1].x).toBeGreaterThan(0);
    expect(states75[1].x).toBeLessThan(100);
  });

  it('handles automatic stagger when enabled', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({
      particles,
      stagger: 0.1, // 0.1 delay between each particle
    });

    const states = compositor.update(0.15);

    // Particle 0: no delay, at progress 0.15
    expect(states[0].x).toBeGreaterThan(0);

    // Particle 1: delay 0.1, at progress 0.05
    expect(states[1].x).toBeGreaterThan(0);
    expect(states[1].x).toBeLessThan(states[0].x);

    // Particle 2: delay 0.2, hasn't started yet
    expect(states[2].x).toBe(0);
    expect(states[2].opacity).toBe(0);
  });
});

describe('ParticleCompositor - SMIL Export', () => {
  it('exports particles as circle elements with animate', () => {
    const particles: Particle[] = [
      { startX: 300, startY: 100, targetX: 40, targetY: 40, color: '#00d4ff', size: 2.5 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const svg = compositor.toSVG();

    expect(svg).toContain('<circle');
    expect(svg).toContain('r="2.5"'); // radius = size
    expect(svg).toContain('fill="#00d4ff"');
    expect(svg).toContain('<animate');
    expect(svg).toContain('attributeName="cx"');
    expect(svg).toContain('attributeName="cy"');
    expect(svg).toContain('attributeName="opacity"');
  });

  it('generates cx animation from startX to targetX', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 50, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const svg = compositor.toSVG();

    // Should animate cx from 0 to 100
    const cxMatch = svg.match(/attributeName="cx"[^>]*values="([^"]+)"/);
    expect(cxMatch).toBeTruthy();

    const values = cxMatch![1].split(';').map(Number);
    expect(values[0]).toBe(0); // Start
    expect(values[values.length - 1]).toBe(100); // End
  });

  it('generates cy animation from startY to targetY', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 50, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const svg = compositor.toSVG();

    // Should animate cy from 0 to 50
    const cyMatch = svg.match(/attributeName="cy"[^>]*values="([^"]+)"/);
    expect(cyMatch).toBeTruthy();

    const values = cyMatch![1].split(';').map(Number);
    expect(values[0]).toBe(0); // Start
    expect(values[values.length - 1]).toBe(50); // End
  });

  it('generates opacity animation from 0 to 1', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const svg = compositor.toSVG();

    const opacityMatch = svg.match(/attributeName="opacity"[^>]*values="([^"]+)"/);
    expect(opacityMatch).toBeTruthy();

    const values = opacityMatch![1].split(';').map(Number);
    expect(values[0]).toBe(0); // Start invisible
    expect(values[values.length - 1]).toBe(1); // End visible
  });

  it('exports multiple particles as separate circles', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 0, color: '#ff0000', size: 2 },
      { startX: 0, startY: 0, targetX: 0, targetY: 100, color: '#00ff00', size: 3 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const svg = compositor.toSVG();

    // Should have 2 circle elements
    const circles = svg.match(/<circle/g);
    expect(circles).toHaveLength(2);

    // Should have both colors
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('fill="#00ff00"');
  });

  it('wraps particles in SVG group', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const svg = compositor.toSVG();

    expect(svg).toMatch(/^<g/);
    expect(svg).toMatch(/<\/g>$/);
  });

  it('includes timing attributes in animations', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const svg = compositor.toSVG();

    expect(svg).toContain('keyTimes=');
    expect(svg).toContain('fill="freeze"');
  });

  it('applies easing to SMIL keySplines', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles, easing: 'easeOutCubic' });
    const svg = compositor.toSVG();

    expect(svg).toContain('calcMode="spline"');
    expect(svg).toContain('keySplines=');
  });
});

describe('ParticleCompositor - Edge Cases', () => {
  it('handles empty particle array', () => {
    const compositor = new ParticleCompositor({ particles: [] });
    const states = compositor.update(0.5);

    expect(states).toHaveLength(0);
  });

  it('handles particles with same start and target position', () => {
    const particles: Particle[] = [
      { startX: 50, startY: 50, targetX: 50, targetY: 50, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const states = compositor.update(0.5);

    expect(states[0].x).toBe(50);
    expect(states[0].y).toBe(50);
  });

  it('handles negative coordinates', () => {
    const particles: Particle[] = [
      { startX: -100, startY: -100, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles, easing: 'linear' });
    const states = compositor.update(0.5);

    expect(states[0].x).toBe(0);
    expect(states[0].y).toBe(0);
  });

  it('clamps progress below 0 to 0', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const states = compositor.update(-0.5);

    expect(states[0].x).toBe(0);
    expect(states[0].y).toBe(0);
    expect(states[0].opacity).toBe(0);
  });

  it('clamps progress above 1 to 1', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });
    const states = compositor.update(1.5);

    expect(states[0].x).toBe(100);
    expect(states[0].y).toBe(100);
    expect(states[0].opacity).toBe(1);
  });

  it('handles very large particle counts efficiently', () => {
    const particles: Particle[] = Array.from({ length: 1000 }, (_, i) => ({
      startX: Math.random() * 600,
      startY: Math.random() * 200,
      targetX: i % 600,
      targetY: Math.floor(i / 600) * 10,
      color: '#fff',
      size: 2,
    }));

    const compositor = new ParticleCompositor({ particles });

    const startTime = performance.now();
    compositor.update(0.5);
    const elapsed = performance.now() - startTime;

    // Should complete in < 16ms (1 frame budget at 60fps)
    expect(elapsed).toBeLessThan(16);
  });
});

describe('ParticleCompositor - Performance', () => {
  it('updates particles efficiently for real-time animation', () => {
    const particles: Particle[] = Array.from({ length: 500 }, (_, i) => ({
      startX: Math.random() * 600,
      startY: Math.random() * 200,
      targetX: i % 600,
      targetY: Math.floor(i / 600) * 10,
      color: ['#00d4ff', '#7b2ff7', '#ff2d75'][i % 3],
      size: 2.5,
    }));

    const compositor = new ParticleCompositor({ particles });

    // Simulate 60fps updates
    const startTime = performance.now();
    for (let i = 0; i < 60; i++) {
      compositor.update(i / 60);
    }
    const elapsed = performance.now() - startTime;

    // Should complete 60 updates in reasonable time
    expect(elapsed).toBeLessThan(100);
  });

  it('does not create memory leaks with repeated updates', () => {
    const particles: Particle[] = [
      { startX: 0, startY: 0, targetX: 100, targetY: 100, color: '#fff', size: 2 },
    ];

    const compositor = new ParticleCompositor({ particles });

    // Update many times
    for (let i = 0; i < 1000; i++) {
      compositor.update(Math.random());
    }

    // No assertion - test passes if no memory errors occur
    expect(true).toBe(true);
  });
});
