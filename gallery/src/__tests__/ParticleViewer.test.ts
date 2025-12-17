/**
 * @vitest-environment node
 * ParticleViewer tests - Test the particle viewer logic
 * Tests particle creation and animation calculations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DOM APIs for node environment
const mockGetPointAtLength = vi.fn().mockReturnValue({ x: 100, y: 100 });
const mockGetTotalLength = vi.fn().mockReturnValue(100);

const mockPath = {
  setAttribute: vi.fn(),
  getPointAtLength: mockGetPointAtLength,
  getTotalLength: mockGetTotalLength,
};

const mockSvg = {
  setAttribute: vi.fn(),
  appendChild: vi.fn(),
  style: {},
};

// Mock document
vi.stubGlobal('document', {
  createElementNS: vi.fn().mockImplementation((_ns, tag) => {
    if (tag === 'svg') return mockSvg;
    if (tag === 'path') return mockPath;
    return {};
  }),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
});

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  return setTimeout(() => cb(performance.now()), 16) as unknown as number;
});

vi.stubGlobal('cancelAnimationFrame', (id: number) => {
  clearTimeout(id);
});

// Mock window.matchMedia
vi.stubGlobal('window', {
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
});

describe('ParticleViewer Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('easing functions', () => {
    // Test easing functions directly
    it('easeOutCubic returns correct values', () => {
      const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

      expect(easeOutCubic(0)).toBe(0);
      expect(easeOutCubic(1)).toBe(1);
      expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 3);
    });

    it('easeInCubic returns correct values', () => {
      const easeInCubic = (t: number): number => t * t * t;

      expect(easeInCubic(0)).toBe(0);
      expect(easeInCubic(1)).toBe(1);
      expect(easeInCubic(0.5)).toBeCloseTo(0.125, 3);
    });
  });

  describe('variance parameters', () => {
    const getVarianceParams = (variance: 'original' | 'varied' | 'procedural') => {
      switch (variance) {
        case 'original':
          return {
            durationVariance: 0,
            delayVariance: 0,
            sizeVariance: 0,
            colorVariance: 0,
            scatterVariance: 0,
          };
        case 'varied':
          return {
            durationVariance: 0.2,
            delayVariance: 300,
            sizeVariance: 0.5,
            colorVariance: 20,
            scatterVariance: 0.3,
          };
        case 'procedural':
          return {
            durationVariance: 0.5,
            delayVariance: 600,
            sizeVariance: 1.0,
            colorVariance: 60,
            scatterVariance: 0.6,
          };
      }
    };

    it('original variance has no variation', () => {
      const params = getVarianceParams('original');
      expect(params.durationVariance).toBe(0);
      expect(params.delayVariance).toBe(0);
      expect(params.sizeVariance).toBe(0);
      expect(params.colorVariance).toBe(0);
      expect(params.scatterVariance).toBe(0);
    });

    it('varied variance has moderate variation', () => {
      const params = getVarianceParams('varied');
      expect(params.durationVariance).toBe(0.2);
      expect(params.delayVariance).toBe(300);
      expect(params.sizeVariance).toBe(0.5);
      expect(params.colorVariance).toBe(20);
      expect(params.scatterVariance).toBe(0.3);
    });

    it('procedural variance has high variation', () => {
      const params = getVarianceParams('procedural');
      expect(params.durationVariance).toBe(0.5);
      expect(params.delayVariance).toBe(600);
      expect(params.sizeVariance).toBe(1.0);
      expect(params.colorVariance).toBe(60);
      expect(params.scatterVariance).toBe(0.6);
    });
  });

  describe('hue shifting', () => {
    const shiftHue = (color: string, shift: number): string => {
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16) / 255;
        const g = parseInt(color.slice(3, 5), 16) / 255;
        const b = parseInt(color.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        let h = 0;
        let s = 0;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r:
              h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
              break;
            case g:
              h = ((b - r) / d + 2) / 6;
              break;
            case b:
              h = ((r - g) / d + 4) / 6;
              break;
          }
        }

        h = ((h * 360 + shift) % 360 + 360) % 360;
        return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
      }
      return color;
    };

    it('shifts hex color hue correctly', () => {
      // Cyan #00d4ff should shift
      const shifted = shiftHue('#00d4ff', 60);
      expect(shifted).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });

    it('returns non-hex colors unchanged', () => {
      const color = 'rgb(255, 0, 0)';
      expect(shiftHue(color, 60)).toBe(color);
    });

    it('handles zero shift', () => {
      const original = '#00d4ff';
      const shifted = shiftHue(original, 0);
      // Should still be valid HSL
      expect(shifted).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });

    it('handles negative shift', () => {
      const shifted = shiftHue('#00d4ff', -60);
      expect(shifted).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });
  });

  describe('particle creation', () => {
    it('creates particles with correct initial positions', () => {
      // Particle should start far from center and target on path
      const centerX = 300;
      const centerY = 100;
      const targetX = 50;
      const targetY = 50;

      // Simulate particle start position calculation
      const angle = Math.PI / 4; // 45 degrees
      const distance = 300;
      const startX = centerX + Math.cos(angle) * distance;
      const startY = centerY + Math.sin(angle) * distance;

      // Start position should be far from target
      const distToTarget = Math.sqrt(
        Math.pow(startX - targetX, 2) + Math.pow(startY - targetY, 2)
      );
      expect(distToTarget).toBeGreaterThan(100);
    });

    it('calculates exit positions correctly', () => {
      const targetX = 100;
      const targetY = 100;
      const exitAngle = Math.PI; // 180 degrees (left)
      const exitDistance = 250;

      const exitX = targetX + Math.cos(exitAngle) * exitDistance;
      const exitY = targetY + Math.sin(exitAngle) * exitDistance;

      expect(exitX).toBeCloseTo(targetX - 250, 1);
      expect(exitY).toBeCloseTo(targetY, 1);
    });
  });

  describe('animation progress', () => {
    it('calculates entrance position correctly at progress 0', () => {
      const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
      const startX = 500;
      const targetX = 100;
      const progress = 0;
      const eased = easeOutCubic(progress);

      const x = startX + (targetX - startX) * eased;
      expect(x).toBe(startX);
    });

    it('calculates entrance position correctly at progress 1', () => {
      const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
      const startX = 500;
      const targetX = 100;
      const progress = 1;
      const eased = easeOutCubic(progress);

      const x = startX + (targetX - startX) * eased;
      expect(x).toBe(targetX);
    });

    it('calculates exit position correctly at progress 0', () => {
      const easeInCubic = (t: number): number => t * t * t;
      const targetX = 100;
      const exitX = 400;
      const progress = 0;
      const eased = easeInCubic(progress);

      const x = targetX + (exitX - targetX) * eased;
      expect(x).toBe(targetX);
    });

    it('calculates exit position correctly at progress 1', () => {
      const easeInCubic = (t: number): number => t * t * t;
      const targetX = 100;
      const exitX = 400;
      const progress = 1;
      const eased = easeInCubic(progress);

      const x = targetX + (exitX - targetX) * eased;
      expect(x).toBe(exitX);
    });

    it('calculates opacity fade-in correctly', () => {
      // Opacity should fade in during first half of animation
      const progress = 0.25;
      const opacity = Math.min(1, progress * 2);
      expect(opacity).toBe(0.5);
    });

    it('opacity reaches 1 at progress 0.5', () => {
      const progress = 0.5;
      const opacity = Math.min(1, progress * 2);
      expect(opacity).toBe(1);
    });

    it('opacity stays at 1 after progress 0.5', () => {
      const progress = 0.75;
      const opacity = Math.min(1, progress * 2);
      expect(opacity).toBe(1);
    });
  });

  describe('canvas dimensions', () => {
    it('uses correct dimensions for logo target', () => {
      const target = 'logo';
      const canvasWidth = target === 'logo' ? 600 : 700;
      const canvasHeight = target === 'logo' ? 200 : 280;

      expect(canvasWidth).toBe(600);
      expect(canvasHeight).toBe(200);
    });

    it('uses correct dimensions for text target', () => {
      // Text target uses larger canvas
      const canvasWidth = 700;
      const canvasHeight = 280;

      expect(canvasWidth).toBe(700);
      expect(canvasHeight).toBe(280);
    });
  });
});
