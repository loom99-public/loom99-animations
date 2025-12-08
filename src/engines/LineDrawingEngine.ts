/**
 * LineDrawingEngine - Reusable engine for line drawing animations
 *
 * Supports three variance modes through configuration:
 * - none: Clean, synchronized animation
 * - moderate: Subtle variations in timing and appearance
 * - heavy: Full procedural generation with wild variations
 *
 * FLEXIBILITY CONCERNS:
 * 1. Exit animation is tightly coupled to entrance geometry
 * 2. State machine might not fit all animation patterns
 * 3. SVG-specific - won't work for Canvas-based needs
 * 4. Path interpolation logic is hardcoded
 */

import type {
  LineDrawingConfig,
  LinePoint,
  LineDefinition,
  AnimationState,
  EasingFunction,
  EngineHooks
} from '../types/animation';

export class AnimatedLine {
  points: LinePoint[];
  startX: number;
  startY: number;
  delay: number;
  duration: number;
  foldDuration: number;
  color: string;
  progress: number = 0;
  foldProgress: number = 0;
  started: boolean = false;
  finished: boolean = false;
  folding: boolean = false;
  foldComplete: boolean = false;
  exitX: number;
  exitY: number;
  path: SVGPathElement;

  constructor(
    config: LineDefinition,
    strokeWidth: number,
    glowRadius: number,
    svg: SVGSVGElement
  ) {
    this.points = config.points;
    this.startX = config.startX;
    this.startY = config.startY;
    this.delay = config.delay;
    this.duration = config.duration || 400;
    this.foldDuration = config.foldDuration || 200;
    this.color = config.color;

    // Exit properties
    this.exitX = config.exitX || config.startX;
    this.exitY = config.exitY || config.startY;

    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.path.classList.add('line');
    this.path.style.stroke = config.color;
    this.path.style.strokeWidth = Math.max(2, strokeWidth).toString();
    this.path.style.filter = `drop-shadow(0 0 ${Math.max(0, glowRadius)}px ${config.color})`;
    this.path.style.opacity = '0';
    this.path.style.fill = 'none';
    this.path.style.strokeLinecap = 'round';
    this.path.style.strokeLinejoin = 'round';

    svg.appendChild(this.path);
  }

  getFirstPoint(): LinePoint {
    return this.points[0];
  }

  updateEntrance(elapsed: number, easing: EasingFunction): void {
    if (this.foldComplete) return;

    if (elapsed < this.delay) {
      this.path.style.opacity = '0';
      return;
    }

    this.path.style.opacity = '1';

    if (!this.started) {
      this.started = true;
    }

    const localTime = elapsed - this.delay;

    // Phase 1: Line shoots in and curves into shape
    if (localTime < this.duration) {
      this.progress = Math.min(1, localTime / this.duration);
      const eased = easing(this.progress);

      const firstPoint = this.getFirstPoint();
      const tailX = this.startX + (firstPoint.x - this.startX) * eased;
      const tailY = this.startY + (firstPoint.y - this.startY) * eased;

      let d = `M ${tailX} ${tailY}`;

      for (let i = 0; i < this.points.length; i++) {
        const point = this.points[i];
        const finalPoint = this.points[this.points.length - 1];
        const t = (i + 1) / this.points.length;

        const straightX = this.startX + (finalPoint.x - this.startX) * t;
        const straightY = this.startY + (finalPoint.y - this.startY) * t;

        const currentX = straightX + (point.x - straightX) * eased;
        const currentY = straightY + (point.y - straightY) * eased;

        if (point.type === 'Q') {
          const ctrlStraightX = this.startX + (finalPoint.x - this.startX) * ((i + 0.5) / this.points.length);
          const ctrlStraightY = this.startY + (finalPoint.y - this.startY) * ((i + 0.5) / this.points.length);
          const ctrlX = ctrlStraightX + (point.cx! - ctrlStraightX) * eased;
          const ctrlY = ctrlStraightY + (point.cy! - ctrlStraightY) * eased;
          d += ` Q ${ctrlX} ${ctrlY} ${currentX} ${currentY}`;
        } else if (point.type === 'A') {
          d += ` A ${point.rx} ${point.ry} ${point.rotation} ${point.largeArc} ${point.sweep} ${currentX} ${currentY}`;
        } else {
          d += ` L ${currentX} ${currentY}`;
        }
      }

      this.path.setAttribute('d', d);
    }
    // Phase 2: Tail folds in
    else {
      if (!this.folding) {
        this.folding = true;
        this.finished = true;
      }

      const foldTime = localTime - this.duration;
      this.foldProgress = Math.min(1, foldTime / this.foldDuration);

      let d = `M ${this.points[0].x} ${this.points[0].y}`;

      for (let i = 1; i < this.points.length; i++) {
        const point = this.points[i];
        if (point.type === 'Q') {
          d += ` Q ${point.cx} ${point.cy} ${point.x} ${point.y}`;
        } else if (point.type === 'A') {
          d += ` A ${point.rx} ${point.ry} ${point.rotation} ${point.largeArc} ${point.sweep} ${point.x} ${point.y}`;
        } else {
          d += ` L ${point.x} ${point.y}`;
        }
      }

      this.path.setAttribute('d', d);

      if (this.foldProgress >= 1) {
        this.foldComplete = true;
      }
    }
  }

  updateExit(exitElapsed: number, exitDuration: number, easing: EasingFunction): void {
    const progress = Math.min(1, exitElapsed / exitDuration);
    const eased = easing(progress);

    // Shoot out to edges
    const lastPoint = this.points[this.points.length - 1];
    const headX = lastPoint.x + (this.exitX - lastPoint.x) * eased;
    const headY = lastPoint.y + (this.exitY - lastPoint.y) * eased;

    let d = `M ${this.points[0].x} ${this.points[0].y}`;

    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      if (point.type === 'Q') {
        d += ` Q ${point.cx} ${point.cy} ${point.x} ${point.y}`;
      } else if (point.type === 'A') {
        d += ` A ${point.rx} ${point.ry} ${point.rotation} ${point.largeArc} ${point.sweep} ${point.x} ${point.y}`;
      } else {
        d += ` L ${point.x} ${point.y}`;
      }
    }

    d += ` L ${headX} ${headY}`;

    this.path.setAttribute('d', d);
    this.path.style.opacity = (1 - eased).toString();
  }

  reset(): void {
    this.progress = 0;
    this.foldProgress = 0;
    this.started = false;
    this.finished = false;
    this.folding = false;
    this.foldComplete = false;
    this.path.style.opacity = '0';
    this.path.style.transform = '';
  }

  destroy(): void {
    this.path.remove();
  }
}

export class LineDrawingEngine {
  private config: LineDrawingConfig;
  private svg: SVGSVGElement;
  private lines: AnimatedLine[] = [];
  private animationState: AnimationState = 'entrance';
  private startTime: number | null = null;
  private exitStartTime: number | null = null;
  private holdTimeout: number | null = null;
  private animationFrameId: number | null = null;
  private hooks: EngineHooks;

  // Default easing functions
  private static easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  private static easeInCubic(t: number): number {
    return t * t * t;
  }

  constructor(svg: SVGSVGElement, config: LineDrawingConfig, hooks: EngineHooks = {}) {
    this.svg = svg;
    this.config = config;
    this.hooks = hooks;

    // Set viewBox
    this.svg.setAttribute('viewBox', `0 0 ${config.viewBox.width} ${config.viewBox.height}`);

    // Initialize lines
    this.initializeLines();

    // Handle reduced motion
    if (config.prefersReducedMotion) {
      this.showFinalState();
    }
  }

  private initializeLines(): void {
    // Clear existing lines
    this.lines.forEach(line => line.destroy());
    this.lines = [];

    // Create new lines
    this.config.lines.forEach(lineConfig => {
      const strokeWidth = this.config.effects.enabled && this.config.effects.strokeVariance
        ? this.vary(this.config.effects.strokeWidth, this.config.effects.strokeVariance)
        : this.config.effects.strokeWidth;

      const glowRadius = this.config.effects.enabled && this.config.effects.glowVariance
        ? this.vary(this.config.effects.glowRadius, this.config.effects.glowVariance)
        : this.config.effects.glowRadius;

      const line = new AnimatedLine(lineConfig, strokeWidth, glowRadius, this.svg);
      this.lines.push(line);
    });
  }

  private vary(base: number, variance: number): number {
    return base + (Math.random() * 2 - 1) * variance;
  }

  private showFinalState(): void {
    this.lines.forEach(line => {
      line.foldComplete = true;
      line.path.style.opacity = '1';
      let d = `M ${line.points[0].x} ${line.points[0].y}`;
      for (let i = 1; i < line.points.length; i++) {
        const point = line.points[i];
        if (point.type === 'Q') {
          d += ` Q ${point.cx} ${point.cy} ${point.x} ${point.y}`;
        } else if (point.type === 'A') {
          d += ` A ${point.rx} ${point.ry} ${point.rotation} ${point.largeArc} ${point.sweep} ${point.x} ${point.y}`;
        } else {
          d += ` L ${point.x} ${point.y}`;
        }
      }
      line.path.setAttribute('d', d);
    });
  }

  private animate = (timestamp: number): void => {
    if (!this.startTime) this.startTime = timestamp;
    const elapsed = timestamp - this.startTime;

    this.hooks.beforeUpdate?.(timestamp);

    if (this.animationState === 'entrance') {
      const easing = this.config.easingFunction || LineDrawingEngine.easeOutQuart;
      this.lines.forEach(line => line.updateEntrance(elapsed, easing));

      const allDone = this.lines.every(l => l.foldComplete);
      if (!allDone) {
        this.animationFrameId = requestAnimationFrame(this.animate);
      } else {
        this.animationState = 'hold';
        this.hooks.onStateChange?.('hold');
        this.hooks.onEntranceComplete?.();

        if (this.config.loop) {
          this.holdTimeout = window.setTimeout(() => this.startExit(), this.config.timing.holdDuration);
        }
      }
    } else if (this.animationState === 'exit') {
      const exitElapsed = timestamp - this.exitStartTime!;
      const easing = this.config.easingFunction || LineDrawingEngine.easeInCubic;
      this.lines.forEach(line => line.updateExit(exitElapsed, this.config.timing.exitDuration, easing));

      if (exitElapsed < this.config.timing.exitDuration) {
        this.animationFrameId = requestAnimationFrame(this.animate);
      } else {
        this.hooks.onExitComplete?.();
        if (this.config.loop) {
          this.restart();
        } else {
          this.animationState = 'waiting';
          this.hooks.onStateChange?.('waiting');
        }
      }
    }

    this.hooks.afterUpdate?.(timestamp);
  };

  public start(): void {
    if (this.config.prefersReducedMotion) return;
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  public startExit(): void {
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
    }
    this.animationState = 'exit';
    this.exitStartTime = performance.now();
    this.hooks.onStateChange?.('exit');
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  public restart(): void {
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
    }
    this.startTime = null;
    this.animationState = 'entrance';
    this.lines.forEach(line => line.reset());
    this.hooks.onStateChange?.('entrance');
    this.hooks.onRestart?.();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  public getState(): AnimationState {
    return this.animationState;
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout);
    }
    this.lines.forEach(line => line.destroy());
    this.lines = [];
  }
}
