/**
 * HtmlAnimatedLine - Port of the original HTML AnimatedLine class
 *
 * This is a direct port of the animation logic from logo-01-line-drawing.html
 * for use in side-by-side comparisons with the React animation system.
 *
 * Key difference from React MorphingLineElement:
 * - Snaps opacity to 1 (no fade)
 * - Single easing function for entire animation
 * - Includes fold phase at the end
 */

export interface HtmlPoint {
  x: number;
  y: number;
  type?: 'L' | 'Q' | 'A';
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  rotation?: number;
  largeArc?: number;
  sweep?: number;
}

export interface HtmlLineConfig {
  startX: number;
  startY: number;
  points: HtmlPoint[];
  color: string;
  delay: number;
  duration: number;
  foldDuration?: number;
}

/**
 * Easing function matching HTML original
 */
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * HtmlAnimatedLine - Renders exactly like the original HTML animation
 */
export class HtmlAnimatedLine {
  private points: HtmlPoint[];
  private startX: number;
  private startY: number;
  private delay: number;
  private duration: number;
  private foldDuration: number;
  protected color: string;  // protected for subclass access

  // State
  private progress: number = 0;
  private foldProgress: number = 0;
  private started: boolean = false;
  private folding: boolean = false;
  private foldComplete: boolean = false;

  // DOM element
  private path: SVGPathElement | null = null;

  constructor(config: HtmlLineConfig) {
    this.points = config.points;
    this.startX = config.startX;
    this.startY = config.startY;
    this.delay = config.delay;
    this.duration = config.duration;
    this.foldDuration = config.foldDuration ?? 180;
    this.color = config.color;
  }

  /**
   * Create and render the SVG path element
   */
  render(container: SVGElement): void {
    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.path.setAttribute('fill', 'none');
    this.path.setAttribute('stroke', this.color);
    this.path.setAttribute('stroke-width', '12');
    this.path.setAttribute('stroke-linecap', 'round');
    this.path.setAttribute('stroke-linejoin', 'round');
    this.path.style.filter = `drop-shadow(0 0 8px ${this.color})`;
    this.path.style.opacity = '0';
    container.appendChild(this.path);
  }

  /**
   * Get first point (for tail animation)
   */
  private getFirstPoint(): HtmlPoint {
    return this.points[0];
  }

  /**
   * Update animation at given elapsed time
   * This is the core method - matches HTML updateEntrance exactly
   * Supports scrubbing to any position (no state guards that block seeking)
   */
  updateEntrance(elapsed: number): void {
    if (!this.path) return;

    // Before delay - stay hidden
    if (elapsed < this.delay) {
      this.path.style.opacity = '0';
      this.path.setAttribute('d', '');
      return;
    }

    // Show immediately (HTML behavior - no fade)
    this.path.style.opacity = '1';

    const localTime = elapsed - this.delay;

    // Phase 1: Line shoots in and curves into shape
    if (localTime < this.duration) {
      this.progress = Math.min(1, localTime / this.duration);
      const eased = easeOutQuart(this.progress);

      const firstPoint = this.getFirstPoint();
      const tailX = this.startX + (firstPoint.x - this.startX) * eased;
      const tailY = this.startY + (firstPoint.y - this.startY) * eased;

      let d = `M ${tailX} ${tailY}`;

      const finalPoint = this.points[this.points.length - 1];

      for (let i = 0; i < this.points.length; i++) {
        const point = this.points[i];
        const t = (i + 1) / this.points.length;

        // Calculate straight line position
        const straightX = this.startX + (finalPoint.x - this.startX) * t;
        const straightY = this.startY + (finalPoint.y - this.startY) * t;

        // Interpolate to curved position
        const currentX = straightX + (point.x - straightX) * eased;
        const currentY = straightY + (point.y - straightY) * eased;

        if (point.type === 'Q') {
          const ctrlT = (i + 0.5) / this.points.length;
          const ctrlStraightX = this.startX + (finalPoint.x - this.startX) * ctrlT;
          const ctrlStraightY = this.startY + (finalPoint.y - this.startY) * ctrlT;
          const ctrlX = ctrlStraightX + ((point.cx ?? point.x) - ctrlStraightX) * eased;
          const ctrlY = ctrlStraightY + ((point.cy ?? point.y) - ctrlStraightY) * eased;
          d += ` Q ${ctrlX} ${ctrlY} ${currentX} ${currentY}`;
        } else if (point.type === 'A') {
          d += ` A ${point.rx} ${point.ry} ${point.rotation ?? 0} ${point.largeArc ?? 0} ${point.sweep ?? 0} ${currentX} ${currentY}`;
        } else {
          d += ` L ${currentX} ${currentY}`;
        }
      }

      this.path.setAttribute('d', d);
    }
    // Phase 2: Animation complete - render final shape
    else {
      // Render final path shape
      let d = `M ${this.points[0].x} ${this.points[0].y}`;

      for (let i = 1; i < this.points.length; i++) {
        const point = this.points[i];
        if (point.type === 'Q') {
          d += ` Q ${point.cx ?? point.x} ${point.cy ?? point.y} ${point.x} ${point.y}`;
        } else if (point.type === 'A') {
          d += ` A ${point.rx} ${point.ry} ${point.rotation ?? 0} ${point.largeArc ?? 0} ${point.sweep ?? 0} ${point.x} ${point.y}`;
        } else {
          d += ` L ${point.x} ${point.y}`;
        }
      }

      this.path.setAttribute('d', d);
    }
  }

  /**
   * Reset animation state
   */
  reset(): void {
    this.progress = 0;
    this.foldProgress = 0;
    this.started = false;
    this.folding = false;
    this.foldComplete = false;
    if (this.path) {
      this.path.style.opacity = '0';
      this.path.setAttribute('d', '');
    }
  }

  /**
   * Check if fold phase is complete
   */
  isFoldComplete(): boolean {
    return this.foldComplete;
  }

  /**
   * Get total duration including fold
   */
  getTotalDuration(): number {
    return this.delay + this.duration + this.foldDuration;
  }
}

/**
 * Create HTML animation lines from LOGO_PATHS data
 */
export function createHtmlAnimationLines(paths: HtmlLineConfig[]): HtmlAnimatedLine[] {
  return paths.map(config => new HtmlAnimatedLine(config));
}
