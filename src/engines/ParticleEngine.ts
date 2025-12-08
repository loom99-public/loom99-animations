/**
 * ParticleEngine - Reusable engine for particle animations
 *
 * Supports three variance modes through configuration:
 * - none: Clean, synchronized particle formation
 * - moderate: Subtle variations in formation and behavior
 * - heavy: Full procedural generation with wild variations
 *
 * FLEXIBILITY CONCERNS:
 * 1. Canvas-specific - won't work for SVG-based needs
 * 2. Requires SVG path data for sampling - tight coupling
 * 3. Particle behaviors are predefined - hard to add new ones
 * 4. Exit animation patterns are limited
 * 5. Performance may degrade with very high particle counts
 */

import type {
  ParticleConfig,
  ParticleFormation,
  ParticleBehavior,
  AnimationState,
  EasingFunction,
  EngineHooks
} from '../types/animation';

export class Particle {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number = 0;
  exitX: number;
  exitY: number;
  phase: number;
  behavior: ParticleBehavior;

  constructor(
    targetX: number,
    targetY: number,
    color: string,
    formation: ParticleFormation,
    behavior: ParticleBehavior,
    sizeRange: [number, number],
    canvasWidth: number,
    canvasHeight: number
  ) {
    const start = this.getStartPosition(formation, canvasWidth, canvasHeight);
    this.startX = start.x;
    this.startY = start.y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.x = this.startX;
    this.y = this.startY;
    this.color = color;
    this.size = this.random(sizeRange[0], sizeRange[1]);
    this.phase = Math.random() * Math.PI * 2;
    this.behavior = behavior;

    // Exit position
    const exitAngle = Math.random() * Math.PI * 2;
    const exitDistance = this.random(200, 400);
    this.exitX = targetX + Math.cos(exitAngle) * exitDistance;
    this.exitY = targetY + Math.sin(exitAngle) * exitDistance;
  }

  private random(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private getStartPosition(
    formation: ParticleFormation,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    switch (formation) {
      case 'center-explosion': {
        const angle = Math.random() * Math.PI * 2;
        const distance = this.random(200, 600);
        return {
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance
        };
      }
      case 'top-rain': {
        return {
          x: this.random(0, canvasWidth),
          y: this.random(-300, -50)
        };
      }
      case 'side-converge': {
        const side = Math.random() < 0.5 ? 'left' : 'right';
        return {
          x: side === 'left' ? this.random(-300, -50) : this.random(canvasWidth + 50, canvasWidth + 300),
          y: this.random(0, canvasHeight)
        };
      }
      case 'random': {
        const patterns = [
          { x: this.random(-200, canvasWidth + 200), y: this.random(-400, -50) },
          { x: this.random(-400, -50), y: this.random(-100, canvasHeight + 100) },
          { x: this.random(canvasWidth + 50, canvasWidth + 400), y: this.random(-100, canvasHeight + 100) }
        ];
        return patterns[Math.floor(Math.random() * patterns.length)];
      }
    }
  }

  updateEntrance(progress: number, easing: EasingFunction): void {
    const eased = easing(progress);
    let x = this.startX + (this.targetX - this.startX) * eased;
    let y = this.startY + (this.targetY - this.startY) * eased;

    // Apply behavior
    switch (this.behavior) {
      case 'spiral': {
        const spiral = (1 - progress) * 50;
        x += Math.cos(progress * Math.PI * 4 + this.phase) * spiral;
        y += Math.sin(progress * Math.PI * 4 + this.phase) * spiral;
        break;
      }
      case 'wave': {
        y += Math.sin(progress * Math.PI * 2 + this.phase) * 30 * (1 - progress);
        break;
      }
      case 'bounce': {
        const bounce = Math.abs(Math.sin(progress * Math.PI * 3)) * 40 * (1 - progress);
        y -= bounce;
        break;
      }
      case 'linear':
      default:
        // No additional behavior
        break;
    }

    this.x = x;
    this.y = y;
    this.opacity = Math.min(1, progress * 2);
  }

  updateExit(progress: number, easing: EasingFunction): void {
    const eased = easing(progress);
    this.x = this.targetX + (this.exitX - this.targetX) * eased;
    this.y = this.targetY + (this.exitY - this.targetY) * eased;
    this.opacity = 1 - eased;
  }

  draw(ctx: CanvasRenderingContext2D, glowRadius: number): void {
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = glowRadius;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  reset(): void {
    this.x = this.startX;
    this.y = this.startY;
    this.opacity = 0;
  }
}

export class ParticleEngine {
  private config: ParticleConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationState: AnimationState = 'entrance';
  private startTime: number | null = null;
  private exitStartTime: number | null = null;
  private holdTimeout: number | null = null;
  private animationFrameId: number | null = null;
  private hooks: EngineHooks;
  private backgroundColor: string = '#1a1a2e';

  // Default easing functions
  private static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private static easeInCubic(t: number): number {
    return t * t * t;
  }

  constructor(
    canvas: HTMLCanvasElement,
    config: ParticleConfig,
    hooks: EngineHooks = {},
    backgroundColor: string = '#1a1a2e'
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.hooks = hooks;
    this.backgroundColor = backgroundColor;

    // Set canvas size
    this.canvas.width = config.canvasWidth;
    this.canvas.height = config.canvasHeight;

    // Initialize particles
    this.initializeParticles();

    // Handle reduced motion
    if (config.prefersReducedMotion) {
      this.showFinalState();
    }
  }

  private initializeParticles(): void {
    this.particles = [];

    // Create temporary SVG to extract path points
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this.config.canvasWidth.toString());
    svg.setAttribute('height', this.config.canvasHeight.toString());
    svg.setAttribute('viewBox', `0 0 ${this.config.canvasWidth} ${this.config.canvasHeight}`);
    svg.style.position = 'absolute';
    svg.style.visibility = 'hidden';
    document.body.appendChild(svg);

    this.config.paths.forEach(pathData => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData.d);
      svg.appendChild(path);

      const points = this.samplePath(path);
      points.forEach(point => {
        const particle = new Particle(
          point.x,
          point.y,
          pathData.color,
          this.config.motion.formation,
          this.config.motion.behavior,
          this.config.appearance.sizeRange || [this.config.appearance.baseSize, this.config.appearance.baseSize],
          this.config.canvasWidth,
          this.config.canvasHeight
        );
        this.particles.push(particle);
      });
    });

    document.body.removeChild(svg);
  }

  private samplePath(path: SVGPathElement): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const totalLength = path.getTotalLength();

    const spacing = this.config.motion.enabled && this.config.motion.spacingVariance
      ? this.varyPercent(this.config.motion.spacing, this.config.motion.spacingVariance)
      : this.config.motion.spacing;

    const countMultiplier = this.config.motion.countMultiplier || 1;
    const numPoints = Math.floor((totalLength / spacing) * countMultiplier);

    for (let i = 0; i < numPoints; i++) {
      const distance = (i / numPoints) * totalLength;
      const point = path.getPointAtLength(distance);
      points.push({ x: point.x, y: point.y });
    }

    return points;
  }

  private varyPercent(base: number, percent: number): number {
    return base * (1 + (Math.random() * 2 - 1) * percent);
  }

  private showFinalState(): void {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(particle => {
      particle.x = particle.targetX;
      particle.y = particle.targetY;
      particle.opacity = 1;
      particle.draw(this.ctx, this.config.appearance.glowRadius);
    });
  }

  private animate = (timestamp: number): void => {
    if (!this.startTime) this.startTime = timestamp;
    const elapsed = timestamp - this.startTime;

    this.hooks.beforeUpdate?.(timestamp);

    // Clear canvas
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.animationState === 'entrance') {
      const progress = Math.min(1, elapsed / this.config.timing.duration);
      const easing = this.config.easingFunction || ParticleEngine.easeOutCubic;

      this.particles.forEach(particle => {
        particle.updateEntrance(progress, easing);
        particle.draw(this.ctx, this.config.appearance.glowRadius);
      });

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(this.animate);
      } else {
        this.animationState = 'hold';
        this.hooks.onStateChange?.('hold');
        this.hooks.onEntranceComplete?.();

        if (this.config.loop) {
          this.holdTimeout = window.setTimeout(() => this.startExit(), this.config.timing.holdDuration);
        }
        this.animationFrameId = requestAnimationFrame(this.animate);
      }
    } else if (this.animationState === 'hold') {
      // Just draw particles in final position
      this.particles.forEach(particle => {
        particle.draw(this.ctx, this.config.appearance.glowRadius);
      });
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else if (this.animationState === 'exit') {
      const exitElapsed = timestamp - this.exitStartTime!;
      const progress = Math.min(1, exitElapsed / this.config.timing.exitDuration);
      const easing = this.config.easingFunction || ParticleEngine.easeInCubic;

      this.particles.forEach(particle => {
        particle.updateExit(progress, easing);
        particle.draw(this.ctx, this.config.appearance.glowRadius);
      });

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
  }

  public restart(): void {
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
    }
    this.startTime = null;
    this.animationState = 'entrance';
    this.particles.forEach(particle => particle.reset());
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
    this.particles = [];
  }
}
