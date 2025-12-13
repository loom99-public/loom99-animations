/**
 * HtmlVariedAnimation - Port of the varied HTML line drawing animation
 *
 * Supports seeded randomness for deterministic side-by-side comparison.
 * Matches the logic from logo-01-line-drawing-varied.html
 */

import { HtmlAnimatedLine, type HtmlLineConfig } from './HtmlAnimatedLine';
import { LOGO_PATHS, TEXT_PATHS, type LineData } from '../data/pathData';

/**
 * Seeded random number generator (mulberry32)
 */
function createSeededRandom(seed: number) {
  let state = seed;
  return {
    next: (): number => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range: function(min: number, max: number): number {
      return min + this.next() * (max - min);
    },
    int: function(min: number, max: number): number {
      return Math.floor(this.range(min, max + 1));
    },
    pick: function<T>(arr: T[]): T {
      return arr[this.int(0, arr.length - 1)];
    },
    vary: function(base: number, variance: number): number {
      return base + this.range(-variance, variance);
    },
    varyPercent: function(base: number, percent: number): number {
      return base * this.range(1 - percent, 1 + percent);
    },
  };
}

type SeededRandom = ReturnType<typeof createSeededRandom>;

/**
 * Animation modes from the varied HTML
 */
interface AnimationMode {
  name: string;
  startDirection: (random: SeededRandom) => { x: number; y: number };
}

const MODES: AnimationMode[] = [
  {
    name: 'converge',
    startDirection: (r) => ({
      x: r.range(-150, -100),
      y: r.range(50, 150),
    }),
  },
  {
    name: 'cascade',
    startDirection: (r) => ({
      x: r.range(250, 350),
      y: -100,
    }),
  },
  {
    name: 'diagonal',
    startDirection: (r) => ({
      x: r.range(650, 750),
      y: r.range(-50, 50),
    }),
  },
];

/**
 * HSL color type
 */
interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Base colors from the varied HTML
 */
const BASE_COLORS: Record<string, HSL> = {
  cyan: { h: 190, s: 100, l: 50 },
  purple: { h: 265, s: 85, l: 57 },
  pink: { h: 340, s: 100, l: 63 },
};

/**
 * Shift hue of HSL color
 */
function shiftHue(hsl: HSL, shift: number): HSL {
  return {
    h: (hsl.h + shift + 360) % 360,
    s: hsl.s,
    l: hsl.l,
  };
}

/**
 * Convert HSL to CSS string
 */
function toHSLString(hsl: HSL): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

/**
 * Configuration for varied animation
 */
export interface VariedConfig {
  timing: {
    enabled: boolean;
    durationVariance: number;
    staggerVariance: number;
  };
  colors: {
    enabled: boolean;
    hueShift: number;
  };
  motion: {
    enabled: boolean;
    useMode: boolean;
  };
  effects: {
    enabled: boolean;
    strokeVariance: number;
    glowVariance: number;
  };
}

/**
 * Extended HtmlAnimatedLine with varied effects support
 */
export class HtmlVariedLine extends HtmlAnimatedLine {
  private strokeWidth: number;
  private glowRadius: number;

  constructor(config: HtmlLineConfig, strokeWidth: number, glowRadius: number) {
    super(config);
    this.strokeWidth = strokeWidth;
    this.glowRadius = glowRadius;
  }

  /**
   * Override render to apply varied stroke/glow
   */
  render(container: SVGElement): void {
    super.render(container);
    // Access the path through the parent's render
    const path = container.lastChild as SVGPathElement;
    if (path) {
      path.style.strokeWidth = `${this.strokeWidth}`;
      path.style.filter = `drop-shadow(0 0 ${this.glowRadius}px ${(this as any).color})`;
    }
  }
}

/**
 * Generate varied animation configuration from seed
 */
export function generateVariedConfig(seed: number): { config: VariedConfig; mode: AnimationMode; random: SeededRandom } {
  const random = createSeededRandom(seed);

  // Select random mode
  const mode = random.pick(MODES);

  // Generate config with randomized values
  const config: VariedConfig = {
    timing: {
      enabled: true,
      durationVariance: 0.15,
      staggerVariance: 0.2,
    },
    colors: {
      enabled: true,
      hueShift: random.range(-15, 15),
    },
    motion: {
      enabled: true,
      useMode: true,
    },
    effects: {
      enabled: true,
      strokeVariance: 1.5,
      glowVariance: 2,
    },
  };

  return { config, mode, random };
}

/**
 * Create varied HTML animation lines from seed
 */
export function createVariedHtmlLines(seed: number, target: 'logo' | 'text' = 'logo'): HtmlAnimatedLine[] {
  const { config, mode, random } = generateVariedConfig(seed);
  const paths = target === 'logo' ? LOGO_PATHS : TEXT_PATHS;

  // Generate colors with hue shift
  const palette = {
    cyan: toHSLString(shiftHue(BASE_COLORS.cyan, config.colors.hueShift)),
    purple: toHSLString(shiftHue(BASE_COLORS.purple, config.colors.hueShift)),
    pink: toHSLString(shiftHue(BASE_COLORS.pink, config.colors.hueShift)),
  };

  // Map original colors to shifted palette
  const colorMap: Record<string, string> = {
    '#00d4ff': palette.cyan,
    '#7b2ff7': palette.purple,
    '#ff2d75': palette.pink,
  };

  // Generate timing
  const duration = random.varyPercent(400, config.timing.durationVariance);
  const stagger = random.varyPercent(80, config.timing.staggerVariance);

  // Generate start positions based on mode
  const getStart = () => {
    if (!config.motion.enabled || !config.motion.useMode) {
      return { x: -100, y: 100 };
    }
    const base = mode.startDirection(random);
    return {
      x: random.vary(base.x, 20),
      y: random.vary(base.y, 20),
    };
  };

  // Create lines with varied parameters
  const lines: HtmlAnimatedLine[] = [];

  paths.forEach((lineData, index) => {
    const start = getStart();
    const color = colorMap[lineData.color] || lineData.color;
    const strokeWidth = random.vary(12, config.effects.strokeVariance);
    const glowRadius = random.vary(8, config.effects.glowVariance);

    const htmlConfig: HtmlLineConfig = {
      startX: start.x,
      startY: start.y,
      points: lineData.points.map(p => ({
        x: p.x,
        y: p.y,
        type: p.type,
        cx: p.cx,
        cy: p.cy,
        rx: p.rx,
        ry: p.ry,
        rotation: p.rotation,
        largeArc: p.largeArc,
        sweep: p.sweep,
      })),
      color,
      delay: stagger * index,
      duration,
      foldDuration: 180,
    };

    // Use regular HtmlAnimatedLine but we'll apply stroke/glow in render
    const line = new HtmlAnimatedLine(htmlConfig);
    // Store the varied values for later application
    (line as any)._variedStrokeWidth = strokeWidth;
    (line as any)._variedGlowRadius = glowRadius;
    lines.push(line);
  });

  return lines;
}

/**
 * Render varied lines with custom stroke/glow
 */
export function renderVariedHtmlLines(lines: HtmlAnimatedLine[], container: SVGElement): void {
  lines.forEach(line => {
    line.render(container);
    // Apply varied stroke/glow after render
    const path = container.lastChild as SVGPathElement;
    if (path) {
      const strokeWidth = (line as any)._variedStrokeWidth ?? 12;
      const glowRadius = (line as any)._variedGlowRadius ?? 8;
      const color = (line as any).color;
      path.style.strokeWidth = `${strokeWidth}`;
      if (color) {
        path.style.filter = `drop-shadow(0 0 ${glowRadius}px ${color})`;
      }
    }
  });
}

/**
 * Create original (non-varied) HTML animation lines
 */
export function createOriginalHtmlLines(target: 'logo' | 'text' = 'logo'): HtmlAnimatedLine[] {
  const paths = target === 'logo' ? LOGO_PATHS : TEXT_PATHS;
  return paths.map(lineData => {
    const config: HtmlLineConfig = {
      startX: lineData.startX,
      startY: lineData.startY,
      points: lineData.points.map(p => ({
        x: p.x,
        y: p.y,
        type: p.type,
        cx: p.cx,
        cy: p.cy,
        rx: p.rx,
        ry: p.ry,
        rotation: p.rotation,
        largeArc: p.largeArc,
        sweep: p.sweep,
      })),
      color: lineData.color,
      delay: lineData.delay,
      duration: lineData.duration,
      foldDuration: lineData.foldDuration ?? 180,
    };
    return new HtmlAnimatedLine(config);
  });
}
