/**
 * Animation Helpers - Utility functions that can be used standalone
 *
 * These utilities are extracted from the animation files and can be used
 * independently of the full engine approach. They provide value even if
 * the engines themselves are not adopted.
 */

// ============================================================================
// Random Utilities
// ============================================================================

export const Random = {
  /**
   * Generate a random number between min and max (inclusive)
   */
  range: (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  },

  /**
   * Generate a random integer between min and max (inclusive)
   */
  int: (min: number, max: number): number => {
    return Math.floor(Random.range(min, max + 1));
  },

  /**
   * Pick a random element from an array
   */
  pick: <T>(arr: T[]): T => {
    return arr[Random.int(0, arr.length - 1)];
  },

  /**
   * Vary a base value by adding/subtracting a variance amount
   */
  vary: (base: number, variance: number): number => {
    return base + Random.range(-variance, variance);
  },

  /**
   * Vary a base value by a percentage (0.0 to 1.0)
   * Example: varyPercent(100, 0.2) returns 80-120
   */
  varyPercent: (base: number, percent: number): number => {
    return base * Random.range(1 - percent, 1 + percent);
  },

  /**
   * Generate a random boolean with optional probability
   * @param probability - Chance of returning true (0.0 to 1.0), default 0.5
   */
  boolean: (probability: number = 0.5): boolean => {
    return Math.random() < probability;
  },

  /**
   * Shuffle an array (Fisher-Yates algorithm)
   */
  shuffle: <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Random.int(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
};

// ============================================================================
// Color Utilities
// ============================================================================

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export const ColorUtils = {
  /**
   * Base colors used in loom99 animations
   */
  baseColors: {
    cyan: { h: 190, s: 100, l: 50 },
    purple: { h: 265, s: 85, l: 57 },
    pink: { h: 340, s: 100, l: 63 }
  },

  /**
   * Shift hue of an HSL color
   */
  shiftHue: (hsl: HSLColor, shift: number): HSLColor => ({
    h: (hsl.h + shift + 360) % 360,
    s: hsl.s,
    l: hsl.l
  }),

  /**
   * Shift all components of an HSL color
   */
  shiftColor: (hsl: HSLColor, hueShift: number, satShift: number, lightShift: number): HSLColor => ({
    h: (hsl.h + hueShift + 360) % 360,
    s: Math.max(0, Math.min(100, hsl.s + satShift)),
    l: Math.max(0, Math.min(100, hsl.l + lightShift))
  }),

  /**
   * Convert HSL to CSS string
   */
  toHSL: (hsl: HSLColor): string => {
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  },

  /**
   * Convert HSL to RGB
   */
  toRGB: (hsl: HSLColor): { r: number; g: number; b: number } => {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  },

  /**
   * Parse CSS color to RGB
   */
  parseColor: (color: string): { r: number; g: number; b: number } | null => {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16)
        };
      } else if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16)
        };
      }
    }
    return null;
  }
};

// ============================================================================
// Easing Functions
// ============================================================================

export const Easing = {
  // Ease in (slow start, fast end)
  easeInQuad: (t: number): number => t * t,
  easeInCubic: (t: number): number => t * t * t,
  easeInQuart: (t: number): number => t * t * t * t,
  easeInQuint: (t: number): number => t * t * t * t * t,

  // Ease out (fast start, slow end)
  easeOutQuad: (t: number): number => t * (2 - t),
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t: number): number => 1 - Math.pow(1 - t, 4),
  easeOutQuint: (t: number): number => 1 - Math.pow(1 - t, 5),

  // Ease in-out (slow start and end)
  easeInOutQuad: (t: number): number => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  },
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  },
  easeInOutQuart: (t: number): number => {
    return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
  },

  // Special easings
  linear: (t: number): number => t,

  easeInElastic: (t: number): number => {
    return t === 0 || t === 1 ? t : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3);
  },

  easeOutElastic: (t: number): number => {
    return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },

  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }
};

// ============================================================================
// Animation State Machine Helpers
// ============================================================================

export type AnimationState = 'entrance' | 'hold' | 'exit' | 'waiting';

export class StateMachine {
  private state: AnimationState = 'entrance';
  private listeners: Map<AnimationState | 'any', Set<(from: AnimationState, to: AnimationState) => void>> = new Map();

  constructor(initialState: AnimationState = 'entrance') {
    this.state = initialState;
  }

  getState(): AnimationState {
    return this.state;
  }

  setState(newState: AnimationState): void {
    const oldState = this.state;
    this.state = newState;

    // Call specific state listeners
    this.listeners.get(newState)?.forEach(fn => fn(oldState, newState));

    // Call 'any' listeners
    this.listeners.get('any')?.forEach(fn => fn(oldState, newState));
  }

  onStateChange(state: AnimationState | 'any', callback: (from: AnimationState, to: AnimationState) => void): void {
    if (!this.listeners.has(state)) {
      this.listeners.set(state, new Set());
    }
    this.listeners.get(state)!.add(callback);
  }

  is(state: AnimationState): boolean {
    return this.state === state;
  }
}

// ============================================================================
// Geometry Helpers
// ============================================================================

export const Geometry = {
  /**
   * Calculate distance between two points
   */
  distance: (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  },

  /**
   * Calculate angle between two points (in radians)
   */
  angle: (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  /**
   * Linear interpolation between two values
   */
  lerp: (start: number, end: number, t: number): number => {
    return start + (end - start) * t;
  },

  /**
   * Clamp a value between min and max
   */
  clamp: (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Map a value from one range to another
   */
  map: (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  },

  /**
   * Get point on circle
   */
  pointOnCircle: (centerX: number, centerY: number, radius: number, angle: number): { x: number; y: number } => {
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  }
};

// ============================================================================
// URL Parameter Helpers
// ============================================================================

export const URLParams = {
  /**
   * Get a URL parameter as a string
   */
  getString: (key: string, defaultValue?: string): string | undefined => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || defaultValue;
  },

  /**
   * Get a URL parameter as a number
   */
  getNumber: (key: string, defaultValue?: number): number | undefined => {
    const value = URLParams.getString(key);
    if (value === undefined) return defaultValue;
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  },

  /**
   * Get a URL parameter as a boolean
   */
  getBoolean: (key: string, defaultValue?: boolean): boolean | undefined => {
    const value = URLParams.getString(key);
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
  },

  /**
   * Set URL parameter without page reload
   */
  set: (key: string, value: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url.toString());
  }
};
