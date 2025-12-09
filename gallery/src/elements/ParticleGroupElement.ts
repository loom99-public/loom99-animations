/**
 * ParticleGroupElement - Particle convergence animation element
 * Uses ParticleCompositor to manage many particles forming shapes
 *
 * Reference: animations/logo/logo-02-particles.html
 *
 * Particles start scattered (or off-screen) and converge to form
 * a shape defined by sampling points along an SVG path.
 */

import { BaseElement } from '../core/Element';
import type { ElementConfig } from '../core/Element';
import { Track } from '../core/Track';
import {
  ParticleCompositor,
  type Particle,
  type ParticleState,
} from '../compositors/ParticleCompositor';

export interface ParticleGroupElementConfig extends ElementConfig {
  /** Particles to animate */
  particles: Particle[];

  /** Easing function for particle movement */
  easing?: 'linear' | 'easeOutCubic' | 'easeInCubic';

  /** Duration of fade-in as fraction of total animation (default 0.5) */
  fadeDuration?: number;

  /** Automatic stagger delay between particles (default 0) */
  stagger?: number;

  /** Canvas rendering context for live animation (optional) */
  canvasContext?: CanvasRenderingContext2D;
}

/**
 * ParticleGroupElement - Animated particle system
 *
 * Animation phases:
 * 1. Entrance: Particles converge from start positions to targets
 * 2. Hold: Particles remain at target positions
 * 3. Exit: Particles scatter away (optional)
 */
export class ParticleGroupElement extends BaseElement {
  private compositor: ParticleCompositor;
  private canvasContext?: CanvasRenderingContext2D;
  private currentProgress: number = 0;

  constructor(config: ParticleGroupElementConfig) {
    super(config);

    this.compositor = new ParticleCompositor({
      particles: config.particles,
      easing: config.easing || 'easeOutCubic',
      fadeDuration: config.fadeDuration,
      stagger: config.stagger,
    });

    this.canvasContext = config.canvasContext;
  }

  /**
   * Update element state at given time
   */
  update(elapsed: number): void {
    const values = this.getTrackValues(elapsed);

    // Update particle animation progress
    if (values.progress !== undefined) {
      this.currentProgress = values.progress;
    }

    // If rendering to canvas, draw immediately
    if (this.canvasContext) {
      this.drawToCanvas(this.canvasContext);
    }
  }

  /**
   * Render element to container
   * For Canvas: draws particles directly
   * For SVG: creates circle elements
   */
  render(container: SVGElement | HTMLCanvasElement): void {
    if (container instanceof HTMLCanvasElement) {
      const ctx = container.getContext('2d');
      if (!ctx) {
        throw new Error('Cannot get 2D context from canvas');
      }
      this.canvasContext = ctx;
      this.drawToCanvas(ctx);
    } else if (container instanceof SVGElement) {
      this.renderToSVG(container);
    } else {
      throw new Error('ParticleGroupElement can only render to SVG or Canvas containers');
    }
  }

  /**
   * Draw particles to canvas context
   */
  private drawToCanvas(ctx: CanvasRenderingContext2D): void {
    const particleStates = this.compositor.update(this.currentProgress);

    particleStates.forEach((state: ParticleState) => {
      ctx.globalAlpha = state.opacity;
      ctx.fillStyle = state.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = state.color;
      ctx.beginPath();
      ctx.arc(state.x, state.y, state.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Reset shadow and alpha
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  /**
   * Render particles as SVG circles (for non-canvas rendering)
   */
  private renderToSVG(container: SVGElement): void {
    const particleStates = this.compositor.update(this.currentProgress);

    particleStates.forEach((state: ParticleState) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(state.x));
      circle.setAttribute('cy', String(state.y));
      circle.setAttribute('r', String(state.size));
      circle.setAttribute('fill', state.color);
      circle.style.opacity = String(state.opacity);

      // Add glow filter
      circle.setAttribute('filter', `drop-shadow(0 0 8px ${state.color})`);

      container.appendChild(circle);
    });
  }

  /**
   * Convert to static SVG element with SMIL animations
   */
  toSVG(): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', this.id);

    // Get SMIL representation from compositor
    const smilString = this.compositor.toSVG();

    // Parse and add to group (compositor returns a <g> with animated circles)
    const parser = new DOMParser();
    const doc = parser.parseFromString(smilString, 'image/svg+xml');
    const compositorGroup = doc.documentElement;

    if (compositorGroup.tagName === 'g') {
      // Copy all children (animated circles) to our group
      Array.from(compositorGroup.children).forEach((child) => {
        const imported = document.importNode(child, true);

        // Add timing from track if present
        const progressTrack = this.trackGroup.get<number>('progress');
        if (progressTrack) {
          const delay = progressTrack.getDelay();
          const duration = progressTrack.getDuration();

          // Update all animate elements with timing
          const animateElements = (imported as SVGElement).querySelectorAll('animate');
          animateElements.forEach((animate) => {
            animate.setAttribute('begin', `${delay}ms`);
            animate.setAttribute('dur', `${duration}ms`);
          });
        }

        group.appendChild(imported);
      });
    }

    return group;
  }

  /**
   * Add particle convergence animation
   */
  addConvergenceAnimation(duration: number, delay: number = 0): void {
    // Create track from 0 (scattered) to 1 (converged)
    const track = new Track({
      from: 0,
      to: 1,
      duration,
      delay,
      easing: 'easeOutCubic',
    });

    this.addTrack('progress', track);
    this.currentProgress = 0;
  }

  /**
   * Add particle scatter animation (reverse of convergence)
   */
  addScatterAnimation(duration: number, delay: number = 0): void {
    // Create track from 1 (converged) to 0 (scattered)
    const track = new Track({
      from: 1,
      to: 0,
      duration,
      delay,
      easing: 'easeInCubic',
    });

    this.addTrack('progress', track);
  }

  /**
   * Create particles from SVG path by sampling points
   */
  static createParticlesFromPath(
    path: SVGPathElement,
    color: string,
    spacing: number = 4,
    particleSize: number = 2.5,
    startOffset?: { x: number; y: number }
  ): Particle[] {
    const particles: Particle[] = [];
    const totalLength = path.getTotalLength();

    // Default start offset: scatter from center
    const bbox = path.getBBox();
    const centerX = startOffset?.x ?? bbox.x + bbox.width / 2;
    const centerY = startOffset?.y ?? bbox.y + bbox.height / 2;

    for (let i = 0; i < totalLength; i += spacing) {
      const point = path.getPointAtLength(i);

      // Random scatter position from center
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 400 + 200;

      particles.push({
        startX: centerX + Math.cos(angle) * distance,
        startY: centerY + Math.sin(angle) * distance,
        targetX: point.x,
        targetY: point.y,
        color,
        size: particleSize,
      });
    }

    return particles;
  }

  /**
   * Create particles from multiple SVG paths
   */
  static createParticlesFromPaths(
    paths: Array<{ path: SVGPathElement; color: string }>,
    spacing: number = 4,
    particleSize: number = 2.5,
    startOffset?: { x: number; y: number }
  ): Particle[] {
    const allParticles: Particle[] = [];

    paths.forEach(({ path, color }) => {
      const particles = ParticleGroupElement.createParticlesFromPath(
        path,
        color,
        spacing,
        particleSize,
        startOffset
      );
      allParticles.push(...particles);
    });

    return allParticles;
  }
}
